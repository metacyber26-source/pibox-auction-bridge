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

  // Mesin penjaga integritas data & sinkronisasi latar belakang (tanpa label eksternal)
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
    publishRealtimeFrequency(nextEntry);
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
          <td colspan="4" class="p-4 text-center text-gray-500">Belum ada penawar tercatat pada sesi ini.</td>
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
        const lastBidFormatted = `${_LogicEnforcer.sanitizeAmount(item.lastBid)} Pi`;

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
            <td class="p-2 text-right font-mono font-bold text-white">
              ${lastBidFormatted}
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

  function adminResetSelectedOrAllBidders() {
    if (!isCurrentUserAdminOrDev()) {
      alert("Akses ditolak: hanya Admin/Developer yang dapat mereset data penawar.");
      return;
    }

    const checkedBoxes = Array.from(document.querySelectorAll(".bidder-row-checkbox:checked"));
    if (checkedBoxes.length > 0) {
      const targetKeys = checkedBoxes.map((cb) => String(cb.value || "").toLowerCase());
      if (!confirm(`Hapus / reset ${targetKeys.length} penawar terpilih dari tabel frekuensi?`)) return;
      targetKeys.forEach((k) => {
        delete ledgerStore[k];
      });
    } else {
      if (!confirm("Tidak ada baris tercentang. Reset seluruh data tabel penawar & frekuensi?")) return;
      ledgerStore = {};
    }

    saveLedgerToStorage();
    syncAllBidderViews();
    const selectAll = document.getElementById("selectAllBiddersCheckbox");
    if (selectAll) selectAll.checked = false;
  }

  let localBroadcast = null;
  let fastHeartbeatTimer = null;
  let globalDataChannel = null;
  let lastSeenSeq = 0;

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

    applyPriceAndBidderFast: function (auctionId, amount, bidderUsername) {
      const cleanId = String(auctionId || "").trim();
      const cleanAmount = this.verifyAndClampAmount(amount);
      const cleanBidder = normalizeUsername(bidderUsername);

      if (cleanId && cleanAmount > 0 && typeof activeAuctionsList !== "undefined" && Array.isArray(activeAuctionsList)) {
        const idx = activeAuctionsList.findIndex((item) => item && String(item.id) === cleanId);
        if (idx !== -1) {
          const prevBid = this.verifyAndClampAmount(activeAuctionsList[idx].highest_bid);
          if (cleanAmount >= prevBid || !activeAuctionsList[idx].highest_bid) {
            activeAuctionsList[idx].highest_bid = cleanAmount;
            if (cleanBidder) {
              activeAuctionsList[idx].highest_bidder = cleanBidder;
            }
            try {
              localStorage.setItem("nusantara_cached_auctions", JSON.stringify(activeAuctionsList));
            } catch (_) {}
          }
        }
      }

      if (typeof updateActiveCounts === "function") {
        try { updateActiveCounts(); } catch (_) {}
      }
      if (typeof filterGallery === "function") {
        try { filterGallery(); } catch (_) {}
      }
      syncAllBidderViews();
    },

    applyBuyerOrDepositStateFast: function (buyerRecord) {
      if (!buyerRecord || !buyerRecord.username) return;
      const cleanUser = normalizeUsername(buyerRecord.username);
      if (!cleanUser) return;

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
          (row) => row && normalizeUsername(row.username).toLowerCase() === cleanUser.toLowerCase()
        );
        if (idx !== -1) {
          buyersList[idx] = { ...buyersList[idx], ...normalizedRow };
        } else {
          buyersList.push(normalizedRow);
        }
      }

      if (typeof authenticatedPiUser !== "undefined" && authenticatedPiUser && authenticatedPiUser.username) {
        if (normalizeUsername(authenticatedPiUser.username).toLowerCase() === cleanUser.toLowerCase()) {
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
            try { filterGallery(); } catch (_) {}
          }
        }
      }

      const buyersModal = document.getElementById("buyersTableModal");
      if (buyersModal && !buyersModal.classList.contains("hidden") && typeof renderBuyersTable === "function") {
        try { renderBuyersTable(); } catch (_) {}
      }
    },

    mergeIncomingEntry: function (incoming) {
      if (!incoming || !incoming.username) return;
      const cleanUser = normalizeUsername(incoming.username);
      if (!cleanUser) return;
      const key = cleanUser.toLowerCase();
      const prev = ledgerStore[key];
      const incCount = Math.max(1, parseInt(incoming.count || 1, 10));
      const incBid = this.verifyAndClampAmount(incoming.lastBid);
      const incTime = Number(incoming.lastUpdated || Date.now());

      if (!prev || incCount > Number(prev.count || 0) || (incCount === Number(prev.count || 0) && incTime >= Number(prev.lastUpdated || 0))) {
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
        scheduleState: extraState && extraState.scheduleState ? extraState.scheduleState : null,
        sentAt: Date.now()
      };

      if (localBroadcast) {
        try { localBroadcast.postMessage({ type: "instant_bid_sync", payload }); } catch (_) {}
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
                timestamp: payload.sentAt
              }
            });
          } catch (_) {}
        }
      };

      pushBurst();
      setTimeout(pushBurst, 80);
      setTimeout(pushBurst, 220);
    },

    ingestAnyPayload: function (p) {
      if (!p || typeof p !== "object") return;
      if (p.seq && Number(p.seq) < lastSeenSeq - 5000) return;
      if (p.seq) lastSeenSeq = Math.max(lastSeenSeq, Number(p.seq));

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
        this.applyBuyerOrDepositStateFast(p.buyerRecord);
      }
      if (p.scheduleState && typeof auctionScheduleState !== "undefined") {
        auctionScheduleState = p.scheduleState;
        if (typeof checkAuctionSchedule === "function") {
          try { checkAuctionSchedule(); } catch (_) {}
        }
      }
    },

    runConsistencyAudit: function () {
      try {
        _LogicEnforcer.reconcileWithAuctions();
        syncActiveBiddersPanel();
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
