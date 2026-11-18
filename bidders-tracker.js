// ============================================================================
// FILE: bidders-tracker.js
// FUNGSI: Pencatatan & Manajemen Semua Penawar (Pertama s/d Terakhir)
// ============================================================================

const BiddersTrackerModule = {
  storageKey: 'auction_all_bidders_log_v1',

  /**
   * 1. MENCATAT PENAWARAN BARU (Panggil fungsi ini setiap kali user menekan tombol Bid/Menawar)
   * @param {string} auctionId - ID barang lelang
   * @param {string} username - Username penawar
   * @param {number} bidAmount - Nominal tawaran (Pi)
   */
  recordBid: async function(auctionId, username, bidAmount) {
    if (!username) return;
    const cleanUser = String(username).trim();
    const numericBid = parseFloat(bidAmount) || 0;
    const nowIso = new Date().toISOString();

    // A. Simpan ke LocalStorage agar langsung tercatat instan tanpa jeda
    let localLogs = this.getLocalLogs();
    localLogs.push({
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      auction_id: String(auctionId || 'general'),
      username: cleanUser,
      bid_amount: numericBid,
      created_at: nowIso
    });
    localStorage.setItem(this.storageKey, JSON.stringify(localLogs));

    // B. Simpan ke Database Supabase (jika tersedia) agar terdistribusi ke semua perangkat
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        await supabaseClient.from('auction_bids_history').insert([{
          auction_id: String(auctionId || 'general'),
          username: cleanUser,
          bid_amount: numericBid,
          created_at: nowIso
        }]);
      } catch (e) {
        console.warn('Sync DB tertunda, tersimpan di cache lokal:', e);
      }
    }

    // C. Perbarui indikator & tabel secara otomatis
    this.syncIndicatorCount();
    if (!document.getElementById('activeBiddersModal')?.classList.contains('hidden')) {
      this.renderTable();
    }
  },

  /**
   * 2. MENGAMBIL SEMUA DATA LOG PENAWAR (URUT DARI PERTAMA SAMPAI TERAKHIR)
   */
  getAllBiddersChronological: async function() {
    let rawLogs = [];

    // Ambil dari Supabase jika terkoneksi
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('auction_bids_history')
          .select('*')
          .order('created_at', { ascending: true }); // Urut dari yang pertama menawar
        if (!error && Array.isArray(data)) {
          rawLogs = data;
        }
      } catch (e) {}
    }

    // Gabungkan dengan log lokal yang mungkin belum tersinkronisasi
    const localLogs = this.getLocalLogs();
    if (rawLogs.length === 0 && localLogs.length > 0) {
      rawLogs = localLogs;
    }

    // Agregasi per username dengan mempertahankan urutan kemunculan pertama kali menawar
    const orderedBidders = new Map();

    rawLogs.forEach(row => {
      const usr = row.username;
      if (!usr) return;
      const amount = parseFloat(row.bid_amount || 0);

      if (!orderedBidders.has(usr)) {
        orderedBidders.set(usr, {
          username: usr,
          count: 1,
          firstBid: amount,
          lastBid: amount,
          firstTime: row.created_at || '',
          lastTime: row.created_at || ''
        });
      } else {
        const existing = orderedBidders.get(usr);
        existing.count += 1;
        existing.lastBid = amount;
        existing.lastTime = row.created_at || existing.lastTime;
      }
    });

    // Fallback jika tabel history masih kosong namun ada penawar aktif di lelang berjalan
    if (orderedBidders.size === 0 && typeof activeAuctionsList !== 'undefined' && Array.isArray(activeAuctionsList)) {
      activeAuctionsList.forEach(item => {
        if (item.highest_bidder) {
          const usr = item.highest_bidder;
          const amount = parseFloat(item.highest_bid || item.reserve_price || 0);
          if (!orderedBidders.has(usr)) {
            orderedBidders.set(usr, {
              username: usr,
              count: 1,
              firstBid: amount,
              lastBid: amount
            });
          } else {
            const existing = orderedBidders.get(usr);
            existing.count += 1;
            existing.lastBid = amount;
          }
        }
      });
    }

    return Array.from(orderedBidders.values());
  },

  /**
   * 3. MERENDER TABEL DAFTAR PENAWAR KE MODAL
   */
  renderTable: async function() {
    const tbody = document.getElementById('activeBiddersModalTableBody');
    if (!tbody) return;

    const biddersList = await this.getAllBiddersChronological();

    if (biddersList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">Belum ada penawar tercatat.</td></tr>`;
      const selectAll = document.getElementById('selectAllBiddersCheckbox');
      if (selectAll) selectAll.checked = false;
      return;
    }

    let html = '';
    biddersList.forEach((data, index) => {
      const maskedUsr = (typeof SecureShield !== 'undefined' && SecureShield.maskUsername)
        ? SecureShield.maskUsername(data.username)
        : data.username;

      html += `
        <tr class="border-b border-gray-800 bg-gray-950 hover:bg-gray-900/50 transition">
          <td class="p-2 text-center">
            <input type="checkbox" value="${data.username}" class="bidder-checkbox cursor-pointer accent-emerald-500">
          </td>
          <td class="p-2 font-mono text-yellow-400">
            <span class="text-[9px] text-gray-500 mr-1">#${index + 1}</span>@${maskedUsr}
          </td>
          <td class="p-2 text-center font-bold text-emerald-400">${data.count}x Menawar</td>
          <td class="p-2 text-right font-bold text-white">${data.lastBid} Pi</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    const selectAll = document.getElementById('selectAllBiddersCheckbox');
    if (selectAll) selectAll.checked = false;
  },

  /**
   * 4. MENGHAPUS / MERESET PENAWAR TERPILIH ATAU SEMUA PENAWAR
   */
  deleteSelectedBidders: async function() {
    const currentUsr = (typeof authenticatedPiUser !== 'undefined' && authenticatedPiUser) ? authenticatedPiUser.username : '';
    const isAdminOrDev = (typeof ADMIN_USERNAMES !== 'undefined' && Array.isArray(ADMIN_USERNAMES))
      ? ADMIN_USERNAMES.includes(currentUsr)
      : true;

    if (!isAdminOrDev && currentUsr !== '') {
      alert('⛔ Akses Ditolak: Hanya Admin dan Developer!');
      return;
    }

    const selectedCheckboxes = document.querySelectorAll('.bidder-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
      alert("⚠️ Silakan centang minimal satu penawar atau centang kotak 'Pilih Semua' di atas!");
      return;
    }

    const isSelectAllChecked = document.getElementById('selectAllBiddersCheckbox')?.checked;
    const confirmMsg = isSelectAllChecked
      ? '⚠️ PERINGATAN: Anda akan menghapus BERSIH seluruh daftar & riwayat penawar. Lanjutkan?'
      : `⚠️ Hapus bersih riwayat penawaran untuk ${selectedCheckboxes.length} penawar terpilih?`;

    if (!confirm(confirmMsg)) return;

    const selectedUsernames = Array.from(selectedCheckboxes).map(cb => cb.value);

    // A. Hapus dari Database Supabase
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      try {
        if (isSelectAllChecked) {
          await supabaseClient.from('auction_bids_history').delete().neq('username', '___FORCE_CLEAR_ALL___');
        } else {
          for (const usr of selectedUsernames) {
            await supabaseClient.from('auction_bids_history').delete().eq('username', usr);
          }
        }
      } catch (e) {
        console.error('Gagal menghapus dari DB:', e);
      }
    }

    // B. Hapus dari LocalStorage
    if (isSelectAllChecked) {
      localStorage.removeItem(this.storageKey);
    } else {
      const remainingLogs = this.getLocalLogs().filter(log => !selectedUsernames.includes(log.username));
      localStorage.setItem(this.storageKey, JSON.stringify(remainingLogs));
    }

    // C. Bersihkan referensi di daftar lelang aktif agar tidak muncul kembali sebagai fallback
    if (typeof activeAuctionsList !== 'undefined' && Array.isArray(activeAuctionsList)) {
      activeAuctionsList.forEach(item => {
        if (isSelectAllChecked || selectedUsernames.includes(item.highest_bidder)) {
          item.highest_bidder = null;
          item.highest_bid = item.reserve_price || 0;
        }
      });
    }

    alert('🗑️ Daftar dan riwayat penawar terpilih berhasil dihapus bersih.');
    await this.renderTable();
    this.syncIndicatorCount();

    if (typeof fetchActiveAuctions === 'function') {
      fetchActiveAuctions();
    }
  },

  /**
   * 5. SINKRONISASI JUMLAH PENAWAR AKTIF & INTERCEPTOR OTOMATIS DI BALIK LAYAR
   */
  getLocalLogs: function() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch (e) {
      return [];
    }
  },

  syncIndicatorCount: async function() {
    try {
      const list = await this.getAllBiddersChronological();
      const countEl = document.getElementById('activeBiddersCount');
      if (countEl) {
        const labelText = `${list.length} User`;
        if (countEl.innerText !== labelText) {
          countEl.innerText = labelText;
        }
      }
    } catch (e) {}
  },

  initAutonomousWatcher: function() {
    // Memantau perubahan data secara otomatis setiap 1 detik di balik layar
    setInterval(() => {
      this.syncIndicatorCount();
    }, 1000);
  }
};

// ============================================================================
// FUNGSI PENGHUBUNG GLOBAL (DIPANGGIL OLEH TOMBOL HTML)
// ============================================================================
function openActiveBiddersModal() {
  BiddersTrackerModule.renderTable();
  document.getElementById('activeBiddersModal')?.classList.remove('hidden');

  const currentUsr = (typeof authenticatedPiUser !== 'undefined' && authenticatedPiUser) ? authenticatedPiUser.username : '';
  const isAdminOrDev = (typeof ADMIN_USERNAMES !== 'undefined' && Array.isArray(ADMIN_USERNAMES))
    ? ADMIN_USERNAMES.includes(currentUsr)
    : true;

  const resetContainer = document.getElementById('adminResetBiddersContainer');
  if (resetContainer) {
    if (isAdminOrDev) resetContainer.classList.remove('hidden');
    else resetContainer.classList.add('hidden');
  }
}

function closeActiveBiddersModal() {
  document.getElementById('activeBiddersModal')?.classList.add('hidden');
}

function toggleSelectAllBidders(source) {
  const checkboxes = document.querySelectorAll('.bidder-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = source.checked;
  });
}

function adminResetSelectedOrAllBidders() {
  BiddersTrackerModule.deleteSelectedBidders();
}

// Jalankan pemantau otomatis saat file dimuat
BiddersTrackerModule.initAutonomousWatcher();
