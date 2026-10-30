/**
 * certificate.js - Real-time Data Binding & Layout Controller for NFT-GM Certificate
 */

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');

    const SUPABASE_URL = "https://lgxvdqveblueuadocimv.supabase.co"; 
    const SUPABASE_ANON_KEY = "sb_publishable_TBKKXJkwiqMmAYJKqAdwgw__nqQA8xJ";
    let supabaseClient = null;

    try {
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error("Supabase Init Error:", e);
    }

    function updateUI(data) {
        const shortId = data.id ? data.id.substring(0, 6).toUpperCase() : 'DEMO';
        
        const refElem = document.getElementById("ref-number");
        const assetElem = document.getElementById("asset-name");
        const txElem = document.getElementById("tx-id");
        const onchainElem = document.getElementById("onchain-time");
        const priceElem = document.getElementById("closing-price");
        const closingElem = document.getElementById("closing-time");
        const sellerElem = document.getElementById("seller-username");
        const winnerElem = document.getElementById("winner-username");
        const statusMsg = document.getElementById("statusMessage");

        if (refElem) refElem.textContent = `NFT-GM/AUC-CERT/2026/10/${shortId}`;
        if (assetElem) assetElem.textContent = data.title || 'Nusantara NFT Asset';
        if (txElem) txElem.textContent = data.hash || '-';
        
        const formattedTime = data.created_at ? data.created_at.replace('T', ' ').substring(0, 19) + ' UTC' : '-';
        if (onchainElem) onchainElem.textContent = formattedTime;
        if (closingElem) closingElem.textContent = formattedTime;

        if (priceElem) priceElem.textContent = `${data.highest_bid || data.reserve_price || '0'} Pi`;
        
        const seller = data.seller || 'seller_official';
        if (sellerElem) sellerElem.textContent = seller.startsWith('@') ? seller : '@' + seller;

        const winner = data.highest_bidder || data.winner || 'Pioneer';
        if (winnerElem) winnerElem.textContent = winner.startsWith('@') ? winner : '@' + winner;

        // Binding gambar logo kiri dan kanan sesuai model terbaru
        const logoLeft = document.getElementById('cert-logo-left');
        if (logoLeft && data.image_url) logoLeft.src = data.image_url;

        const logoRight = document.getElementById('cert-logo-right');
        if (logoRight && data.extra_image_url) logoRight.src = data.extra_image_url;

        if (statusMsg) {
            statusMsg.innerText = "✅ Real-Time Terhubung & Siap!";
            statusMsg.style.color = "#34d399";
        }
    }

    if (!assetId) {
        // Fallback Data Demo jika dibuka tanpa ID
        updateUI({
            id: 'demo1234',
            title: 'Nusantara Genesis Badge #042',
            hash: 'GCEWHV40TYKTQJ7Q2J6DLDULE2FQNCFECJ56JBS3FEFOBS6IW657E6A',
            created_at: '2026-10-30T15:37:02',
            highest_bid: '314.159',
            seller: 's9t9munah',
            highest_bidder: 'Pioneer',
            image_url: 'https://i.ibb.co/3W83s0M/pi-logo.png',
            extra_image_url: 'https://i.ibb.co/3W83s0M/pi-logo.png'
        });
        const statusMsg = document.getElementById("statusMessage");
        if (statusMsg) {
            statusMsg.innerText = "ℹ️ Mode Demo (ID tidak ada di URL)";
            statusMsg.style.color = "#60a5fa";
        }
        return;
    }

    if (!supabaseClient) {
        const statusMsg = document.getElementById("statusMessage");
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

        window.currentAuctionData = data;
        updateUI(data);

        // Real-time listener Supabase
        supabaseClient
            .channel('cert-sync-' + assetId)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'auctions',
                filter: `id=eq.${assetId}` 
            }, (payload) => {
                window.currentAuctionData = payload.new;
                updateUI(payload.new);
            })
            .subscribe();

    } catch (err) {
        const statusMsg = document.getElementById("statusMessage");
        if (statusMsg) statusMsg.innerText = "❌ " + err.message;
    }
});

function shareWhatsApp() {
    const data = window.currentAuctionData || {};
    const fileId = data.id ? data.id.substring(0, 6).toUpperCase() : 'DEMO';
    const assetTitle = data.title || 'Nusantara NFT';
    const winnerName = data.highest_bidder || data.winner || 'Pioneer';
    const currentUrl = window.location.href;

    const shareText = `📜 *Sertifikat Resmi NFT-GM*\n🔹 Aset: ${assetTitle}\n🔹 Pemenang: @${winnerName.replace('@','')}\n🔹 Ref ID: ${fileId}\n\n🔗 *Link Sertifikat Resmi:* \n${currentUrl}`;
    
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
}
