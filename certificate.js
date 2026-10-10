// certificate.js - Sinkronisasi Data Sertifikat NFT-GM
document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');
    const customWinner = urlParams.get('winner');
    const customTitle = urlParams.get('title');
    const customHash = urlParams.get('hash');
    const customTime = urlParams.get('time');

    // Tangkap elemen di certificate.html
    const winnerEl = document.getElementById('winnerUsername');
    const assetEl = document.getElementById('assetTitle');
    const hashEl = document.getElementById('contractHash');
    const timeEl = document.getElementById('onChainTime');
    const closingEl = document.getElementById('closingTime');
    const certNoEl = document.getElementById('certNo');

    // Set data dinamis
    if (winnerEl) winnerEl.textContent = customWinner || "Kolektor Terverifikasi (Dev)";
    if (assetEl) assetEl.textContent = customTitle || "Aset Budaya Nusantara (Verified)";
    if (hashEl) hashEl.textContent = customHash || "0x659fdf82932eb943553c38b77533322f59a3bbe";
    
    const nowFormatted = "2026-10-10 03:51 UTC";
    if (timeEl) timeEl.textContent = customTime || nowFormatted;
    if (closingEl) closingEl.textContent = nowFormatted;
    
    if (certNoEl) {
        certNoEl.textContent = `NFT-GM-2026-${assetId ? assetId.padStart(4, '0') : '0001'}`;
    }
});
