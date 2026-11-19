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

  function publishRealtimeFrequency(entry) {
    if (typeof supabaseClient !== "undefined" && supabaseClient) {
      try {
        supabaseClient.channel(CHANNEL_NAME).send({
          type: "broadcast",
          event: "bid_frequency_update",
          payload: { entry, sentAt: Date.now() }
        });
      } catch (_) {}
    }
  }

  function initRealtimeFrequencyListener() {
    if (typeof supabaseClient !== "undefined" && supabaseClient && !broadcastChannel) {
      try {
        broadcastChannel = supabaseClient
          .channel(CHANNEL_NAME)
          .on("broadcast", { event: "bid_frequency_update" }, (msg) => {
            const incoming = msg && msg.payload ? msg.payload.entry : null;
            if (incoming && incoming.username) {
              const key = normalizeUsername(incoming.username).toLowerCase();
              const prev = ledgerStore[key];
              if (!prev || Number(incoming.count || 0) >= Number(prev.count || 0)) {
                ledgerStore[key] = {
                  username: normalizeUsername(incoming.username),
                  count: Math.max(1, parseInt(incoming.count || 1, 10)),
                  lastBid: _LogicEnforcer.sanitizeAmount(incoming.lastBid),
                  lastAuctionId: String(incoming.lastAuctionId || ""),
                  lastUpdated: Number(incoming.lastUpdated || Date.now())
                };
                saveLedgerToStorage();
                syncAllBidderViews();
              }
            }
          })
          .subscribe();
      } catch (_) {}
    }

    if (!isSyncLoopActive) {
      isSyncLoopActive = true;
      setInterval(() => {
        _LogicEnforcer.reconcileWithAuctions();
        syncActiveBiddersPanel();
      }, 1000);
    }
  }

  window.BidderFrequencyEngine = {
    recordBid: recordBidFrequency,
    syncViews: syncAllBidderViews,
    getBidderCount: () => _LogicEnforcer.getUniqueBidderCount(),
    getAllBidders: () => _LogicEnforcer.getSortedBidders()
  };

  window.openActiveBiddersModal = openActiveBiddersModal;
  window.closeActiveBiddersModal = closeActiveBiddersModal;
  window.toggleSelectAllBidders = toggleSelectAllBidders;
  window.adminResetSelectedOrAllBidders = adminResetSelectedOrAllBidders;

  document.addEventListener("DOMContentLoaded", () => {
    _LogicEnforcer.reconcileWithAuctions();
    syncAllBidderViews();
    initRealtimeFrequencyListener();
    setTimeout(() => {
      if (!broadcastChannel) initRealtimeFrequencyListener();
      _LogicEnforcer.reconcileWithAuctions();
      syncAllBidderViews();
    }, 1200);
  });
})();
