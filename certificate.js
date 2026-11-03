/**
 * certificate.js - Real-time Data Binding & Layout Controller for NFT-GM Certificate
 */

window.currentAuctionData = null;

document.addEventListener("DOMContentLoaded", async () => {
    const statusMsg = document.getElementById('statusMessage');
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');

    // Inisialisasi Kunci Supabase
    const SUPABASE_URL = "https://lgxvdqveblueuadocimv.supabase.co"; 
    const SUPABASE_ANON_KEY = "sb_publishable_TBKKXJkwiqMmAYJKqAdwgw__nqQA8xJ";
    let supabaseClient = null;

    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        if (statusMsg) {
            statusMsg.innerText = "❌ Library Supabase Tidak Terbaca";
            statusMsg.style.color = "#f87171";
        }
        return;
    }

    function updateCertificateUI(data) {
        window.currentAuctionData = data;
        const shortId = data.id ? data.id.substring(0, 6).toUpperCase() : 'NFT-GM';
        
        const refElem = document.getElementById('ref-number');
        const assetElem = document.getElementById('asset-name');
        const txElem = document.getElementById('tx-id');
        const onchainElem = document.getElementById('onchain-time');
        const priceElem = document.getElementById('closing-price');
        const closingElem = document.getElementById('closing-time');
        const sellerElem = document.getElementById('seller-username');
        const winnerElem = document.getElementById('winner-username');
        const ssUtama = document.getElementById('ss-utama-img');
        const ssTambahan = document.getElementById('ss-tambahan-img');

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

        if (ssUtama && data.image_url) {
            ssUtama.src = data.image_url;
        }
        if (ssTambahan && (data.extra_image_url || data.extra_ss_url)) {
            ssTambahan.src = data.extra_image_url || data.extra_ss_url;
        }
    }

    async function loadCertificateData() {
        if (!supabaseClient) {
            if (statusMsg) {
                statusMsg.innerText = "❌ Gagal terhubung ke Database.";
                statusMsg.style.color = "#f87171";
            }
            return;
        }

        try {
            let query = supabaseClient.from('auctions').select('*');
            
            if (assetId) {
                query = query.eq('id', assetId);
            } else {
                query = query.order('created_at', { ascending: false }).limit(1);
            }

            const { data, error } = await query;

            if (error) throw error;
            
            const auctionItem = Array.isArray(data) ? data[0] : data;
            if (!auctionItem) throw new Error("Data lelang kosong di database.");

            updateCertificateUI(auctionItem);

            if (statusMsg) {
                statusMsg.innerText = "✅ Real-Time Terhubung & Siap!";
                statusMsg.style.color = "#34d399";
            }

            if (auctionItem.id) {
                supabaseClient
                    .channel('cert-sync-' + auctionItem.id)
                    .on('postgres_changes', { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'auctions',
                        filter: `id=eq.${auctionItem.id}` 
                    }, (payload) => {
                        updateCertificateUI(payload.new);
                    })
                    .subscribe();
            }

        } catch (err) {
            if (statusMsg) {
                statusMsg.innerText = "❌ Error: " + err.message;
                statusMsg.style.color = "#f87171";
            }
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
