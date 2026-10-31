/**
 * certificate.js - Real-time Data Binding & Layout Controller for NFT-GM Certificate
 */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');

    const SUPABASE_URL = "https://lgxvdqveblueuadocimv.supabase.co"; 
    const SUPABASE_ANON_KEY = "sb_publishable_TBKKXJkwiqMmAYJKqAdwgw__nqQA8xJ";
    let supabaseClient = null;
    let currentAuctionData = null;

    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error("Supabase Init Error:", e);
    }

    function updateCertificateUI(data) {
        const shortId = data.id ? data.id.substring(0, 6).toUpperCase() : 'NFT-GM';
        
        const refElem = document.getElementById('ref-number');
        const assetElem = document.getElementById('asset-name');
        const txElem = document.getElementById('tx-id');
        const onchainElem = document.getElementById('onchain-time');
        const priceElem = document.getElementById('closing-price');
        const closingElem = document.getElementById('closing-time');
        const sellerElem = document.getElementById('seller-username');
        const winnerElem = document.getElementById('winner-username');

        if (refElem) refElem.innerText = `NFT-GM/AUC-CERT/2026/10/${shortId}`;
        if (assetElem) assetElem.innerText = data.title || 'Nusantara NFT Asset';
        if (txElem) txElem.innerText = data.hash || '-';
        
        const formattedTime = data.created_at ? data.created_at.replace('T', ' ').substring(0, 19) + ' UTC' : '-';
        if (onchainElem) onchainElem.innerText = formattedTime;
        if (closingElem) closingElem.innerText = formattedTime;

        if (priceElem) priceElem.innerText = `${data.highest_bid || data.reserve_price || '0'} Pi`;
        
        const seller = data.seller || 'seller_official';
        if (sellerElem) sellerElem.innerText = seller.startsWith('@') ? seller : '@' + seller;

        const winner = data.highest_bidder || data.winner || 'Pioneer';
        if (winnerElem) winnerElem.innerText = winner.startsWith('@') ? winner : '@' + winner;
    }

    async function loadCertificateData() {
        const statusMsg = document.getElementById('statusMessage');

        if (!assetId) {
            if (statusMsg) statusMsg.innerText = "❌ ID Aset tidak ditemukan di URL.";
            return;
        }

        if (!supabaseClient) {
            if (statusMsg) statusMsg.innerText = "❌ Gagal terhubung ke Database.";
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('auctions')
                .select('*')
                .eq('id', assetId)
                .single();

            if (error || !data) throw new Error("Data lelang tidak ditemukan.");

            currentAuctionData = data;
            updateCertificateUI(data);

            if (statusMsg) {
                statusMsg.innerText = "✅ Real-Time Terhubung & Siap!";
                statusMsg.style.color = "#34d399";
            }

            supabaseClient
                .channel('cert-sync-' + assetId)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'auctions',
                    filter: `id=eq.${assetId}` 
                }, (payload) => {
                    currentAuctionData = payload.new;
                    updateCertificateUI(payload.new);
                })
                .subscribe();

        } catch (err) {
            if (statusMsg) statusMsg.innerText = "❌ Error: " + err.message;
        }
    }

    loadCertificateData();
});

function shareWhatsApp() {
    const data = window.currentAuctionData || {};
    const fileId = data.id ? data.id.substring(0, 6).toUpperCase() : 'NFT-GM';
    const assetTitle = data.title || 'Nusantara NFT';
    const winnerName = data.highest_bidder || data.winner || 'Pioneer';
    const currentUrl = window.location.href;

    const shareText = `📜 *Sertifikat Resmi NFT-GM*\n🔹 Aset: ${assetTitle}\n🔹 Pemenang: @${winnerName.replace('@','')}\n🔹 Ref ID: ${fileId}\n\n🔗 *Link Sertifikat Resmi:* \n${currentUrl}`;
    
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
}
