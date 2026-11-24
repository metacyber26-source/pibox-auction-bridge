/**
 * Modul Terpisah: Tabel Penawar Lelang & Frekuensi Penawaran
 * Menjaga konsistensi frekuensi (1x, 2x, 3x, 4x...), panel Penawar Aktif,
 * modal Detail, serta distribusi harga penawaran tercepat ke seluruh pengguna.
 */
(function () {
  "use strict";

  const STORAGE_KEY_BIDS = "nftgm_bidder_frequency_ledger_v1";
  const STORAGE_KEY_RESET_BTN_ENABLED = "pibox_reset_button_enabled_v1";
  const RESET_EPOCH_KEY = "nftgm_bidder_reset_epoch_v1";
  const CHANNEL_NAME = "public-cluster-bid-frequency-sync";

  let ledgerStore = loadLedgerFromStorage();
  let isResetButtonEnabled = loadResetButtonEnabledFromStorage();
  let currentResetEpoch = loadResetEpochFromStorage();
  let broadcastChannel = null;
  let localBroadcast = null;
  let fastHeartbeatTimer = null;
  let globalDataChannel = null;
  let lastSeenSeq = 0;
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

  function loadResetButtonEnabledFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RESET_BTN_ENABLED);
      if (raw === null) return true;
      return raw === "true";
    } catch (_) {
      return true;
    }
  }

  function saveResetButtonEnabledToStorage(enabled) {
    try {
      isResetButtonEnabled = Boolean(enabled);
      localStorage.setItem(STORAGE_KEY_RESET_BTN_ENABLED, String(isResetButtonEnabled));
    } catch (_) {}
  }

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
    if (typeof isTestUserModeActive !== "undefined" && isTestUserModeActive) {
      return "";
    }
    if (typeof authenticatedPiUser !== "undefined" && authenticatedPiUser && authenticatedPiUser.username) {
      return normalizeUsername(authenticatedPiUser.username);
    }
    if (window.authenticatedPiUser && window.authenticatedPiUser.username) {
      return normalizeUsername(window.authenticatedPiUser.username);
    }
    return "";
  }

  function isCurrentUserAdminOrDev() {
    if (typeof isTestUserModeActive !== "undefined" && isTestUserModeActive) {
      return false;
    }
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

  function syncResetButtonAndAdminToggleUI() {
    const isAdmin = isCurrentUserAdminOrDev();
    const adminToggleBox = document.getElementById("adminToggleResetFeatureBox");
    const adminToggleBtn = document.getElementById("adminToggleResetButtonBtn");
    const resetContainer = document.getElementById("adminResetBiddersContainer");
    const resetBtn = document.getElementById("resetSelectedBiddersBtn");
    const selectAllCb = document.getElementById("selectAllBiddersCheckbox");

    if (adminToggleBox) {
      if (isAdmin) {
        adminToggleBox.classList.remove("hidden");
      } else {
        adminToggleBox.classList.add("hidden");
      }
    }

    if (adminToggleBtn) {
      if (isResetButtonEnabled) {
        adminToggleBtn.textContent = "Aktif (Nonaktifkan)";
        adminToggleBtn.className =
          "px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white";
      } else {
        adminToggleBtn.textContent = "Nonaktif (Aktifkan)";
        adminToggleBtn.className =
          "px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-200";
      }
    }

    if (resetContainer) {
      resetContainer.classList.remove("hidden");
    }

    if (resetBtn) {
      resetBtn.innerHTML = "🗑️ Hapus / Reset Penawar Terpilih";
      resetBtn.disabled = !isResetButtonEnabled;
    }

    if (selectAllCb) {
      selectAllCb.disabled = !isResetButtonEnabled;
      if (!isResetButtonEnabled) selectAllCb.checked = false;
    }

    document.querySelectorAll(".bidder-row-checkbox").forEach((cb) => {
      cb.disabled = !isResetButtonEnabled;
      if (!isResetButtonEnabled) cb.checked = false;
    });
  }

  function broadcastResetButtonState(enabled) {
    const seq = _AutonomousMeshCoordinator.nextSeq();
    const payload = {
      seq,
      resetButtonControl: {
        enabled: Boolean(enabled),
        updatedAt: Date.now()
      },
      sentAt: Date.now()
    };

    if (localBroadcast) {
      try { localBroadcast.postMessage({ type: "instant_bid_sync", payload }); } catch (_) {}
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      try {
        supabaseClient.channel(CHANNEL_NAME).send({
          type: "broadcast",
          event: "bid_frequency_update",
          payload
        });
      } catch (_) {}
    }

    try {
      localStorage.setItem(
        "nftgm_instant_bid_bus_v1",
        JSON.stringify({ ...payload, nonce: Math.random() })
      );
    } catch (_) {}
  }

  window.toggleResetBiddersButtonAccess = function () {
    if (!isCurrentUserAdminOrDev()) {
      alert("⛔ Akses Ditolak: Pengaturan aktif/nonaktif tombol ini khusus Admin & Developer.");
      return;
    }

    const nextState = !isResetButtonEnabled;
    saveResetButtonEnabledToStorage(nextState);
    syncResetButtonAndAdminToggleUI();
    broadcastResetButtonState(nextState);

    alert(
      nextState
        ? "✅ Tombol 'Hapus / Reset Penawar Terpilih' DIAKTIFKAN."
        : "🔒 Tombol 'Hapus / Reset Penawar Terpilih' DINONAKTIFKAN."
    );
  };

  function getOrCreateBidderEntry(username) {
    const clean = normalizeUsername(username);
    if (!clean) return null;
    if (!ledgerStore[clean]) {
      ledgerStore[clean] = {
        username: clean,
        bidCount: 0,
        lastBid: 0,
        firstSeenAt: Date.now(),
        lastBidAt: 0,
        auctionIds: []
      };
    }
    return ledgerStore[clean];
  }

  function recordBidEvent(username, bidAmount, auctionId = null, eventTs = Date.now()) {
    const clean = normalizeUsername(username);
    const amount = parseFloat(bidAmount);
    if (!clean || isNaN(amount) || amount <= 0) return null;

    if (currentResetEpoch > 0 && Number(eventTs) <= currentResetEpoch) {
      return null;
    }

    const entry = getOrCreateBidderEntry(clean);
    entry.bidCount = (parseInt(entry.bidCount, 10) || 0) + 1;
    entry.lastBid = Math.max(parseFloat(entry.lastBid || 0), amount);
    entry.lastBidAt = Math.max(parseInt(entry.lastBidAt || 0, 10), Number(eventTs) || Date.now());
    if (!entry.firstSeenAt) entry.firstSeenAt = entry.lastBidAt;
    if (auctionId && !entry.auctionIds.includes(String(auctionId))) {
      entry.auctionIds.push(String(auctionId));
    }

    saveLedgerToStorage();
    return entry;
  }

  function hydrateFromActiveAuctions() {
    const auctions = getAuctionListSafe();
    auctions.forEach((auc) => {
      if (!auc || !auc.highest_bidder) return;
      const bidder = normalizeUsername(auc.highest_bidder);
      const amount = parseFloat(auc.highest_bid || auc.reserve_price || 0);
      if (!bidder || isNaN(amount) || amount <= 0) return;

      const aucTs = auc.updated_at ? new Date(auc.updated_at).getTime() : (auc.created_at ? new Date(auc.created_at).getTime() : 0);
      if (currentResetEpoch > 0 && aucTs > 0 && aucTs <= currentResetEpoch) {
        return;
      }

      if (!ledgerStore[bidder]) {
        ledgerStore[bidder] = {
          username: bidder,
          bidCount: 1,
          lastBid: amount,
          firstSeenAt: aucTs || Date.now(),
          lastBidAt: aucTs || Date.now(),
          auctionIds: auc.id ? [String(auc.id)] : []
        };
      } else {
        ledgerStore[bidder].lastBid = Math.max(parseFloat(ledgerStore[bidder].lastBid || 0), amount);
        if (parseInt(ledgerStore[bidder].bidCount || 0, 10) < 1) {
          ledgerStore[bidder].bidCount = 1;
        }
        if (auc.id && !ledgerStore[bidder].auctionIds.includes(String(auc.id))) {
          ledgerStore[bidder].auctionIds.push(String(auc.id));
        }
      }
    });
    saveLedgerToStorage();
  }

  function getOrderedBiddersList() {
    hydrateFromActiveAuctions();
    return Object.values(ledgerStore)
      .filter((item) => item && item.username && (parseInt(item.bidCount, 10) || 0) > 0)
      .sort((a, b) => {
        const tA = parseInt(a.firstSeenAt || 0, 10);
        const tB = parseInt(b.firstSeenAt || 0, 10);
        if (tA !== tB) return tA - tB;
        return String(a.username).localeCompare(String(b.username));
      });
  }

  function updateActiveBiddersCounterUI() {
    const list = getOrderedBiddersList();
    const activeCount = list.length;
    const countEl = document.getElementById("activeBiddersCount");
    if (countEl) {
      countEl.innerText = `${activeCount} User`;
    }
  }

  function renderBiddersModalTable() {
    const tbody = document.getElementById("activeBiddersModalTableBody");
    if (!tbody) return;

    syncResetButtonAndAdminToggleUI();

    const list = getOrderedBiddersList();
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-500">No recorded bidders yet.</td></tr>`;
      return;
    }

    const disabledAttr = !isResetButtonEnabled ? "disabled" : "";
    tbody.innerHTML = list
      .map((item) => {
        const safeUser = typeof SecureShield !== "undefined" && SecureShield.sanitizeHTML
          ? SecureShield.sanitizeHTML(item.username)
          : item.username;
        const count = parseInt(item.bidCount, 10) || 1;
        return `
          <tr class="border-b border-gray-800/80 hover:bg-gray-900/60 transition">
            <td class="p-2 text-center">
              <input type="checkbox" class="bidder-row-checkbox cursor-pointer accent-emerald-500" value="${safeUser}" ${disabledAttr}>
            </td>
            <td class="p-2 font-mono text-yellow-400 font-semibold">@${safeUser}</td>
            <td class="p-2 text-right">
              <span class="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold text-[10px]">
                ${count}x
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    syncResetButtonAndAdminToggleUI();
  }


  const _AutonomousMeshCoordinator = {
    seqCounter: Date.now(),
    nextSeq: function () {
      this.seqCounter += 1;
      return this.seqCounter;
    },
    buildSnapshot: function (extra = {}) {
      const auctions = getAuctionListSafe().map((a) => ({
        id: a.id,
        highest_bid: a.highest_bid,
        highest_bidder: a.highest_bidder,
        status: a.status
      }));
      return {
        seq: this.nextSeq(),
        ts: Date.now(),
        resetEpoch: currentResetEpoch,
        resetButtonEnabled: isResetButtonEnabled,
        ledger: ledgerStore,
        auctions,
        ...extra
      };
    },
    ingestAnyPayload: function (payload) {
      if (!payload || typeof payload !== "object") return false;
      const incomingSeq = Number(payload.seq || 0);
      if (incomingSeq && incomingSeq <= lastSeenSeq && !payload.resetAction && !payload.resetButtonControl) {
        return false;
      }
      if (incomingSeq > lastSeenSeq) {
        lastSeenSeq = incomingSeq;
      }

      let changed = false;

      if (payload.resetButtonControl && typeof payload.resetButtonControl.enabled === "boolean") {
        saveResetButtonEnabledToStorage(payload.resetButtonControl.enabled);
        syncResetButtonAndAdminToggleUI();
        changed = true;
      }

      if (typeof payload.resetButtonEnabled === "boolean" && !payload.resetAction) {
        saveResetButtonEnabledToStorage(payload.resetButtonEnabled);
        syncResetButtonAndAdminToggleUI();
        changed = true;
      }

      if (payload.resetAction) {
        const epoch = Number(payload.resetEpoch || payload.ts || Date.now());
        saveResetEpochToStorage(epoch);

        if (payload.resetAction === "reset_selected" && Array.isArray(payload.selectedUsernames)) {
          payload.selectedUsernames.forEach((u) => {
            const clean = normalizeUsername(u);
            if (clean && ledgerStore[clean]) {
              delete ledgerStore[clean];
            }
          });
        } else {
          ledgerStore = {};
        }
        saveLedgerToStorage();
        changed = true;
      } else if (payload.ledger && typeof payload.ledger === "object") {
        Object.keys(payload.ledger).forEach((k) => {
          const remoteItem = payload.ledger[k];
          if (!remoteItem || !remoteItem.username) return;
          const clean = normalizeUsername(remoteItem.username);
          if (!clean) return;
          if (currentResetEpoch > 0 && Number(remoteItem.lastBidAt || 0) <= currentResetEpoch) {
            return;
          }
          const localItem = ledgerStore[clean];
          const remoteCount = parseInt(remoteItem.bidCount || 0, 10);
          const localCount = localItem ? parseInt(localItem.bidCount || 0, 10) : 0;
          const remoteBid = parseFloat(remoteItem.lastBid || 0);
          const localBid = localItem ? parseFloat(localItem.lastBid || 0) : 0;

          if (!localItem || remoteCount > localCount || remoteBid > localBid) {
            ledgerStore[clean] = {
              username: clean,
              bidCount: Math.max(localCount, remoteCount),
              lastBid: Math.max(localBid, remoteBid),
              firstSeenAt: Math.min(
                parseInt((localItem && localItem.firstSeenAt) || remoteItem.firstSeenAt || Date.now(), 10),
                parseInt(remoteItem.firstSeenAt || Date.now(), 10)
              ),
              lastBidAt: Math.max(
                parseInt((localItem && localItem.lastBidAt) || 0, 10),
                parseInt(remoteItem.lastBidAt || 0, 10)
              ),
              auctionIds: Array.from(
                new Set([...((localItem && localItem.auctionIds) || []), ...(remoteItem.auctionIds || [])])
              )
            };
            changed = true;
          }
        });
        if (changed) saveLedgerToStorage();
      }

      if (payload.bidEvent && payload.bidEvent.username && payload.bidEvent.amount) {
        const evTs = Number(payload.bidEvent.ts || payload.ts || Date.now());
        if (!(currentResetEpoch > 0 && evTs <= currentResetEpoch)) {
          const existing = ledgerStore[normalizeUsername(payload.bidEvent.username)];
          const prevCnt = existing ? parseInt(existing.bidCount || 0, 10) : 0;
          const incomingCnt = parseInt(payload.bidEvent.bidCount || 0, 10);
          if (!existing || incomingCnt > prevCnt || Number(payload.bidEvent.ts || 0) > Number(existing.lastBidAt || 0)) {
            ledgerStore[normalizeUsername(payload.bidEvent.username)] = {
              username: normalizeUsername(payload.bidEvent.username),
              bidCount: Math.max(prevCnt + 1, incomingCnt || 1),
              lastBid: Math.max(parseFloat((existing && existing.lastBid) || 0), parseFloat(payload.bidEvent.amount || 0)),
              firstSeenAt: (existing && existing.firstSeenAt) || evTs,
              lastBidAt: Math.max(parseInt((existing && existing.lastBidAt) || 0, 10), evTs),
              auctionIds: Array.from(
                new Set([...((existing && existing.auctionIds) || []), ...(payload.bidEvent.auctionId ? [String(payload.bidEvent.auctionId)] : [])])
              )
            };
            saveLedgerToStorage();
            changed = true;
          }
        }
      }

      if (Array.isArray(payload.auctions) && typeof activeAuctionsList !== "undefined" && Array.isArray(activeAuctionsList)) {
        payload.auctions.forEach((remAuc) => {
          if (!remAuc || !remAuc.id) return;
          const locAuc = activeAuctionsList.find((a) => String(a.id) === String(remAuc.id));
          if (!locAuc) return;

          if (payload.resetAction) {
            if (payload.resetAction === "reset_selected" && Array.isArray(payload.selectedUsernames)) {
              const resetSet = new Set(payload.selectedUsernames.map((u) => normalizeUsername(u).toLowerCase()));
              if (locAuc.highest_bidder && resetSet.has(normalizeUsername(locAuc.highest_bidder).toLowerCase())) {
                locAuc.highest_bid = parseFloat(locAuc.reserve_price || 0);
                locAuc.highest_bidder = null;
                changed = true;
              }
            } else {
              locAuc.highest_bid = parseFloat(locAuc.reserve_price || 0);
              locAuc.highest_bidder = null;
              changed = true;
            }
          } else {
            const remBid = parseFloat(remAuc.highest_bid || 0);
            const locBid = parseFloat(locAuc.highest_bid || 0);
            if (remBid > locBid || (remBid === locBid && remAuc.highest_bidder && remAuc.highest_bidder !== locAuc.highest_bidder)) {
              locAuc.highest_bid = remBid;
              locAuc.highest_bidder = remAuc.highest_bidder;
              changed = true;
            }
            if (typeof selectedAuction !== "undefined" && selectedAuction && String(selectedAuction.id) === String(locAuc.id)) {
              selectedAuction.highest_bid = locAuc.highest_bid;
              selectedAuction.highest_bidder = locAuc.highest_bidder;
              const priceEl = document.getElementById("detailModalCurrentPrice");
              if (priceEl) priceEl.innerText = `${locAuc.highest_bid} Pi`;
            }
          }
        });
        if (changed) {
          try {
            localStorage.setItem("nusantara_cached_auctions", JSON.stringify(activeAuctionsList));
          } catch (_) {}
        }
      }

      if (changed) {
        updateActiveBiddersCounterUI();
        renderBiddersModalTable();
        if (typeof filterGallery === "function") {
          try { filterGallery(); } catch (_) {}
        }
      }
      return changed;
    },
    pushInstantState: function (extra = {}) {
      const snap = this.buildSnapshot(extra);
      lastSeenSeq = snap.seq;

      try {
        localStorage.setItem("nftgm_instant_bid_bus_v1", JSON.stringify({ ...snap, nonce: Math.random() }));
      } catch (_) {}

      if (localBroadcast) {
        try { localBroadcast.postMessage({ type: "instant_bid_sync", payload: snap }); } catch (_) {}
      }

      if (typeof supabaseClient !== "undefined" && supabaseClient) {
        try {
          supabaseClient.channel(CHANNEL_NAME).send({
            type: "broadcast",
            event: "bid_frequency_update",
            payload: snap
          });
        } catch (_) {}
      }
    }
  };

  function broadcastState(extraPayload = {}) {
    _AutonomousMeshCoordinator.pushInstantState(extraPayload);
  }

  function setupRealtimeListeners() {
    if (typeof BroadcastChannel !== "undefined" && !localBroadcast) {
      try {
        localBroadcast = new BroadcastChannel("nftgm_instant_bid_channel_v1");
        localBroadcast.onmessage = (ev) => {
          if (ev && ev.data && ev.data.type === "instant_bid_sync" && ev.data.payload) {
            _AutonomousMeshCoordinator.ingestAnyPayload(ev.data.payload);
          }
        };
      } catch (_) {}
    }

    window.addEventListener("storage", (ev) => {
      if (!ev) return;
      if (ev.key === STORAGE_KEY_RESET_BTN_ENABLED) {
        isResetButtonEnabled = loadResetButtonEnabledFromStorage();
        syncResetButtonAndAdminToggleUI();
      }
      if (ev.key === "nftgm_instant_bid_bus_v1" && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          _AutonomousMeshCoordinator.ingestAnyPayload(parsed);
        } catch (_) {}
      } else if (ev.key === STORAGE_KEY_BIDS && ev.newValue) {
        try {
          ledgerStore = JSON.parse(ev.newValue) || {};
          updateActiveBiddersCounterUI();
          renderBiddersModalTable();
        } catch (_) {}
      }
    });

    if (typeof supabaseClient !== "undefined" && supabaseClient && !broadcastChannel) {
      try {
        broadcastChannel = supabaseClient
          .channel(CHANNEL_NAME)
          .on("broadcast", { event: "bid_frequency_update" }, ({ payload }) => {
            if (!payload) return;
            _AutonomousMeshCoordinator.ingestAnyPayload(payload);
          })
          .subscribe();
      } catch (_) {}
    }

    if (typeof supabaseClient !== "undefined" && supabaseClient && !globalDataChannel) {
      try {
        globalDataChannel = supabaseClient
          .channel("public-cluster-bid-live-rows")
          .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, (pgPayload) => {
            const row = pgPayload && pgPayload.new ? pgPayload.new : null;
            if (!row || !row.id) return;
            const auctions = getAuctionListSafe();
            const target = auctions.find((a) => String(a.id) === String(row.id));
            if (target) {
              const incomingBid = parseFloat(row.highest_bid || 0);
              const currentBid = parseFloat(target.highest_bid || 0);
              if (incomingBid > currentBid || (row.highest_bidder && row.highest_bidder !== target.highest_bidder)) {
                target.highest_bid = Math.max(incomingBid, currentBid);
                if (row.highest_bidder) {
                  target.highest_bidder = row.highest_bidder;
                  recordBidEvent(row.highest_bidder, target.highest_bid, row.id, Date.now());
                }
                if (typeof selectedAuction !== "undefined" && selectedAuction && String(selectedAuction.id) === String(row.id)) {
                  selectedAuction.highest_bid = target.highest_bid;
                  selectedAuction.highest_bidder = target.highest_bidder;
                  const priceEl = document.getElementById("detailModalCurrentPrice");
                  if (priceEl) priceEl.innerText = `${target.highest_bid} Pi`;
                }
                updateActiveBiddersCounterUI();
                renderBiddersModalTable();
                if (typeof filterGallery === "function") {
                  try { filterGallery(); } catch (_) {}
                }
              }
            }
          })
          .subscribe();
      } catch (_) {}
    }

    if (!fastHeartbeatTimer) {
      fastHeartbeatTimer = setInterval(() => {
        if (isSyncLoopActive) return;
        isSyncLoopActive = true;
        try {
          hydrateFromActiveAuctions();
          updateActiveBiddersCounterUI();
          syncResetButtonAndAdminToggleUI();
          const modal = document.getElementById("activeBiddersModal");
          if (modal && !modal.classList.contains("hidden")) {
            renderBiddersModalTable();
          }
        } finally {
          isSyncLoopActive = false;
        }
      }, 250);
    }
  }

  function wrapPlaceBidFunction() {
    if (typeof window.placeBidOnAuction !== "function" || window.placeBidOnAuction.__wrappedForFrequency) {
      return;
    }

    const originalPlaceBid = window.placeBidOnAuction;
    const wrappedPlaceBid = async function (auctionId, amount) {
      const bidder = getCurrentUserSafe();
      const bidTs = Date.now();
      const result = await originalPlaceBid.apply(this, arguments);

      if (bidder) {
        const rec = recordBidEvent(bidder, amount, auctionId, bidTs);
        updateActiveBiddersCounterUI();
        renderBiddersModalTable();
        broadcastState({
          bidEvent: {
            username: bidder,
            amount: parseFloat(amount),
            bidCount: rec ? rec.bidCount : 1,
            auctionId: String(auctionId),
            ts: bidTs
          }
        });
      }
      return result;
    };

    wrappedPlaceBid.__wrappedForFrequency = true;
    window.placeBidOnAuction = wrappedPlaceBid;
  }

  window.openActiveBiddersModal = function () {
    try {
      setupRealtimeListeners();
      hydrateFromActiveAuctions();
      updateActiveBiddersCounterUI();
      renderBiddersModalTable();
    } catch (_) {}
    const modal = document.getElementById("activeBiddersModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.style.display = "flex";
    }
  };


  window.closeActiveBiddersModal = function () {
    const modal = document.getElementById("activeBiddersModal");
    if (modal) modal.classList.add("hidden");
  };

  window.toggleSelectAllBidders = function (masterCheckbox) {
    if (!isResetButtonEnabled) {
      if (masterCheckbox) masterCheckbox.checked = false;
      return;
    }
    const checked = Boolean(masterCheckbox && masterCheckbox.checked);
    document.querySelectorAll(".bidder-row-checkbox").forEach((cb) => {
      if (!cb.disabled) cb.checked = checked;
    });
  };

  window.adminResetSelectedOrAllBidders = async function () {
    if (!isResetButtonEnabled) {
      alert("🔒 Tombol 'Hapus / Reset Penawar Terpilih' sedang dinonaktifkan oleh Admin.");
      return;
    }

    const selected = Array.from(document.querySelectorAll(".bidder-row-checkbox:checked")).map((cb) =>
      normalizeUsername(cb.value)
    );
    const resetAll = selected.length === 0;
    const targetUsers = resetAll ? Object.keys(ledgerStore) : selected;

    if (!targetUsers.length) {
      alert("Tidak ada data penawar untuk di-reset.");
      return;
    }

    const confirmMsg = resetAll
      ? "⚠️ Tidak ada penawar yang dicentang. Reset SEMUA penawar & kembalikan harga lelang ke harga awal?"
      : `⚠️ Hapus / reset ${targetUsers.length} penawar terpilih (${targetUsers.map((u) => "@" + u).join(", ")})?`;

    if (!confirm(confirmMsg)) return;

    const resetTs = Date.now();
    saveResetEpochToStorage(resetTs);

    if (resetAll) {
      ledgerStore = {};
    } else {
      targetUsers.forEach((u) => {
        delete ledgerStore[u];
      });
    }
    saveLedgerToStorage();

    const auctions = getAuctionListSafe();
    const resetSet = new Set(targetUsers.map((u) => u.toLowerCase()));

    for (const auc of auctions) {
      if (!auc) continue;
      const currentHighestBidder = normalizeUsername(auc.highest_bidder || "").toLowerCase();
      if (resetAll || (currentHighestBidder && resetSet.has(currentHighestBidder))) {
        const baseReserve = parseFloat(auc.reserve_price || 0);
        auc.highest_bid = baseReserve;
        auc.highest_bidder = null;

        if (typeof supabaseClient !== "undefined" && supabaseClient && auc.id) {
          try {
            await supabaseClient
              .from("auctions")
              .update({ highest_bid: baseReserve, highest_bidder: null })
              .eq("id", auc.id);
          } catch (_) {}
        }
      }
    }

    try {
      localStorage.setItem("nusantara_cached_auctions", JSON.stringify(auctions));
    } catch (_) {}

    const selectAllCb = document.getElementById("selectAllBiddersCheckbox");
    if (selectAllCb) selectAllCb.checked = false;

    updateActiveBiddersCounterUI();
    renderBiddersModalTable();
    if (typeof filterGallery === "function") {
      try { filterGallery(); } catch (_) {}
    }

    broadcastState({
      resetAction: resetAll ? "reset_all" : "reset_selected",
      selectedUsernames: targetUsers,
      resetEpoch: resetTs
    });

    alert("✅ Data penawar & harga lelang berhasil di-reset.");
  };

  window.BidderFrequencyEngine = {
    recordBid: recordBidEvent,
    getOrderedList: getOrderedBiddersList,
    syncViews: function () {
      setupRealtimeListeners();
      wrapPlaceBidFunction();
      hydrateFromActiveAuctions();
      updateActiveBiddersCounterUI();
      syncResetButtonAndAdminToggleUI();
      const modal = document.getElementById("activeBiddersModal");
      if (modal && !modal.classList.contains("hidden")) {
        renderBiddersModalTable();
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    setupRealtimeListeners();
    wrapPlaceBidFunction();
    setTimeout(() => {
      wrapPlaceBidFunction();
      hydrateFromActiveAuctions();
      updateActiveBiddersCounterUI();
      syncResetButtonAndAdminToggleUI();
    }, 400);
  });
})();
