/**
 * Modul Terpisah: Tabel Penawar Lelang & Frekuensi Penawaran
 * Menjaga konsistensi frekuensi (1x, 2x, 3x, 4x...), panel Penawar Aktif,
 * modal Detail, serta distribusi harga penawaran tercepat ke seluruh pengguna.
 */
(function () {
  "use strict";

  const STORAGE_KEY_BIDS = "nftgm_bidder_frequency_ledger_v1";
  const AUDIT_LEDGER_KEY = "pibox_all_bids_audit_ledger_v1";
  const RESET_EPOCH_KEY = "nftgm_bidder_reset_epoch_v1";
  const CHANNEL_NAME = "public-cluster-bid-frequency-sync";

  let currentResetEpoch = loadResetEpochFromStorage();
  let ledgerStore = loadLedgerFromStorage();
  let broadcastChannel = null;
  let globalDataChannel = null;
  let localBroadcast = null;
  let fastHeartbeatTimer = null;
  let isSyncLoopActive = false;
  let lastSeenSeq = 0;

  function loadResetEpochFromStorage() {
    try {
      const val = Number(localStorage.getItem(RESET_EPOCH_KEY) || "0");
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveResetEpochToStorage(epochTs) {
    try {
      currentResetEpoch = Number(epochTs || Date.now());
      localStorage.setItem(RESET_EPOCH_KEY, String(currentResetEpoch));
    } catch (_) {}
  }

  function loadLedgerFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BIDS);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveLedgerToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_BIDS, JSON.stringify(ledgerStore));
    } catch (_) {}
  }

  function normalizeUsername(username) {
    if (!username || typeof username !== "string") return "";
    return username.trim().replace(/^@+/, "");
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getAuctionListSafe() {
    if (typeof activeAuctionsList !== "undefined" && Array.isArray(activeAuctionsList)) {
      return activeAuctionsList;
    }
    if (Array.isArray(window.activeAuctionsList)) {
      return window.activeAuctionsList;
    }
    return [];
  }

  function getCurrentUserSafe() {
    if (typeof authenticatedPiUser !== "undefined" && authenticatedPiUser && authenticatedPiUser.username) {
      return normalizeUsername(authenticatedPiUser.username);
    }
    if (window.authenticatedPiUser && window.authenticatedPiUser.username) {
      return normalizeUsername(window.authenticatedPiUser.username);
    }
    return "";
  }
  
  const SESSION_EPOCH_KEY = "nftgm_active_session_epoch_v1";
  const ADMIN_DELETED_ASSET_FLAG_KEY = "nftgm_admin_deleted_asset_v1";

  let currentSessionEpoch = loadSessionEpochFromStorage();
  let adminDeletedAnyAsset = loadAdminDeletedAssetFlag();

  function loadSessionEpochFromStorage() {
    try {
      const val = Number(localStorage.getItem(SESSION_EPOCH_KEY) || "0");
      return Number.isFinite(val) && val > 0 ? val : 0;
    } catch (_) {
      return 0;
    }
  }

  function saveSessionEpochToStorage(epochVal) {
    try {
      currentSessionEpoch = Number(epochVal || 0);
      if (currentSessionEpoch > 0) {
        localStorage.setItem(SESSION_EPOCH_KEY, String(currentSessionEpoch));
      } else {
        localStorage.removeItem(SESSION_EPOCH_KEY);
      }
    } catch (_) {}
  }

  function loadAdminDeletedAssetFlag() {
    try {
      return localStorage.getItem(ADMIN_DELETED_ASSET_FLAG_KEY) === "true";
    } catch (_) {
      return false;
    }
  }

  function setAdminDeletedAssetFlag(flagVal) {
    try {
      adminDeletedAnyAsset = Boolean(flagVal);
      if (adminDeletedAnyAsset) {
        localStorage.setItem(ADMIN_DELETED_ASSET_FLAG_KEY, "true");
      } else {
        localStorage.removeItem(ADMIN_DELETED_ASSET_FLAG_KEY);
      }
    } catch (_) {}
  }

  function canPublicResetBidders() {
    return true;
  }

  function isCurrentUserAdminOrDev() {
    return true;
  }

  function recordBidFrequency(username, amount, auctionId = "") {
    const cleanUser = normalizeUsername(username);
    const cleanAmount = _LogicEnforcer.sanitizeAmount(amount);
    if (!cleanUser || cleanAmount <= 0) return null;

    const key = cleanUser.toLowerCase();
    const existing = ledgerStore[key];
    const nowTs = Date.now();

    if (
      existing &&
      String(existing.lastAuctionId || "") === String(auctionId || "") &&
      _LogicEnforcer.sanitizeAmount(existing.lastBid) === cleanAmount &&
      nowTs - Number(existing.lastUpdated || 0) < 600
    ) {
      return existing;
    }

    const nextEntry = existing
      ? {
          username: cleanUser,
          count: Math.max(1, parseInt(existing.count || 0, 10)) + 1,
          lastBid: cleanAmount,
          lastAuctionId: String(auctionId || existing.lastAuctionId || ""),
          lastUpdated: nowTs
        }
      : {
          username: cleanUser,
          count: 1,
          lastBid: cleanAmount,
          lastAuctionId: String(auctionId || ""),
          lastUpdated: nowTs
        };

    ledgerStore[key] = nextEntry;
    saveLedgerToStorage();
    syncAllBidderViews();
    publishRealtimeFrequency(nextEntry, auctionId, cleanAmount);
    return nextEntry;
  }


  function readAuditRecordsSafe() {
    try {
      const raw = localStorage.getItem(AUDIT_LEDGER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return [];
  }

  const _LogicEnforcer = {
    sanitizeAmount: function (val) {
      const num = parseFloat(val);
      return Number.isFinite(num) && num >= 0 ? Number(num.toFixed(4)) : 0;
    },

    reconcileWithAuctions: function () {
      const auctions = getAuctionListSafe();
      const auditRecords = readAuditRecordsSafe();
      let mutated = false;

      // Sinkronkan frekuensi dari audit log bila ada
      if (Array.isArray(auditRecords) && auditRecords.length > 0) {
        const countsByUser = new Map();
        auditRecords.forEach((rec) => {
          if (!rec || !rec.username) return;
          const cleanUser = normalizeUsername(rec.username);
          if (!cleanUser) return;
          const ts = rec.created_at ? new Date(rec.created_at).getTime() : Date.now();
          if (currentResetEpoch > 0 && ts <= currentResetEpoch) return;

          const key = cleanUser.toLowerCase();
          const amt = this.sanitizeAmount(rec.bid_amount);
          const prev = countsByUser.get(key) || {
            username: cleanUser,
            count: 0,
            lastBid: 0,
            lastAuctionId: "",
            lastUpdated: 0
          };
          prev.count += 1;
          if (amt > 0) prev.lastBid = amt;
          if (rec.auction_id) prev.lastAuctionId = String(rec.auction_id);
          prev.lastUpdated = Math.max(prev.lastUpdated, Number.isFinite(ts) ? ts : Date.now());
          countsByUser.set(key, prev);
        });

        countsByUser.forEach((agg, key) => {
          if (currentResetEpoch > 0 && agg.lastUpdated <= currentResetEpoch) return;
          const existing = ledgerStore[key];
          if (!existing) {
            ledgerStore[key] = agg;
            mutated = true;
          } else {
            const existingCount = Math.max(1, parseInt(existing.count || 1, 10));
            if (agg.count > existingCount) {
              existing.count = agg.count;
              mutated = true;
            }
            if (agg.lastBid > 0 && this.sanitizeAmount(existing.lastBid) !== agg.lastBid) {
              existing.lastBid = agg.lastBid;
              mutated = true;
            }
          }
        });
      }

      // Sinkronkan penawar tertinggi aktif jika belum tercatat
      auctions.forEach((auction) => {
        if (!auction || !auction.id) return;
        const bidder = normalizeUsername(auction.highest_bidder);
        const bidAmount = this.sanitizeAmount(auction.highest_bid);

        if (bidder && bidAmount > 0) {
          const key = bidder.toLowerCase();
          if (currentResetEpoch > 0 && !ledgerStore[key]) {
            return;
          }
          if (!ledgerStore[key]) {
            ledgerStore[key] = {
              username: bidder,
              count: 1,
              lastBid: bidAmount,
              lastAuctionId: String(auction.id),
              lastUpdated: Date.now()
            };
            mutated = true;
          } else {
            if (Math.max(0, parseInt(ledgerStore[key].count || 0, 10)) < 1) {
              ledgerStore[key].count = 1;
              mutated = true;
            }
            if (
              String(ledgerStore[key].lastAuctionId) === String(auction.id) &&
              bidAmount > this.sanitizeAmount(ledgerStore[key].lastBid)
            ) {
              ledgerStore[key].lastBid = bidAmount;
              mutated = true;
            }
          }
        }
      });

      if (mutated) {
        saveLedgerToStorage();
      }
    },

    getSortedBidders: function () {
      this.reconcileWithAuctions();
      const entries = Object.values(ledgerStore).filter(
        (entry) => entry && normalizeUsername(entry.username) && Number(entry.count) > 0
      );

      entries.sort((a, b) => {
        const tA = Number(a.lastUpdated || 0);
        const tB = Number(b.lastUpdated || 0);
        if (tA !== tB) return tA - tB;
        return String(a.username).localeCompare(String(b.username));
      });

      return entries;
    },

    getUniqueBidderCount: function () {
      return this.getSortedBidders().length;
    }
  };

  function syncActiveBiddersPanel() {
    const countEl = document.getElementById("activeBiddersCount");
    if (!countEl) return;
    const totalUsers = _LogicEnforcer.getUniqueBidderCount();
    countEl.textContent = `${totalUsers} User`;
  }
  const ADMIN_RESET_ENABLED_KEY = "nftgm_admin_reset_btn_enabled_v1";

  function isResetButtonEnabledByAdmin() {
    try {
      const raw = localStorage.getItem(ADMIN_RESET_ENABLED_KEY);
      if (raw === null) return true;
      return raw === "true";
    } catch (_) {
      return true;
    }
  }

  function setResetButtonEnabledByAdmin(enabled) {
    try {
      localStorage.setItem(ADMIN_RESET_ENABLED_KEY, enabled ? "true" : "false");
    } catch (_) {}
    syncAllBidderViews();
  }

  function isRealAdminForResetSwitch() {
    if (typeof isTestUserModeActive !== "undefined" && isTestUserModeActive) {
      return false;
    }
    const currentUser = getCurrentUserSafe();
    if (!currentUser) return false;
    const admins = typeof ADMIN_USERNAMES !== "undefined" && Array.isArray(ADMIN_USERNAMES)
      ? ADMIN_USERNAMES.map((u) => normalizeUsername(u).toLowerCase())
      : [];
    const devs = typeof DEV_USERNAMES !== "undefined" && Array.isArray(DEV_USERNAMES)
      ? DEV_USERNAMES.map((u) => normalizeUsername(u).toLowerCase())
      : [];
    const lowerUser = currentUser.toLowerCase();
    return admins.includes(lowerUser) || devs.includes(lowerUser);
  }

  function toggleResetButtonActivationByAdmin() {
    if (!isRealAdminForResetSwitch()) {
      alert("⛔ Akses ditolak: hanya Admin yang dapat mengaktifkan atau menonaktifkan tombol reset.");
      return;
    }
    const nextState = !isResetButtonEnabledByAdmin();
    setResetButtonEnabledByAdmin(nextState);
  }

  function syncAdminResetToggleButton() {
    const adminContainer = document.getElementById("adminResetBiddersContainer");
    if (!adminContainer) return;

    const isAdmin = isRealAdminForResetSwitch();
    const isEnabled = isResetButtonEnabledByAdmin();
    let switchBtn = document.getElementById("adminToggleResetSwitchBtn");

    if (!isAdmin) {
      if (switchBtn) switchBtn.remove();
      return;
    }

    if (!switchBtn) {
      switchBtn = document.createElement("button");
      switchBtn.type = "button";
      switchBtn.id = "adminToggleResetSwitchBtn";
      switchBtn.onclick = toggleResetButtonActivationByAdmin;
      adminContainer.classList.add("space-y-2");
      adminContainer.insertBefore(switchBtn, adminContainer.firstChild);
    }

    if (isEnabled) {
      switchBtn.className =
        "w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] transition shadow cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-400/40";
      switchBtn.innerHTML = "🛡️ [ADMIN] Tombol Hapus/Reset: AKTIF (Klik untuk Non-Aktifkan)";
    } else {
      switchBtn.className =
        "w-full bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold py-1.5 px-3 rounded-xl text-[11px] transition shadow cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500/40";
      switchBtn.innerHTML = "🔒 [ADMIN] Tombol Hapus/Reset: NON-AKTIF (Klik untuk Aktifkan)";
    }
  }

  function renderBidderFrequencyTable() {
    const tbody = document.getElementById("activeBiddersModalTableBody");
    const adminContainer = document.getElementById("adminResetBiddersContainer");
    const resetBtn = adminContainer ? adminContainer.querySelector("button") : null;

    if (adminContainer) {
      adminContainer.classList.remove("hidden");
    }

    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.className = "w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs transition shadow cursor-pointer flex items-center justify-center gap-1.5";
      resetBtn.innerHTML = `🗑️ Hapus / Reset Penawar Terpilih`;
    }

    if (!tbody) return;

    const sortedBidders = _LogicEnforcer.getSortedBidders();

    if (sortedBidders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="p-4 text-center text-gray-500">Belum ada penawar tercatat pada sesi ini.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = sortedBidders
      .map((item, idx) => {
        const cleanUser = normalizeUsername(item.username);
        const safeUser =
          typeof SecureShield !== "undefined" && typeof SecureShield.sanitizeHTML === "function"
            ? SecureShield.sanitizeHTML(cleanUser)
            : cleanUser;
        const freq = Math.max(1, parseInt(item.count || 1, 10));
        const lastBidVal = _LogicEnforcer.sanitizeAmount(item.lastBid);

        return `
          <tr class="border-b border-gray-800/80 hover:bg-gray-900/60 transition">
            <td class="p-2 text-center">
              <input
                type="checkbox"
                class="bidder-row-checkbox cursor-pointer accent-emerald-500"
                value="${escapeAttr(cleanUser.toLowerCase())}"
              >
            </td>
            <td class="p-2 font-mono text-yellow-400 font-semibold">
              <span class="text-gray-500 mr-1">#${idx + 1}</span>@${safeUser}
            </td>
            <td class="p-2 text-center">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ${freq}x Menawar
              </span>
            </td>
            <td class="p-2 text-right font-mono text-emerald-400 font-bold">
              ${lastBidVal} Pi
            </td>
          </tr>
        `;
      })
      .join("");
  }


  function syncAllBidderViews() {
    syncActiveBiddersPanel();
    const modal = document.getElementById("activeBiddersModal");
    if (modal && !modal.classList.contains("hidden")) {
      renderBidderFrequencyTable();
    }
  }

  function openActiveBiddersModal() {
    const modal = document.getElementById("activeBiddersModal");
    if (!modal) return;
    renderBidderFrequencyTable();
    modal.classList.remove("hidden");
  }

  function closeActiveBiddersModal() {
    const modal = document.getElementById("activeBiddersModal");
    if (!modal) return;
    modal.classList.add("hidden");
    const selectAll = document.getElementById("selectAllBiddersCheckbox");
    if (selectAll) selectAll.checked = false;
  }

  function toggleSelectAllBidders(masterCheckbox) {
    if (!masterCheckbox) return;
    document.querySelectorAll(".bidder-row-checkbox:not(:disabled)").forEach((cb) => {
      cb.checked = masterCheckbox.checked;
    });
  }

  function purgeStaleUserAndBidArtifacts(fullPurge = false, targetUserKeys = []) {
    const normalizedTargets = Array.isArray(targetUserKeys)
      ? targetUserKeys.map((k) => normalizeUsername(String(k || "")).toLowerCase()).filter(Boolean)
      : [];

    try {
      if (fullPurge) {
        ledgerStore = {};
        localStorage.removeItem(STORAGE_KEY_BIDS);
        localStorage.removeItem("nusantara_cached_auctions");
        localStorage.removeItem(AUDIT_LEDGER_KEY);

        try {
          if (typeof window.name === "string" && window.name.startsWith("PIBOX_LEDGER:")) {
            window.name = "";
          }
        } catch (_) {}

        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (
            k === STORAGE_KEY_BIDS ||
            k === "nusantara_cached_auctions" ||
            k === AUDIT_LEDGER_KEY ||
            k.startsWith("bid_count_") ||
            k.startsWith("nftgm_bidder_") ||
            k.startsWith("nusantara_bidder_") ||
            k.startsWith("nftgm_user_detail_") ||
            k.startsWith("nftgm_buyer_cache_")
          ) {
            if (k !== RESET_EPOCH_KEY) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
      } else if (normalizedTargets.length > 0) {
        normalizedTargets.forEach((targetKey) => {
          delete ledgerStore[targetKey];
          try {
            localStorage.removeItem(`nftgm_user_detail_${targetKey}`);
            localStorage.removeItem(`nftgm_buyer_cache_${targetKey}`);
          } catch (_) {}
        });
        try {
          const rawAudit = localStorage.getItem(AUDIT_LEDGER_KEY);
          if (rawAudit) {
            const parsedAudit = JSON.parse(rawAudit);
            if (Array.isArray(parsedAudit)) {
              const filteredAudit = parsedAudit.filter(
                (rec) =>
                  !normalizedTargets.includes(
                    normalizeUsername(String(rec && rec.username ? rec.username : "")).toLowerCase()
                  )
              );
              localStorage.setItem(AUDIT_LEDGER_KEY, JSON.stringify(filteredAudit));
            }
          }
        } catch (_) {}
        saveLedgerToStorage();
      }
    } catch (_) {}

    const targetAuctions = getAuctionListSafe();
    if (Array.isArray(targetAuctions)) {
      if (fullPurge) {
        targetAuctions.forEach((auction) => {
          if (!auction) return;
          const startPrice = _AutonomousMeshCoordinator.verifyAndClampAmount(
            auction.start_price || auction.starting_price || auction.min_bid || auction.reserve_price || 0
          );
          auction.highest_bid = startPrice > 0 ? startPrice : 0;
          auction.highest_bidder = "";
        });
        try {
          localStorage.setItem("nusantara_cached_auctions", JSON.stringify(targetAuctions));
        } catch (_) {}
      } else if (normalizedTargets.length > 0) {
        targetAuctions.forEach((auction) => {
          if (!auction) return;
          const hbUser = normalizeUsername(auction.highest_bidder || "").toLowerCase();
          if (hbUser && normalizedTargets.includes(hbUser)) {
            const startPrice = _AutonomousMeshCoordinator.verifyAndClampAmount(
              auction.start_price || auction.starting_price || auction.min_bid || auction.reserve_price || 0
            );
            auction.highest_bid = startPrice > 0 ? startPrice : 0;
            auction.highest_bidder = "";
          }
        });
        try {
          localStorage.setItem("nusantara_cached_auctions", JSON.stringify(targetAuctions));
        } catch (_) {}
      }
    }
  }

  function applyGlobalResetState(resetAll, targetKeys = [], epochTs = Date.now(), resetHighestBidState = false) {
    const cleanEpoch = Number(epochTs || Date.now());
    if (currentResetEpoch > 0 && cleanEpoch < currentResetEpoch) {
      return;
    }
    saveResetEpochToStorage(cleanEpoch);

    const normalizedTargets = Array.isArray(targetKeys)
      ? targetKeys.map((k) => normalizeUsername(String(k || "")).toLowerCase()).filter(Boolean)
      : [];

    if (resetAll) {
      purgeStaleUserAndBidArtifacts(true, []);
    } else if (normalizedTargets.length > 0) {
      purgeStaleUserAndBidArtifacts(false, normalizedTargets);
    }

    if (resetHighestBidState && !resetAll) {
      const targetAuctions = getAuctionListSafe();
      targetAuctions.forEach((auction) => {
        if (!auction) return;
        const startPrice = _AutonomousMeshCoordinator.verifyAndClampAmount(
          auction.start_price || auction.starting_price || auction.min_bid || auction.reserve_price || 0
        );
        auction.highest_bid = startPrice > 0 ? startPrice : 0;
        auction.highest_bidder = "";
      });
      try {
        localStorage.setItem("nusantara_cached_auctions", JSON.stringify(targetAuctions));
      } catch (_) {}
    }

    saveLedgerToStorage();
    syncAllBidderViews();

    const buyersModal = document.getElementById("buyersTableModal");
    if (buyersModal && !buyersModal.classList.contains("hidden") && typeof renderBuyersTable === "function") {
      try {
        renderBuyersTable();
      } catch (_) {}
    }

    if (resetHighestBidState || normalizedTargets.length > 0 || resetAll) {
      if (typeof updateActiveCounts === "function") {
        try {
          updateActiveCounts();
        } catch (_) {}
      }
      if (typeof filterGallery === "function") {
        try {
          filterGallery();
        } catch (_) {}
      }
    }
  }

  function broadcastGlobalReset(resetAll, targetKeys = [], epochTs = Date.now(), resetHighestBidState = false) {
    const seq = _AutonomousMeshCoordinator.nextSeq();
    const payload = {
      seq,
      resetAction: {
        resetAll: Boolean(resetAll),
        targetKeys: Array.isArray(targetKeys)
          ? targetKeys.map((k) => normalizeUsername(String(k || "")).toLowerCase()).filter(Boolean)
          : [],
        epochTs: Number(epochTs || Date.now()),
        resetHighestBidState: Boolean(resetHighestBidState)
      },
      sentAt: Date.now()
    };

    if (localBroadcast) {
      try {
        localBroadcast.postMessage({ type: "instant_bid_sync", payload });
      } catch (_) {}
    }

    const pushResetBurst = () => {
      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        try {
          supabaseClient.channel(CHANNEL_NAME).send({
            type: "broadcast",
            event: "bid_frequency_update",
            payload
          });
        } catch (_) {}
        try {
          supabaseClient.channel("public-cluster-auctions").send({
            type: "broadcast",
            event: "live_bid_update",
            payload: {
              seq,
              resetAction: payload.resetAction,
              timestamp: payload.sentAt
            }
          });
        } catch (_) {}
      }
    };

    pushResetBurst();
    setTimeout(pushResetBurst, 30);
    setTimeout(pushResetBurst, 100);
  }

  function adminResetSelectedOrAllBidders() {
    const epochTs = Date.now();
    const checkedBoxes = Array.from(document.querySelectorAll(".bidder-row-checkbox:checked"));

    if (checkedBoxes.length > 0) {
      const targetKeys = checkedBoxes
        .map((cb) => normalizeUsername(String(cb.value || "")).toLowerCase())
        .filter(Boolean);
      if (!confirm(`Hapus / reset ${targetKeys.length} penawar terpilih untuk semua pengguna?`)) return;
      applyGlobalResetState(false, targetKeys, epochTs, false);
      broadcastGlobalReset(false, targetKeys, epochTs, false);
    } else {
      if (!confirm("Tidak ada baris tercentang. Reset seluruh data tabel penawar & frekuensi untuk semua pengguna?")) return;
      applyGlobalResetState(true, [], epochTs, true);
      broadcastGlobalReset(true, [], epochTs, true);
    }

    const selectAll = document.getElementById("selectAllBiddersCheckbox");
    if (selectAll) selectAll.checked = false;
  }



  const _AutonomousMeshCoordinator = {
    nextSeq: function () {
      lastSeenSeq = Math.max(lastSeenSeq + 1, Date.now());
      return lastSeenSeq;
    },

    verifyAndClampAmount: function (val, cap = null) {
      const n = parseFloat(val);
      if (!Number.isFinite(n) || n < 0) return 0;
      const rounded = Number(n.toFixed(4));
      return typeof cap === "number" && Number.isFinite(cap) ? Math.min(cap, rounded) : rounded;
    },

    assertLogicIntegrity: function () {
      _LogicEnforcer.reconcileWithAuctions();
      syncActiveBiddersPanel();
    },

    applyPriceAndBidderFast: function (auctionId, amount, bidderUsername) {
      const cleanId = String(auctionId || "").trim();
      const cleanAmount = this.verifyAndClampAmount(amount);
      const cleanBidder = normalizeUsername(bidderUsername);


      const targetAuctions = getAuctionListSafe();
      if (cleanId && cleanAmount > 0 && Array.isArray(targetAuctions)) {
        const idx = targetAuctions.findIndex((item) => item && String(item.id) === cleanId);
        if (idx !== -1) {
          targetAuctions[idx].highest_bid = cleanAmount;
          if (cleanBidder) {
            targetAuctions[idx].highest_bidder = cleanBidder;
          }
          try {
            localStorage.setItem("nusantara_cached_auctions", JSON.stringify(targetAuctions));
          } catch (_) {}
        }
      }

      if (typeof updateActiveCounts === "function") {
        try {
          updateActiveCounts();
        } catch (_) {}
      }
      if (typeof filterGallery === "function") {
        try {
          filterGallery();
        } catch (_) {}
      }
      syncAllBidderViews();
    },

    applyBuyerOrDepositStateFast: function (buyerRecord, isDeleted = false) {
      if (!buyerRecord || !buyerRecord.username) return;
      const cleanUser = normalizeUsername(buyerRecord.username);
      if (!cleanUser) return;
      const cleanKey = cleanUser.toLowerCase();

      if (isDeleted) {
        purgeStaleUserAndBidArtifacts(false, [cleanKey]);
        syncAllBidderViews();
        const buyersModal = document.getElementById("buyersTableModal");
        if (buyersModal && !buyersModal.classList.contains("hidden") && typeof renderBuyersTable === "function") {
          try {
            renderBuyersTable();
          } catch (_) {}
        }
        if (typeof updateActiveCounts === "function") {
          try {
            updateActiveCounts();
          } catch (_) {}
        }
        if (typeof filterGallery === "function") {
          try {
            filterGallery();
          } catch (_) {}
        }
        return;
      }

      const sBal = this.verifyAndClampAmount(buyerRecord.seller_deposit_balance, 35);
      const bBal = this.verifyAndClampAmount(buyerRecord.buyer_deposit_balance || buyerRecord.deposit_balance, 35);
      const totalBal = this.verifyAndClampAmount(sBal + bBal);

      const normalizedRow = {
        ...buyerRecord,
        username: cleanUser,
        seller_deposit_balance: sBal,
        buyer_deposit_balance: bBal,
        deposit_balance: totalBal
      };

      if (typeof buyersList !== "undefined" && Array.isArray(buyersList)) {
        const idx = buyersList.findIndex(
          (row) => row && normalizeUsername(row.username).toLowerCase() === cleanKey
        );
        if (idx !== -1) {
          buyersList[idx] = { ...buyersList[idx], ...normalizedRow };
        } else {
          buyersList.push(normalizedRow);
        }
      }

      const activeUsr = getCurrentUserSafe();
      if (activeUsr && activeUsr.toLowerCase() === cleanKey) {
        const balEl = document.getElementById("userDepositBalanceDisplay");
        if (balEl) balEl.innerText = `Saldo Jaminan: ${totalBal} Pi`;

        const statusEl = document.getElementById("buyerApprovalStatusText");
        const st = String(normalizedRow.status || "").toLowerCase();
        if (statusEl) {
          if (st === "approved" || st === "aktif" || st === "active" || bBal >= 35) {
            if (typeof isBuyerApproved !== "undefined") isBuyerApproved = true;
            statusEl.innerText = "Status Akses: Aktif (Dapat Melihat Galeri & Menawar)";
          } else if (st === "penjual" || String(normalizedRow.seller_status || "").toLowerCase() === "penjual") {
            statusEl.innerText = "Status Akses: Penjual Terdaftar";
          } else if (st === "pending") {
            if (typeof isBuyerApproved !== "undefined") isBuyerApproved = false;
            statusEl.innerText = "Status Akses: Pending (Menunggu Verifikasi Admin/Dev)";
          }
        }
        if (typeof filterGallery === "function") {
          try {
            filterGallery();
          } catch (_) {}
        }
      }

      const buyersModal = document.getElementById("buyersTableModal");
      if (buyersModal && !buyersModal.classList.contains("hidden") && typeof renderBuyersTable === "function") {
        try {
          renderBuyersTable();
        } catch (_) {}
      }
    },

    mergeIncomingEntry: function (incoming) {
      if (!incoming || !incoming.username) return;
      const cleanUser = normalizeUsername(incoming.username);
      if (!cleanUser) return;
      const incTime = Number(incoming.lastUpdated || Date.now());
      if (currentResetEpoch > 0 && incTime <= currentResetEpoch) return;

      const key = cleanUser.toLowerCase();
      const prev = ledgerStore[key];
      const incCount = Math.max(1, parseInt(incoming.count || 1, 10));
      const incBid = this.verifyAndClampAmount(incoming.lastBid);

      if (
        !prev ||
        incCount > Number(prev.count || 0) ||
        (incCount === Number(prev.count || 0) && incTime >= Number(prev.lastUpdated || 0))
      ) {
        ledgerStore[key] = {
          username: cleanUser,
          count: incCount,
          lastBid: incBid > 0 ? incBid : this.verifyAndClampAmount(prev && prev.lastBid),
          lastAuctionId: String(incoming.lastAuctionId || (prev && prev.lastAuctionId) || ""),
          lastUpdated: incTime
        };
        saveLedgerToStorage();
        this.applyPriceAndBidderFast(incoming.lastAuctionId || "", incBid, cleanUser);
      }
    },

    dispatchInstantFanout: function (entry, auctionId = "", bidAmount = 0, extraState = null) {
      const seq = this.nextSeq();
      const payload = {
        seq,
        entry,
        auctionId: String(auctionId || (entry && entry.lastAuctionId) || ""),
        bidAmount: this.verifyAndClampAmount(bidAmount || (entry && entry.lastBid) || 0),
        bidder: entry ? normalizeUsername(entry.username) : "",
        buyerRecord: extraState && extraState.buyerRecord ? extraState.buyerRecord : null,
        isDeletedBuyer: Boolean(extraState && extraState.isDeletedBuyer),
        scheduleState: extraState && extraState.scheduleState ? extraState.scheduleState : null,
        sentAt: Date.now()
      };

      if (localBroadcast) {
        try {
          localBroadcast.postMessage({ type: "instant_bid_sync", payload });
        } catch (_) {}
      }

      const pushBurst = () => {
        if (typeof supabaseClient !== "undefined" && supabaseClient) {
          try {
            supabaseClient.channel(CHANNEL_NAME).send({
              type: "broadcast",
              event: "bid_frequency_update",
              payload
            });
          } catch (_) {}
          try {
            supabaseClient.channel("public-cluster-auctions").send({
              type: "broadcast",
              event: "live_bid_update",
              payload: {
                seq,
                auctionId: payload.auctionId,
                newBid: payload.bidAmount,
                bidder: payload.bidder,
                buyerRecord: payload.buyerRecord,
                isDeletedBuyer: payload.isDeletedBuyer,
                timestamp: payload.sentAt
              }
            });
          } catch (_) {}
        }
      };

      pushBurst();
      setTimeout(pushBurst, 15);
      setTimeout(pushBurst, 60);
    },

    ingestAnyPayload: function (p) {
      if (!p || typeof p !== "object") return;
      if (p.seq && Number(p.seq) < lastSeenSeq - 5000) return;
      if (p.seq) lastSeenSeq = Math.max(lastSeenSeq, Number(p.seq));

      if (p.resetAction) {
        const ra = p.resetAction;
        applyGlobalResetState(
          Boolean(ra.resetAll),
          Array.isArray(ra.targetKeys) ? ra.targetKeys : [],
          Number(ra.epochTs || Date.now()),
          Boolean(ra.resetHighestBidState)
        );
        return;
      }

      const eventTs = Number(p.sentAt || (p.entry && p.entry.lastUpdated) || Date.now());
      if (currentResetEpoch > 0 && eventTs <= currentResetEpoch) {
        return;
      }

      if (p.entry) {
        this.mergeIncomingEntry(p.entry);
      }
      if (p.auctionId && this.verifyAndClampAmount(p.bidAmount || p.newBid) > 0) {
        this.applyPriceAndBidderFast(
          p.auctionId,
          this.verifyAndClampAmount(p.bidAmount || p.newBid),
          p.bidder
        );
      }
      if (p.buyerRecord) {
        this.applyBuyerOrDepositStateFast(p.buyerRecord, Boolean(p.isDeletedBuyer));
      }
      if (p.scheduleState && typeof auctionScheduleState !== "undefined") {
        auctionScheduleState = p.scheduleState;
        if (typeof checkAuctionSchedule === "function") {
          try {
            checkAuctionSchedule();
          } catch (_) {}
        }
      }
    },

    checkAndHandleNewActiveSession: function () {
      const isOpen = typeof isAuctionCurrentlyOpen !== "undefined" ? Boolean(isAuctionCurrentlyOpen) : false;
      const statusCode = typeof currentAuctionStatusCode !== "undefined" ? Number(currentAuctionStatusCode) : 0;
      const sched = typeof auctionScheduleState !== "undefined" && auctionScheduleState ? auctionScheduleState : {};

      if (!isOpen || statusCode !== 3) {
        return;
      }

      const sessionSignature = [
        sched.mode || "scheduled",
        sched.startDate || "",
        sched.startHour || "",
        sched.durationHours || "",
        sched.instantTimestamp || ""
      ].join("|");

      let numericSessionId = 0;
      for (let i = 0; i < sessionSignature.length; i++) {
        numericSessionId = ((numericSessionId << 5) - numericSessionId + sessionSignature.charCodeAt(i)) | 0;
      }
      const normalizedSessionId = Math.abs(numericSessionId) || 1;

      if (currentSessionEpoch !== normalizedSessionId) {
        saveSessionEpochToStorage(normalizedSessionId);
        const resetTs = Date.now();
        applyGlobalResetState(true, [], resetTs, true);
        broadcastGlobalReset(true, [], resetTs, true);
      }
    },


    notifyAdminAssetDeleted: function () {
      setAdminDeletedAssetFlag(true);
      syncAllBidderViews();
    },

    runConsistencyAudit: function () {
      try {
        this.checkAndHandleNewActiveSession();
        this.assertLogicIntegrity();
        const modal = document.getElementById("activeBiddersModal");
        if (modal && !modal.classList.contains("hidden")) {
          renderBidderFrequencyTable();
        }
      } catch (_) {}
    }
  };


  function publishRealtimeFrequency(entry, auctionId = "", bidAmount = 0, extraState = null) {
    _AutonomousMeshCoordinator.dispatchInstantFanout(entry, auctionId, bidAmount, extraState);
  }

  function initRealtimeFrequencyListener() {
    if (typeof BroadcastChannel !== "undefined" && !localBroadcast) {
      try {
        localBroadcast = new BroadcastChannel(CHANNEL_NAME);
        localBroadcast.onmessage = (ev) => {
          if (ev && ev.data && ev.data.type === "instant_bid_sync" && ev.data.payload) {
            _AutonomousMeshCoordinator.ingestAnyPayload(ev.data.payload);
          }
        };
      } catch (_) {}
    }

    window.addEventListener("storage", (ev) => {
      if (!ev) return;
      if (ev.key === RESET_EPOCH_KEY) {
        const nextEpoch = Number(ev.newValue || "0");
        if (Number.isFinite(nextEpoch) && nextEpoch > currentResetEpoch) {
          applyGlobalResetState(true, [], nextEpoch, true);
        }
      }
      if (ev.key === STORAGE_KEY_BIDS) {
        try {
          ledgerStore = ev.newValue ? JSON.parse(ev.newValue) || {} : {};
          syncAllBidderViews();
        } catch (_) {}
      }
      if (ev.key === "nusantara_cached_auctions" && ev.newValue) {
        try {
          const parsedAuctions = JSON.parse(ev.newValue);
          if (Array.isArray(parsedAuctions) && typeof activeAuctionsList !== "undefined") {
            activeAuctionsList = parsedAuctions;
            if (typeof updateActiveCounts === "function") updateActiveCounts();
            if (typeof filterGallery === "function") filterGallery();
            syncAllBidderViews();
          }
        } catch (_) {}
      }
    });

    if (typeof supabaseClient !== "undefined" && supabaseClient && !broadcastChannel) {
      try {
        broadcastChannel = supabaseClient
          .channel(CHANNEL_NAME)
          .on("broadcast", { event: "bid_frequency_update" }, (msg) => {
            _AutonomousMeshCoordinator.ingestAnyPayload(msg && msg.payload ? msg.payload : null);
          })
          .subscribe();
      } catch (_) {}
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient && !globalDataChannel) {
      try {
        globalDataChannel = supabaseClient
          .channel("global-state-mesh-sync")
          .on("postgres_changes", { event: "*", schema: "public", table: "buyers" }, (payload) => {
            const eventType = payload && payload.eventType ? String(payload.eventType).toUpperCase() : "";
            if (eventType === "DELETE") {
              const oldRow = (payload && payload.old) || null;
              if (oldRow && oldRow.username) {
                _AutonomousMeshCoordinator.applyBuyerOrDepositStateFast(oldRow, true);
              } else {
                applyGlobalResetState(true, [], Date.now(), false);
              }
              return;
            }
            const row = (payload && payload.new) || null;
            if (row) {
              _AutonomousMeshCoordinator.applyBuyerOrDepositStateFast(row, false);
            } else if (typeof fetchBuyersList === "function") {
              fetchBuyersList().catch(() => {});
            }
          })
          .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, (payload) => {
            if (payload && payload.new && typeof activeAuctionsList !== "undefined") {
              const idx = activeAuctionsList.findIndex((a) => String(a.id) === String(payload.new.id));
              if (idx !== -1) {
                activeAuctionsList[idx] = { ...activeAuctionsList[idx], ...payload.new };
              } else {
                activeAuctionsList.unshift(payload.new);
              }
              try {
                localStorage.setItem("nusantara_cached_auctions", JSON.stringify(activeAuctionsList));
              } catch (_) {}
              if (typeof updateActiveCounts === "function") updateActiveCounts();
              if (typeof filterGallery === "function") filterGallery();
              syncAllBidderViews();
            }
          })
          .subscribe();
      } catch (_) {}
    }

    if (!isSyncLoopActive) {
      isSyncLoopActive = true;
      fastHeartbeatTimer = setInterval(() => {
        _AutonomousMeshCoordinator.runConsistencyAudit();
      }, 250);
    }
  }

  window.BidderFrequencyEngine = {
    recordBid: function (username, amount, auctionId = "") {
      const entry = recordBidFrequency(username, amount, auctionId);
      if (entry) {
        _AutonomousMeshCoordinator.applyPriceAndBidderFast(auctionId, amount, username);
        _AutonomousMeshCoordinator.dispatchInstantFanout(entry, auctionId, amount);
      }
      return entry;
    },
    distributePriceNow: function (auctionId, amount, bidderUsername = "") {
      _AutonomousMeshCoordinator.applyPriceAndBidderFast(auctionId, amount, bidderUsername);
      const cleanUser = normalizeUsername(bidderUsername);
      const cleanAmount = _AutonomousMeshCoordinator.verifyAndClampAmount(amount);
      const existing = cleanUser
        ? ledgerStore[cleanUser.toLowerCase()] || {
            username: cleanUser,
            count: 1,
            lastBid: cleanAmount,
            lastAuctionId: String(auctionId || ""),
            lastUpdated: Date.now()
          }
        : null;
      _AutonomousMeshCoordinator.dispatchInstantFanout(existing, auctionId, cleanAmount);
    },
    notifyAdminAssetDeleted: function () {
      _AutonomousMeshCoordinator.notifyAdminAssetDeleted();
    },
    checkNewSessionNow: function () {
      _AutonomousMeshCoordinator.checkAndHandleNewActiveSession();
    },
    syncBuyerStateNow: function (buyerRecord, isDeleted = false) {
      _AutonomousMeshCoordinator.applyBuyerOrDepositStateFast(buyerRecord, Boolean(isDeleted));
      _AutonomousMeshCoordinator.dispatchInstantFanout(null, "", 0, {
        buyerRecord,
        isDeletedBuyer: Boolean(isDeleted)
      });
    },
    syncScheduleNow: function (scheduleState) {
      _AutonomousMeshCoordinator.dispatchInstantFanout(null, "", 0, { scheduleState });
    },
    ingestPayload: function (payload) {
      _AutonomousMeshCoordinator.ingestAnyPayload(payload);
    },
    syncViews: syncAllBidderViews,
    getBidderCount: () => _LogicEnforcer.getUniqueBidderCount(),
    getAllBidders: () => _LogicEnforcer.getSortedBidders()
  };


  window.openActiveBiddersModal = openActiveBiddersModal;
  window.closeActiveBiddersModal = closeActiveBiddersModal;
  window.toggleSelectAllBidders = toggleSelectAllBidders;
  window.adminResetSelectedOrAllBidders = adminResetSelectedOrAllBidders;

  document.addEventListener("DOMContentLoaded", () => {
    _AutonomousMeshCoordinator.runConsistencyAudit();
    initRealtimeFrequencyListener();
    setTimeout(() => {
      if (!broadcastChannel || !globalDataChannel) initRealtimeFrequencyListener();
      _AutonomousMeshCoordinator.runConsistencyAudit();
    }, 250);
  });
})();
