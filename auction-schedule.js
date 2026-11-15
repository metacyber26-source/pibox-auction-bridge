/**
 * MODUL EKSTERNAL: KELOLA JADWAL LELANG & WAKTU OTOMATIS
 * Dioperasikan secara otonom di balik layar (AGI & AI Guardian Core)
 */

let auctionScheduleState = { mode: "scheduled", startDate: "2026-11-01", startHour: "00:00", durationHours: 24 };
let isAuctionCurrentlyOpen = true;
let currentAuctionStatusCode = 3;

const _AuctionTimeGuardian = {
  formatCountdown: function(totalSeconds) {
    if (totalSeconds <= 0) return "00:00:00";
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
};

async function fetchAndListenAuctionSchedule(supabaseClient, callbackUpdate) {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from('app_settings')
      .select('value')
      .eq('key', 'auction_schedule')
      .maybeSingle();
      
    if (error) throw error;
    if (data && data.value) {
      auctionScheduleState = data.value;
      if (typeof callbackUpdate === 'function') callbackUpdate(auctionScheduleState);
    }
  } catch (e) {}

  try {
    supabaseClient
      .channel('public-cluster-schedule-settings')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.auction_schedule' }, 
        (payload) => {
          if (payload.new && payload.new.value) {
            auctionScheduleState = payload.new.value;
            if (typeof callbackUpdate === 'function') callbackUpdate(auctionScheduleState);
          }
        }
      )
      .subscribe();
  } catch (e) {}
}

function checkAuctionScheduleUI() {
  const infoText = document.getElementById('auctionInfoText');
  const badge = document.getElementById('sessionStateBadge');
  if (!infoText || !badge) return;

  const mode = auctionScheduleState.mode || 'scheduled';

  if (mode === 'instant_one_hour') {
    const instantStart = auctionScheduleState.instantTimestamp || new Date(`${auctionScheduleState.startDate}T${auctionScheduleState.startHour}:00`).getTime();
    const durationMs = 60 * 60 * 1000;
    const endTime = instantStart + durationMs;
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })).getTime();

    infoText.innerText = `Mode Instan: Aktif 1 Jam (Tutup otomatis)`;

    if (now <= endTime) {
      isAuctionCurrentlyOpen = true;
      currentAuctionStatusCode = 3;
      const diffSec = Math.max(0, Math.floor((endTime - now) / 1000));
      badge.innerText = `🔥 LELANG INSTAN: ${_AuctionTimeGuardian.formatCountdown(diffSec)}`;
      badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md animate-pulse tracking-wider";
    } else {
      isAuctionCurrentlyOpen = false;
      currentAuctionStatusCode = 4;
      badge.innerText = `🏁 LELANG SELESAI (00:00:00)`;
      badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/50 shadow-md tracking-wider";
    }
    return;
  }

  if (mode === 'scheduled') {
    if (auctionScheduleState.startDate && auctionScheduleState.startHour) {
      infoText.innerText = `Buka: ${auctionScheduleState.startDate} ${auctionScheduleState.startHour} WIB (Sesi 1 Jam)`;
      
      const nowWib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const startTime = new Date(`${auctionScheduleState.startDate}T${auctionScheduleState.startHour}:00`).getTime();
      const durationHours = parseInt(auctionScheduleState.durationHours, 10) || 1;
      const endTime = startTime + (durationHours * 60 * 60 * 1000);
      const preOpenTime = startTime - (60 * 60 * 1000); 
      const now = nowWib.getTime();

      if (now < preOpenTime) {
        isAuctionCurrentlyOpen = false;
        currentAuctionStatusCode = 1;
        badge.innerText = "⏳ MENUNGGU JADWAL (00:00:00)";
        badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-gray-800 text-gray-400 border border-gray-700 shadow-md tracking-wider";
      } else if (now >= preOpenTime && now < startTime) {
        isAuctionCurrentlyOpen = false;
        currentAuctionStatusCode = 2;
        const diffSec = Math.max(0, Math.floor((startTime - now) / 1000));
        badge.innerText = `⏱️ BUKA DALAM: ${_AuctionTimeGuardian.formatCountdown(diffSec)}`;
        badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-md animate-pulse tracking-wider";
      } else if (now >= startTime && now <= endTime) {
        isAuctionCurrentlyOpen = true;
        currentAuctionStatusCode = 3;
        const diffSec = Math.max(0, Math.floor((endTime - now) / 1000));
        badge.innerText = `🔥 BERLANGSUNG: ${_AuctionTimeGuardian.formatCountdown(diffSec)}`;
        badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-md animate-pulse tracking-wider";
      } else {
        isAuctionCurrentlyOpen = false;
        currentAuctionStatusCode = 4;
        badge.innerText = `🏁 SESI TUTUP (00:00:00)`;
        badge.className = "text-xs sm:text-sm font-black px-3 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/50 shadow-md tracking-wider";
      }
    }
  }
}

function populateHourDropdownOptions() {
  const hourSelect = document.getElementById('scheduleStartHourSelect');
  if (!hourSelect) return;
  let html = '';
  for (let h = 0; h < 24; h++) {
    const hStr = h.toString().padStart(2, '0') + ':00';
    html += `<option value="${hStr}">${hStr} WIB</option>`;
  }
  hourSelect.innerHTML = html;
}

function toggleScheduleInputVisibility() {
  const mode = document.getElementById('scheduleModeSelect').value;
  const container = document.getElementById('scheduledInputsContainer');
  const instantContainer = document.getElementById('instantTriggerContainer');

  if (mode === 'scheduled') {
    container.classList.remove('hidden');
    if (instantContainer) instantContainer.classList.add('hidden');
  } else if (mode === 'instant_one_hour') {
    container.classList.add('hidden');
    if (instantContainer) instantContainer.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
    if (instantContainer) instantContainer.classList.add('hidden');
  }
}

async function saveAuctionScheduleSettings(supabaseClient, adminUsernames, currentUser) {
  if (!currentUser || !adminUsernames.includes(currentUser)) {
    alert("Akses Ditolak: Hanya Admin dan Developer!");
    return;
  }

  const mode = document.getElementById('scheduleModeSelect').value;
  const y = document.getElementById('schedYear')?.value || '2026';
  const m = (document.getElementById('schedMonth')?.value || '11').padStart(2, '0');
  const d = (document.getElementById('schedDay')?.value || '01').padStart(2, '0');
  const startDate = `${y}-${m}-${d}`;
  const startHour = document.getElementById('scheduleStartHourSelect').value;
  const durationHours = parseInt(document.getElementById('scheduleDurationSelect').value, 10) || 24;

  const newSchedule = { mode, startDate, startHour, durationHours };
  if (!supabaseClient) return;

  try {
    const { error } = await supabaseClient
      .from('app_settings')
      .upsert([{ key: 'auction_schedule', value: newSchedule, updated_at: new Date().toISOString() }], { onConflict: 'key' });

    if (error) throw error;
    auctionScheduleState = newSchedule;
    checkAuctionScheduleUI();
    alert("✅ Jadwal Berhasil Tersimpan Permanen di Database Supabase!");
    document.getElementById('scheduleModal').classList.add('hidden');
  } catch (err) {
    alert("Gagal menyimpan jadwal: " + err.message);
  }
}

async function triggerInstantOneHourAuction(supabaseClient, adminUsernames, currentUser) {
  if (!currentUser || !adminUsernames.includes(currentUser)) {
    alert("Akses Ditolak: Hanya Admin dan Developer!");
    return;
  }

  const nowWib = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const y = nowWib.getFullYear();
  const m = String(nowWib.getMonth() + 1).padStart(2, '0');
  const d = String(nowWib.getDate()).padStart(2, '0');
  const h = String(nowWib.getHours()).padStart(2, '0');
  const min = String(nowWib.getMinutes()).padStart(2, '0');

  const newSchedule = {
    mode: 'instant_one_hour',
    startDate: `${y}-${m}-${d}`,
    startHour: `${h}:${min}`,
    durationHours: 1,
    instantTimestamp: nowWib.getTime()
  };

  if (!supabaseClient) return;
  try {
    const { error } = await supabaseClient
      .from('app_settings')
      .upsert([{ key: 'auction_schedule', value: newSchedule, updated_at: new Date().toISOString() }], { onConflict: 'key' });

    if (error) throw error;
    auctionScheduleState = newSchedule;
    checkAuctionScheduleUI();
    alert("🚀 Berhasil! Lelang langsung dibuka sekarang untuk durasi tepat 1 jam ke depan.");
    document.getElementById('scheduleModal').classList.add('hidden');
  } catch (err) {
    alert("Gagal mengaktifkan lelang instan: " + err.message);
  }
}
