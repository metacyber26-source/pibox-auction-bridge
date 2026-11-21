/**
 * Modul Terpisah: Tabel Penawar Lelang & Frekuensi Penawaran
 * Menjaga konsistensi frekuensi (1x, 2x, 3x, 4x...), panel Penawar Aktif,
 * modal Detail, serta distribusi harga penawaran tercepat ke seluruh pengguna.
 */
(function () {
  "use strict";

  const STORAGE_KEY_BIDS = "nftgm_bidder_frequency_ledger_v1";
  const CHANNEL_NAME = "public-cluster-bid-frequency-sync";

  let ledgerStore = loadLedgerFromStorage();
  let broadcastChannel = null;
  let isSyncLoopActive = false;

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

  function getAuctionListSafe() {
    return typeof activeAuctionsList !== "undefined" && Array.isArray(activeAuctionsList)
      ? activeAuctionsList
      : [];
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

  function isCurrentUserAdminOrDev() {
    const currentUser = getCurrentUserSafe();
    if (!currentUser) return false;
    const admins = typeof ADMIN_USERNAMES !== "undefined" && Array.isArray(ADMIN_USERNAMES)
      ? ADMIN_USERNAMES
      : [];
    const devs = typeof DEV_USERNAMES !== "undefined" && Array.isArray(DEV_USERNAMES)
      ? DEV_USERNAMES
      : [];
    return admins.includes(currentUser) || devs.includes(currentUser);
  }

  const _LogicEnforcer = {
    sanitizeAmount: function (val) {
      const num = parseFloat(val);
      return Number.isFinite(num) && num >= 0 ? Number(num.toFixed(4)) : 0;
    },

    reconcileWithAuctions: function () {
      const auctions = getAuctionListSafe();
      let mutated = false;

      auctions.forEach((auction) => {
        if (!auction || !auction.id) return;
        const bidder = normalizeUsername(auction.highest_bidder);
        const bidAmount = this.sanitizeAmount(auction.highest_bid);

        if (bidder && bidAmount > 0) {
          const key = bidder.toLowerCase();
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
            if (ledgerStore[key].count < 1) {
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

  function recordBidFrequency(username, amount, auctionId = "") {
    const cleanUser = normalizeUsername(username);
    const cleanAmount = _LogicEnforcer.sanitizeAmount(amount);
    if (!cleanUser || cleanAmount <= 0) return null;

    const key = cleanUser.toLowerCase();
    const existing = ledgerStore[key];

    const nextEntry = existing
      ? {
          username: cleanUser,
          count: Number(existing.count || 0) + 1,
          lastBid: cleanAmount,
          lastAuctionId: String(auctionId || existing.lastAuctionId || ""),
          lastUpdated: Date.now()
        }
      : {
          username: cleanUser,
          count: 1,
          lastBid: cleanAmount,
          lastAuctionId: String(auctionId || ""),
          lastUpdated: Date.now()
        };

    ledgerStore[key] = nextEntry;
    saveLedgerToStorage();
    syncAllBidderViews();
    publishRealtimeFrequency(nextEntry, auctionId, cleanAmount);
    return nextEntry;
  }

  function syncActiveBiddersPanel() {
    const countEl = document.getElementById("activeBiddersCount");
    if (!countEl) return;
    const totalUsers = _LogicEnforcer.getUniqueBidderCount();
    countEl.textContent = `${totalUsers} User`;
  }

  function renderBidderFrequencyTable() {
    const tbody = document.getElementById("activeBiddersModalTableBody");
    const adminContainer = document.getElementById("adminResetBiddersContainer");

    if (adminContainer) {
      if (isCurrentUserAdminOrDev()) {
        adminContainer.classList.remove("hidden");
      } else {
        adminContainer.classList.add("hidden");
      }
    }

    if (!tbody) return;

    const sortedBidders = _LogicEnforcer.getSortedBidders();
    const canAdmin = isCurrentUserAdminOrDev();

    if (sortedBidders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center text-gray-500">Belum ada penawar tercatat pada sesi ini.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = sortedBidders
      .map((item, idx) => {
        const safeUser =
          typeof SecureShield !== "undefined" && typeof SecureShield.sanitizeHTML === "function"
            ? SecureShield.sanitizeHTML(item.username)
            : item.username;
        const freq = Math.max(1, parseInt(item.count || 1, 10));

        return `
          <tr class="border-b border-gray-800/80 hover:bg-gray-900/60 transition">
            <td class="p-2 text-center">
              <input
                type="checkbox"
                class="bidder-row-checkbox cursor-pointer accent-emerald-500"
                value="${safeUser.toLowerCase()}"
                ${canAdmin ? "" : "disabled"}
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

    const RESET_EPOCH_KEY = "nftgm_bidder_reset_epoch_v1";
  let currentResetEpoch = loadResetEpochFromStorage();

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

  function applyGlobalResetState(resetAll, targetKeys = [], epochTs = Date.now(), resetHighestBidState = false) {
    saveResetEpochToStorage(epochTs);

    if (resetAll) {
      ledgerStore = {};
      if (resetHighestBidState && typeof activeAuctionsList !== "undefined" && Array.isArray(activeAuctionsList)) {
        activeAuctionsList.forEach((auction) => {
          if (!auction) return;
          const startPrice = _AutonomousMeshCoordinator.verifyAndClampAmount(
            auction.start_price || auction.starting_price || auction.min_bid || 0
          );
          auction.highest_bid = startPrice > 0 ? startPrice : 0;
          auction.highest_bidder = "";
        });
        try {
          localStorage.setItem("nusantara_cached_auctions", JSON.stringify(activeAuctionsList));
        } catch (_) {}
      }
    } else if (Array.isArray(targetKeys) && targetKeys.length > 0) {
      targetKeys.forEach((k) => {
        const cleanKey = String(k || "").toLowerCase();
        if (cleanKey) delete ledgerStore[cleanKey];
      });
    }

    saveLedgerToStorage();
    syncAllBidderViews();

    if (resetHighestBidState) {
      if (typeof updateActiveCounts === "function") {
        try { updateActiveCounts(); } catch (_) {}
      }
      if (typeof filterGallery === "function") {
        try { filterGallery(); } catch (_) {}
      }
    }
  }

  function broadcastGlobalReset(resetAll, targetKeys = [], epochTs = Date.now(), resetHighestBidState = false) {
    const seq = _AutonomousMeshCoordinator.nextSeq();
    const payload = {
      seq,
      resetAction: {
        resetAll: Boolean(resetAll),
        targetKeys: Array.isArray(targetKeys) ? targetKeys.map((k) => String(k || "").toLowerCase()) : [],
        epochTs: Number(epochTs || Date.now()),
        resetHighestBidState: Boolean(resetHighestBidState)
      },
      sentAt: Date.now()
    };

    if (localBroadcast) {
      try { localBroadcast.postMessage({ type: "instant_bid_sync", payload }); } catch (_) {}
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
    setTimeout(pushResetBurst, 60);
    setTimeout(pushResetBurst, 180);
  }

  function adminResetSelectedOrAllBidders() {
    if (!isCurrentUserAdminOrDev()) {
      alert("Akses ditolak: hanya Admin/Developer yang dapat mereset data penawar.");
      return;
    }

    const epochTs = Date.now();
    const checkedBoxes = Array.from(document.querySelectorAll(".bidder-row-checkbox:checked"));

    if (checkedBoxes.length > 0) {
      const targetKeys = checkedBoxes.map((cb) => String(cb.value || "").toLowerCase());
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

  let localBroadcast = null;
  let fastHeartbeatTimer = null;
  let globalDataChannel = null;
  let lastSeenSeq = 0;

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
      if (ev.key === STORAGE_KEY_BIDS && ev.newValue) {
        try {
          ledgerStore = JSON.parse(ev.newValue) || {};
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
            const row = (payload && (payload.new || payload.old)) || null;
            if (row && payload.eventType !== "DELETE") {
              _AutonomousMeshCoordinator.applyBuyerOrDepositStateFast(row);
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
      if (cleanUser) {
        const key = cleanUser.toLowerCase();
        const existing = ledgerStore[key] || {
          username: cleanUser,
          count: 1,
          lastBid: _AutonomousMeshCoordinator.verifyAndClampAmount(amount),
          lastAuctionId: String(auctionId || ""),
          lastUpdated: Date.now()
        };
        _AutonomousMeshCoordinator.dispatchInstantFanout(existing, auctionId, amount);
      }
    },
    syncBuyerStateNow: function (buyerRecord) {
      _AutonomousMeshCoordinator.applyBuyerOrDepositStateFast(buyerRecord);
      _AutonomousMeshCoordinator.dispatchInstantFanout(null, "", 0, { buyerRecord });
    },
    syncScheduleNow: function (scheduleState) {
      _AutonomousMeshCoordinator.dispatchInstantFanout(null, "", 0, { scheduleState });
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
