/
​certificate.js - Real-time Certificate Data Binding & Logic
​Nusantara NFT Auction / NFT Global Market (NFT-GM)
*/
​document.addEventListener("DOMContentLoaded", () => {
loadRealtimeCertificateData();
});
​function loadRealtimeCertificateData() {
try {
// Retrieve real-time asset & auction data from localStorage or URL query parameters safely
const urlParams = new URLSearchParams(window.location.search);
const storageData = localStorage.getItem('nft_auction_certificate_data');
​let certData = {};
​if (storageData) {
certData = JSON.parse(storageData);
}
​// Map real-time data or fallback to default sample values with high precision
const refNo = urlParams.get('ref') || certData.refNo || NFT-GM/AUC-CERT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)};
const assetName = urlParams.get('asset') || certData.assetName || "PiBox Genesis Badge #042";
const txId = urlParams.get('txid') || certData.txId || "0x8f2a4c9e7b1a03d...5629";
const onChainTime = urlParams.get('onchain_time') || certData.onChainTime || formatCurrentDateTime();
const closingPrice = urlParams.get('price') || certData.closingPrice || "314.159 Pi";
const closingTime = urlParams.get('closing_time') || certData.closingTime || formatCurrentDateTime();
const sellerUsername = urlParams.get('seller') || certData.sellerUsername || "@seller_pibox_official";
const winnerUsername = urlParams.get('winner') || certData.winnerUsername || "@pioneer_winner_2026";
​// DOM Element Injection with precise high accuracy
document.getElementById("certRefNo").textContent = refNo;
document.getElementById("assetName").textContent = assetName;
document.getElementById("txId").textContent = txId;
document.getElementById("onChainTime").textContent = onChainTime;
document.getElementById("closingPrice").textContent = closingPrice;
document.getElementById("closingTime").textContent = closingTime;
document.getElementById("sellerUsername").textContent = sellerUsername;
document.getElementById("winnerUsername").textContent = winnerUsername;
​} catch (error) {
console.error("Error loading real-time certificate data:", error);
fallbackDefaultData();
}
}
​function formatCurrentDateTime() {
const now = new Date();
const options = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
return now.toLocaleDateString('en-GB', options) + " WIB";
}
​function fallbackDefaultData() {
document.getElementById("certRefNo").textContent = "NFT-GM/AUC-CERT/2026/10/8821";
document.getElementById("assetName").textContent = "PiBox Genesis Badge #042";
document.getElementById("txId").textContent = "0x8f2a4c9e7b1a03d...5629";
document.getElementById("onChainTime").textContent = "24 September 2026 - 20:55:45 WIB";
document.getElementById("closingPrice").textContent = "314.159 Pi";
document.getElementById("closingTime").textContent = "24 September 2026 - 20:55:45 WIB";
document.getElementById("sellerUsername").textContent = "@seller_pibox_official";
document.getElementById("winnerUsername").textContent = "@pioneer_winner_2026";
}
