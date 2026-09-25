/**
 * Modul Generator Sertifikat Elektronik GCP2E (Format Landscape)
 * Mengintegrasikan Stempel & Tanda Tangan Asli secara Real-Time
 */
const GCP2ECertificateModule = (function() {
    
    // Data Base64 gambar stempel & tanda tangan asli Anda
    const SEAL_SIGN_BASE64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/4QBaRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAARAAAATgAAAAAAAABIAAAAAQAAAEgAAAABPHBfaWNvbl9maWxlX25hbWU9MTc5MDI1MjcxNTk3NS5qcGc=";

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

        // 1. Background Gelap Elegan khas Tema Anda
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1200, 850);

        // Bingkai Luar & Dalam Warna Emas (Gold Border)
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 6;
        ctx.strokeRect(35, 35, 1130, 780);

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(48, 48, 1104, 754);

        // 2. Header Organisasi
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('GLOBAL COMMUNITY PLAY TO EARN (GCP2E)', 600, 100);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('OFFICIAL ELECTRONIC AUCTION CERTIFICATE', 600, 125);

        // Judul Utama Sertifikat
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px serif';
        ctx.fillText('CERTIFICATE OF OWNERSHIP & AUTHENTICITY', 600, 190);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 14px sans-serif';
        ctx.fillText('This prestigious electronic certificate is proudly awarded to', 600, 225);

        // Pemenang (Winner)
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('VALUED WINNER', 600, 270);

        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(350, 285);
        ctx.lineTo(850, 285);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px sans-serif';
        ctx.fillText('For successfully winning the official PiBox NFT auction event with verified details below:', 600, 325);

        // 3. Kotak Informasi Detail Lelang (Dark Rounded Box)
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(140, 355, 920, 195, 10);
        ctx.fill();
        ctx.stroke();

        // Baris Detail Lelang
        const startX = 170;
        const col2X = 350;
        let startY = 395;
        const spacing = 38;

        const details = [
            { label: '• NFT Asset Name:', val: sanitize(auctionData.title) || 'Helloween', color: '#ffffff' },
            { label: '• Seller / Creator:', val: `@${sanitize(auctionData.seller) || 'Muhammadefendi123'}`, color: '#facc15' },
            { label: '• Winning Bid Price:', val: `${auctionData.highest_bid || auctionData.reserve_price || '250'} Pi`, color: '#4ade80' },
            { label: '• Mint / Tx Hash:', val: sanitize(auctionData.hash) || 'GBM62XKYNSKG07JBIY5EMZCKZPOZZKH37XKRVENHYLSPP44LCY4HZQ5', color: '#facc15', font: '11px monospace' }
        ];

        details.forEach((item, index) => {
            const y = startY + (index * spacing);
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, startX, y);

            ctx.fillStyle = item.color;
            ctx.font = item.font || 'bold 13px sans-serif';
            ctx.fillText(item.val, col2X, y);
        });

        // 4. Tanggal Terbit & ID Sertifikat
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        const issuedDateStr = auctionData.closing_time ? new Date(auctionData.closing_time).toUTCString() : 'Fri, 25 Sep 2026 07:53:19 GMT';
        const certId = auctionData.id ? `GCP2E-NFT-${auctionData.id.substring(0,8).toUpperCase()}` : 'GCP2E-NFT-8DBA6AED';
        ctx.fillText(`Issued Date: ${issuedDateStr} | Certificate ID: ${certId}`, 600, 580);

        // 5. Render Stempel & Tanda Tangan Asli di Kanan Bawah
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.onload = function() {
            // Posisi stempel asli Anda di dalam canvas
            ctx.drawImage(sealImg, 880, 565, 200, 150);

            // Teks Tanda Tangan di Bawah Stempel
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.fillText('CHAIRMAN OF GCP2E', 980, 735);
        };
        sealImg.src = SEAL_SIGN_BASE64;

        // Teks Tambahan Kiri Bawah
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('CHAIRMAN OF GCP2E', 140, 735);
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
