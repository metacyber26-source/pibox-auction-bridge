/**
 * certificate.js - Real-time Data Binding for NFT-GM Certificate
 * Mengambil data secara real-time agar tidak salah aset.
 */

document.addEventListener("DOMContentLoaded", () => {
    // Mengambil data dari localStorage atau URL Query Parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    // Data Default / Cadangan jika belum ada parameter live
    const defaultData = {
        refNumber: "NFT-GM/AUC-CERT/" + new Date().getFullYear() + "/08821",
        assetName: urlParams.get('asset') || localStorage.getItem('nft_active_asset') || "PiBox Genesis Badge #042",
        txId: urlParams.get('txid') || localStorage.getItem('nft_active_txid') || "0x8f2a4c9e7b1a03d...5629",
        onchainTime: urlParams.get('onchain') || localStorage.getItem('nft_active_onchain') || new Date().toLocaleString(),
        closingPrice: urlParams.get('price') || localStorage.getItem('nft_active_price') || "314.159 Pi",
        closingTime: urlParams.get('closing') || localStorage.getItem('nft_active_closing') || new Date().toLocaleString() + " WIB",
        sellerUsername: urlParams.get('seller') || localStorage.getItem('nft_active_seller') || "@seller_pibox_official",
        winnerUsername: urlParams.get('winner') || localStorage.getItem('nft_active_winner') || "@pioneer_winner_2026"
    };

    // Binding elemen DOM secara presisi
    const refElem = document.getElementById("ref-number");
    const assetElem = document.getElementById("asset-name");
    const txElem = document.getElementById("tx-id");
    const onchainElem = document.getElementById("onchain-time");
    const priceElem = document.getElementById("closing-price");
    const closingElem = document.getElementById("closing-time");
    const sellerElem = document.getElementById("seller-username");
    const winnerElem = document.getElementById("winner-username");

    if (refElem) refElem.textContent = defaultData.refNumber;
    if (assetElem) assetElem.textContent = defaultData.assetName;
    if (txElem) txElem.textContent = defaultData.txId;
    if (onchainElem) onchainElem.textContent = defaultData.onchainTime;
    if (priceElem) priceElem.textContent = defaultData.closingPrice;
    if (closingElem) closingElem.textContent = defaultData.closingTime;
    if (sellerElem) sellerElem.textContent = defaultData.sellerUsername;
    if (winnerElem) winnerElem.textContent = defaultData.winnerUsername;
});
