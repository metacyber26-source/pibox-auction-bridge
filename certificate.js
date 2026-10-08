// certificate.js - Skrip Dinamis Sertifikat Kepemilikan NFT-GM
document.addEventListener("DOMContentLoaded", async () => {
    // Ambil parameter dari URL (Contoh: certificate.html?id=123&winner=Dev&hash=0xABC...)
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');
    const customWinner = urlParams.get('winner');
    const customTitle = urlParams.get('title');
    const customHash = urlParams.get('hash');
    const customTime = urlParams.get('time');

    // Tangkap elemen target di HTML
    const winnerEl = document.getElementById('winnerUsername');
    const assetEl = document.getElementById('assetTitle');
    const hashEl = document.getElementById('contractHash');
    const timeEl = document.getElementById('onChainTime');
    const closingEl = document.getElementById('closingTime');
    const certNoEl = document.getElementById('certNo');

    // Isi data secara dinamis dari URL atau berikan nilai default terverifikasi
    if (winnerEl) winnerEl.textContent = customWinner || "Kolektor Terverifikasi (Dev)";
    if (assetEl) assetEl.textContent = customTitle || "Aset Budaya Nusantara (Verified)";
    if (hashEl) hashEl.textContent = customHash || "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    const nowFormatted = new Date().toISOString().replace('T', ' ').substring(0, 16) + " UTC";
    if (timeEl) timeEl.textContent = customTime || nowFormatted;
    if (closingEl) closingEl.textContent = nowFormatted;
    
    if (certNoEl && assetId) {
        certNoEl.textContent = `NFT-GM-2026-${assetId.padStart(4, '0')}`;
    }
});
