// certificate.js - Mengisi Data Sertifikat Real-Time
document.addEventListener("DOMContentLoaded", async () => {
    // Ambil parameter dari URL (Contoh: certificate.html?id=123&title=...&seller=...&winner=...&price=...&hash=...)
    const urlParams = new URLSearchParams(window.location.search);
    
    const assetId = urlParams.get('id');
    const customTitle = urlParams.get('title');
    const customHash = urlParams.get('hash');
    const customPrice = urlParams.get('price');
    const customSeller = urlParams.get('seller');
    const customWinner = urlParams.get('winner');
    const customTime = urlParams.get('time');

    // Tangkap Elemen DOM
    const refNoEl = document.getElementById('refNo');
    const assetTitleEl = document.getElementById('assetTitle');
    const txHashEl = document.getElementById('txHash');
    const onChainTimeEl = document.getElementById('onChainTime');
    const closingPriceEl = document.getElementById('closingPrice');
    const closingTimeEl = document.getElementById('closingTime');
    const sellerUsernameEl = document.getElementById('sellerUsername');
    const winnerUsernameEl = document.getElementById('winnerUsername');

    // Waktu Real-Time Sekarang
    const nowUtc = new Date().toISOString().replace('T', ' ').substring(0, 19) + " UTC";

    // Isi Data Secara Real-Time
    if (refNoEl) {
        const certId = assetId ? assetId.toString().substring(0, 6).toUpperCase() : '8821';
        refNoEl.textContent = `NFT-GM/AUC-CERT/2026/10/${certId}`;
    }

    if (assetTitleEl) assetTitleEl.textContent = customTitle || "PiBox Genesis Badge #042";
    if (txHashEl) txHashEl.textContent = customHash || "0x8f2a4c9e7b1a03d5629f12048573194729105629";
    if (onChainTimeEl) onChainTimeEl.textContent = customTime || "10 October 2026 - 03:51:00 UTC";
    if (closingPriceEl) closingPriceEl.textContent = customPrice ? `${customPrice} Pi` : "314.159 Pi";
    if (closingTimeEl) closingTimeEl.textContent = customTime || nowUtc;

    if (sellerUsernameEl) {
        const formattedSeller = customSeller ? (customSeller.startsWith('@') ? customSeller : `@${customSeller}`) : "@seller_pibox_official";
        sellerUsernameEl.textContent = formattedSeller;
    }

    if (winnerUsernameEl) {
        const formattedWinner = customWinner ? (customWinner.startsWith('@') ? customWinner : `@${customWinner}`) : "@pioneer_winner_2026";
        winnerUsernameEl.textContent = formattedWinner;
    }
});
