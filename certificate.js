// Fungsi utama untuk memuat data sertifikat ke elemen HTML
function loadCertificateData(data) {
    const certNoEl = document.getElementById('certNo');
    const winnerEl = document.getElementById('winnerUsername');
    const assetTitleEl = document.getElementById('assetTitle');
    const contractHashEl = document.getElementById('contractHash');
    const onChainTimeEl = document.getElementById('onChainTime');
    const closingTimeEl = document.getElementById('closingTime');

    if (certNoEl) certNoEl.innerText = data.certificateNumber || 'NFT-GM-2026-0001';
    if (winnerEl) winnerEl.innerText = data.username || 'Anonymous';
    if (assetTitleEl) assetTitleEl.innerText = data.assetTitle || 'Unknown Asset';
    if (contractHashEl) contractHashEl.innerText = data.contractHash || '0x...';
    if (onChainTimeEl) onChainTimeEl.innerText = data.onChainTime || new Date().toUTCString();
    if (closingTimeEl) closingTimeEl.innerText = data.closingTime || '-';
}

// Simulasi pengambilan data on-time saat halaman dimuat
window.addEventListener('DOMContentLoaded', () => {
    // Data ini dapat diganti/disesuaikan dengan parameter URL atau hasil Fetch dari database Anda
    const sampleData = {
        certificateNumber: "NFT-GM-2026-0889",
        username: "Muhammadefendi123",
        assetTitle: "Gamelan Kyai Slamet - Metaverse Edition #01",
        contractHash: "0x71C83a9B2104fE5832a87b64219b2f3A8912C0ff",
        onChainTime: "30 / 09 / 2026 -- 17:01 UTC",
        closingTime: "30 / 09 / 2026 -- 16:45 UTC"
    };

    loadCertificateData(sampleData);
});
