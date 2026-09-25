/**
 * Modul Generator Sertifikat Elektronik GCP2E (Format Resmi Portrait)
 * Menggunakan Data URL Base64 untuk Stempel & Tanda Tangan Asli
 */
const GCP2ECertificateModule = (function() {
    
    // Data Base64 gambar stempel & tanda tangan asli
    const SEAL_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QBaRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAARAAAATgAAAAAAAABIAAAAAQAAAEgAAAABPHBfaWNvbl9maWxlX25hbWU9MTc5MDI1MjcxNTk3NS5qcGc=";

    function sanitize(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    function render(canvas, auctionData) {
        const ctx = canvas.getContext('2d');
        
        // Ukuran Resolusi Tinggi Sertifikat Portret (850 x 1200)
        canvas.width = 850;
        canvas.height = 1200;

        // 1. Latar Belakang Putih Bersih dengan Bingkai Ganda
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 850, 1200);

        // Bingkai Luar & Dalam
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 6;
        ctx.strokeRect(30, 30, 790, 1140);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(42, 42, 766, 1116);

        // 2. Header Organisasi
        ctx.textAlign = 'center';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('GLOBAL COMMUNITY PLAY TO EARN', 425, 95);
        ctx.fillText('(GCP2E)', 425, 125);

        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.fillText('Official Certificate & Official Auction Winner Proof', 425, 155);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(150, 175);
        ctx.lineTo(700, 175);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('ELECTRONIC CERTIFICATE', 425, 215);

        // Nomor Referensi Dinamis
        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        const refCode = `Ref: GCP2E/AUC-CERT/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${auctionData.id ? auctionData.id.substring(0,4) : '8821'}`;
        ctx.fillText(refCode.toUpperCase(), 425, 240);

        // Paragraf Pengantar
        ctx.textAlign = 'left';
        ctx.fillStyle = '#334155';
        ctx.font = '13px sans-serif';
        ctx.fillText('It is hereby legally declared and integrated into the PiBox Auction Bridge automated auction', 70, 280);
        ctx.fillText('system, that the electronic auction transaction for the asset below has been officially closed and', 70, 300);
        ctx.fillText('its ownership transferred:', 70, 320);

        // 3. Kotak Bagian I: AUCTIONED ASSET DETAILS
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('I. AUCTIONED ASSET DETAILS', 70, 360);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(70, 375, 710, 160, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        
        ctx.fillText('Asset Name / NFT', 100, 410);
        ctx.fillText(':', 240, 410);
        ctx.fillStyle = '#0f172a';
        ctx.font = '13px sans-serif';
        ctx.fillText(sanitize(auctionData.title) || 'Nusantara NFT Asset', 260, 410);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Transaction ID (TxID)', 100, 445);
        ctx.fillText(':', 240, 445);
        ctx.fillStyle = '#2563eb';
        ctx.font = '12px monospace';
        ctx.fillText(sanitize(auctionData.hash) || 'GCVJ2EXX...', 260, 445);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Auction Closing Price', 100, 480);
        ctx.fillText(':', 240, 480);
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`${auctionData.highest_bid || auctionData.reserve_price} Pi`, 260, 480);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Auction Closing Time', 100, 515);
        ctx.fillText(':', 240, 515);
        ctx.fillStyle = '#0f172a';
        ctx.font = '13px sans-serif';
        const closeTime = auctionData.closing_time || new Date().toUTCString();
        ctx.fillText(closeTime, 260, 515);

        // 4. Kotak Bagian II: SELLER & AUCTION WINNER IDENTITIES
        ctx.font = 'bold 14px sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText('II. SELLER & AUCTION WINNER IDENTITIES', 70, 570);

        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(70, 585, 710, 185, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        
        ctx.fillText('Seller Username', 100, 620);
        ctx.fillText(':', 240, 620);
        ctx.fillStyle = '#0f172a';
        ctx.font = '13px sans-serif';
        ctx.fillText(`@${sanitize(auctionData.seller) || 'seller_account'}`, 260, 620);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Seller Wallet', 100, 655);
        ctx.fillText(':', 240, 655);
        ctx.fillStyle = '#475569';
        ctx.font = '12px monospace';
        ctx.fillText(sanitize(auctionData.seller_wallet) || 'GD7X...PBOX', 260, 655);

        // Garis Pemisah Seller & Winner
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(90, 675);
        ctx.lineTo(760, 675);
        ctx.stroke();

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Winner Username', 100, 710);
        ctx.fillText(':', 240, 710);
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`@${sanitize(auctionData.highest_bidder) || 'winner_account'}`, 260, 710);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText('Winner Wallet', 100, 745);
        ctx.fillText(':', 240, 745);
        ctx.fillStyle = '#475569';
        ctx.font = '12px monospace';
        ctx.fillText(sanitize(auctionData.winner_wallet) || 'GA3K...PBOX', 260, 745);

        // 5. Bagian Tanda Tangan & Stempel Asli
        ctx.textAlign = 'right';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Issued & Validated By:', 740, 810);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('Head of GCP2E', 740, 828);

        // Memuat Gambar Stempel & Tanda Tangan Base64
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.onload = function() {
            // Posisi stempel di kanan bawah
            ctx.drawImage(sealImg, 490, 840, 260, 180);

            // Teks Bawah Stempel
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('Global Community Play To Earn', 620, 1038);
            ctx.font = '10px sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('Official Seal - Est. 2026', 620, 1052);
        };
        sealImg.src = SEAL_BASE64;

        // Keterangan Kiri (PiBox System Verification)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('Verified by Automation System', 110, 930);
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('PIBox Auction Engine', 110, 946);

        ctx.fillStyle = '#047857';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('SYSTEM VERIFIED', 110, 995);
        ctx.fillStyle = '#334155';
        ctx.font = '10px sans-serif';
        ctx.fillText('Smart Contract Executed', 110, 1010);

        // 6. Catatan Kaki Bawah
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(70, 1080);
        ctx.lineTo(780, 1080);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = '#475569';
        ctx.font = 'italic 11px sans-serif';
        ctx.fillText('This electronic certificate is issued automatically by the GCP2E and PiBox Auction Bridge system as', 425, 1105);
        ctx.fillText('proof of ownership and valid transaction within the Pi Network ecosystem.', 425, 1122);
    }

    return {
        generate: function(canvasId, auctionData, modalId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !auctionData) return;
            render(canvas, auctionData);
            if (modalId) {
                document.getElementById(modalId).classList.remove('hidden');
            }
        },
        download: function(canvasId, auctionData) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            const link = document.createElement('a');
            link.download = `GCP2E_Certificate_${auctionData ? auctionData.id.substring(0,6) : 'NFT'}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 1.0);
            link.click();
        }
    };
})();
