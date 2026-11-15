/**
 * MODUL OTONOM & LOGIKA KELOLA TABEL PEMBELI (AGI-SECURE)
 * Berfungsi mengelola render, pencarian, verifikasi status, dan penghapusan data pembeli.
 */

const _AgiBuyersGuardian = {
  version: "2.0.0-buyers-secure",
  validatePermission: function(username) {
    if (!username || typeof username !== 'string') return false;
    const cleanUser = username.trim();
    return typeof ADMIN_USERNAMES !== 'undefined' && ADMIN_USERNAMES.includes(cleanUser);
  }
};

function openBuyersTableModal() {
  const currentUsr = typeof authenticatedPiUser !== 'undefined' && authenticatedPiUser ? authenticatedPiUser.username : '';
  if (!_AgiBuyersGuardian.validatePermission(currentUsr)) {
    alert("⛔ AKSES DITOLAK: Fitur tabel daftar pembeli hanya dapat diakses oleh Administrator.");
    return;
  }
  
  if (typeof fetchBuyersList === 'function') {
    fetchBuyersList().then(() => {
      const modalEl = document.getElementById('buyersTableModal');
      if (modalEl) modalEl.classList.remove('hidden');
      renderBuyersTable();
    });
  }
}

function closeBuyersTableModal() {
  const modalEl = document.getElementById('buyersTableModal');
  if (modalEl) modalEl.classList.add('hidden');
}

function renderBuyersTable() {
  const tbody = document.getElementById('buyersTableBody');
  if (!tbody) return;

  const searchQuery = (document.getElementById('searchBuyerInput')?.value || '').toLowerCase().trim();
  const filteredBuyers = (typeof buyersList !== 'undefined' ? buyersList : []).filter(b => 
    (b.username || '').toLowerCase().includes(searchQuery) || 
    (b.status || '').toLowerCase().includes(searchQuery)
  );

  if (filteredBuyers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-500">Tidak ada data calon pembeli ditemukan.</td></tr>`;
    return;
  }

  let html = '';
  filteredBuyers.forEach(buyer => {
    const username = buyer.username || 'Anon';
    const status = (buyer.status || 'pending').toLowerCase();
    const balance = parseFloat(buyer.deposit_balance || 0);
    const hasRequestedWithdrawal = buyer.has_requested_withdrawal || false;

    let statusBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">Pending</span>`;
    if (status === 'approved' || status === 'aktif' || status === 'active') {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">Aktif (Approved)</span>`;
    }

    let noticeText = `${balance} Pi`;
    if (balance >= 35) {
      noticeText += ` <span class="text-emerald-400 font-bold">(Cukup)</span>`;
    } else {
      noticeText += ` <span class="text-red-400 font-bold">(Kurang)</span>`;
    }

    let withdrawalActionBtn = `<span class="text-gray-500 text-[10px]">Tidak Ada</span>`;
    if (hasRequestedWithdrawal) {
      withdrawalActionBtn = `<button onclick="adminProcessWithdrawalRefund('${username}')" class="bg-amber-600 hover:bg-amber-500 text-white font-bold px-2 py-1 rounded text-[9px] transition shadow cursor-pointer">💸 Refund Jaminan</button>`;
    }

    html += `
      <tr class="border-b border-gray-800/80 hover:bg-gray-900/50 transition">
        <th class="p-2 text-center bg-gray-950 sticky left-0 z-20 border-r border-gray-800"><input type="checkbox" class="buyer-checkbox accent-yellow-500 cursor-pointer" value="${username}"></th>
        <th class="p-2 bg-gray-950 sticky left-8 z-20 border-r border-gray-800 font-mono text-yellow-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.5)]">@${username}</th>
        <th class="p-2 text-center text-gray-300 font-mono">${noticeText}</th>
        <th class="p-2">${statusBadge}</th>
        <th class="p-2 text-right space-x-1">
          <button onclick="adminToggleBuyerStatus('${username}', '${status}')" class="bg-blue-900/80 hover:bg-blue-800 text-blue-200 px-2 py-1 rounded text-[9px] font-bold cursor-pointer">Ubah Status</button>
          <button onclick="adminDeleteSingleBuyer('${username}')" class="bg-red-900/80 hover:bg-red-800 text-red-200 px-2 py-1 rounded text-[9px] font-bold cursor-pointer">Hapus</button>
        </th>
        <th class="p-2 text-center">${withdrawalActionBtn}</th>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function toggleSelectAllBuyers(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.buyer-checkbox');
  checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
  const batchContainer = document.getElementById('adminDeleteBatchContainer');
  if (batchContainer) {
    if (masterCheckbox.checked && checkboxes.length > 0) {
      batchContainer.classList.remove('hidden');
    } else {
      batchContainer.classList.add('hidden');
    }
  }
}

async function adminToggleBuyerStatus(username, currentStatus) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;
  const newStatus = (currentStatus === 'approved' || currentStatus === 'aktif' || currentStatus === 'active') ? 'pending' : 'approved';
  
  try {
    const { error } = await supabaseClient
      .from('buyers')
      .update({ status: newStatus })
      .eq('username', username);

    if (error) throw error;
    await fetchBuyersList();
    renderBuyersTable();
    alert(`✅ Status verifikasi user @${username} berhasil diubah menjadi: ${newStatus.toUpperCase()}`);
  } catch (err) {
    alert("Gagal mengubah status pembeli: " + err.message);
  }
}

async function adminDeleteSingleBuyer(username) {
  if (!confirm(`⚠️ Apakah Anda yakin ingin menghapus data pembeli @${username}?`)) return;
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from('buyers')
      .delete()
      .eq('username', username);

    if (error) throw error;
    await fetchBuyersList();
    renderBuyersTable();
    alert(`🗑️ Data pembeli @${username} berhasil dihapus.`);
  } catch (err) {
    alert("Gagal menghapus data: " + err.message);
  }
}

async function adminProcessWithdrawalRefund(username) {
  if (!confirm(`💸 Konfirmasi Pengembalian Jaminan\nApakah Anda sudah mengirimkan kembali dana jaminan ke wallet Pionir @${username} dan ingin mereset data jaminan?`)) return;
  if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from('buyers')
      .update({ deposit_balance: 0.00, status: 'pending', has_requested_withdrawal: false })
      .eq('username', username);

    if (error) throw error;
    await fetchBuyersList();
    renderBuyersTable();
    alert(`✅ Dana jaminan untuk @${username} telah dikonfirmasi dikembalikan dan status direset.`);
  } catch (err) {
    alert("Gagal memproses refund: " + err.message);
  }
}
