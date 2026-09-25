/**
 * Modul Generator Sertifikat Elektronik GCP2E (Tema Putih Formal & Elegan)
 * Menjamin stempel dan tanda tangan tampil sangat jelas, tajam, dan kontras.
 */
const GCP2ECertificateModule = (function() {
    
    // Nama file stempel dan tanda tangan di GitHub
    const SEAL_SIGN_URL = "1790326586371.jpg";

    function sanitize(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    function render(canvas, auctionData) {
        const ctx = canvas.getContext('2d');
        
        // Ukuran Resolusi Tinggi Sertifikat Landscape (1200 x 850)
        canvas.width = 1200;
        canvas.height = 850;

        // 1. Background Putih Bersih Formal
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 850);

        // Pattern / Watermark tipis di latar belakang
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(25, 25, 1150, 800);

        // Bingkai Klasik Luar (Navy Mewah)
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 8;
        ctx.strokeRect(35, 35, 1130, 780);

        // Bingkai Dalam Tipis (Emas)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 1104, 754);

        // 2. Header Organisasi
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('GLOBAL COMMUNITY PLAY TO EARN (GCP2E)', 600, 105);

        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.fillText('OFFICIAL ELECTRONIC AUCTION CERTIFICATE', 600, 130);

        // Judul Utama Sertifikat
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 34px serif';
        ctx.fillText('CERTIFICATE OF OWNERSHIP & AUTHENTICITY', 600, 195);

        ctx.fillStyle = '#475569';
        ctx.font = 'italic 15px sans-serif';
        ctx.fillText('This prestigious electronic certificate is proudly awarded to', 600, 235);

        // Nama Pemenang
        const winnerName = auctionData.highest_bidder ? `@${sanitize(auctionData.highest_bidder)}` : 'VALUED WINNER';
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(winnerName.toUpperCase(), 600, 280);

        // Garis Pembatas
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(350, 295);
        ctx.lineTo(850, 295);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.fillText('For successfully winning the official PiBox NFT auction event with verified details below:', 600, 335);

        // 3. Kotak Informasi Detail Lelang
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(140, 365, 920, 195, 10);
        ctx.fill();
        ctx.stroke();

        const startX = 170;
        const col2X = 360;
        let startY = 405;
        const spacing = 38;

        const details = [
            { label: '• NFT Asset Name:', val: sanitize(auctionData.title) || 'Helloween', color: '#0f172a' },
            { label: '• Seller / Creator:', val: `@${sanitize(auctionData.seller) || 'Muhammadefendi123'}`, color: '#d97706' },
            { label: '• Winning Bid Price:', val: `${auctionData.highest_bid || auctionData.reserve_price || '250'} Pi`, color: '#16a34a' },
            { label: '• Mint / Tx Hash:', val: sanitize(auctionData.hash) || 'GBM62XKYNSKG07JBIY5EMZCKZPOZZKH37XKRVENHYLSPP44LCY4HZQ5', color: '#2563eb', font: '11px monospace' }
        ];

        details.forEach((item, index) => {
            const y = startY + (index * spacing);
            ctx.fillStyle = '#475569';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, startX, y);

            ctx.fillStyle = item.color;
            ctx.font = item.font || 'bold 13px sans-serif';
            ctx.fillText(item.val, col2X, y);
        });

        // 4. Tanggal Terbit & ID Sertifikat
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        const issuedDateStr = auctionData.closing_time ? new Date(auctionData.closing_time).toUTCString() : new Date().toUTCString();
        const certId = auctionData.id ? `GCP2E-NFT-${auctionData.id.substring(0,8).toUpperCase()}` : 'GCP2E-NFT-8DBA6AED';
        ctx.fillText(`Issued Date: ${issuedDateStr} | Certificate ID: ${certId}`, 600, 595);

        // 5. Render Gambar Stempel & Tanda Tangan
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.onload = function() {
            ctx.drawImage(sealImg, 800, 545, 240, 180);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('CHAIRMAN OF GCP2E', 920, 745);
        };
        sealImg.src = SEAL_SIGN_URL;

        // Teks Kiri Bawah
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('CHAIRMAN OF GCP2E', 140, 745);
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
