/**
 * Modul Generator Sertifikat Elektronik GCP2E (Landscape / Desain Gelap Elegan)
 * Data lelang terisi secara real-time dan menggunakan stempel transparan dari GitHub
 */
const GCP2ECertificateModule = (function() {
    
    // Nama file stempel dan tanda tangan terbaru sesuai dengan yang ada di GitHub
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

        // 1. Background Gelap Elegan
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 1200, 850);

        // Bingkai Emas Luar
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 6;
        ctx.strokeRect(35, 35, 1130, 780);

        // Bingkai Emas Dalam
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

        // Nama Pemenang (Real-time dari Data Lelang)
        const winnerName = auctionData.highest_bidder ? `@${sanitize(auctionData.highest_bidder)}` : 'VALUED WINNER';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText(winnerName.toUpperCase(), 600, 270);

        // Garis Pembatas Nama Pemenang
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(350, 285);
        ctx.lineTo(850, 285);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '13px sans-serif';
        ctx.fillText('For successfully winning the official PiBox NFT auction event with verified details below:', 600, 325);

        // 3. Kotak Informasi Detail Lelang (Real-time)
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(140, 355, 920, 195, 10);
        ctx.fill();
        ctx.stroke();

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

        // 4. Tanggal Terbit & ID Sertifikat (Real-time)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        const issuedDateStr = auctionData.closing_time ? new Date(auctionData.closing_time).toUTCString() : new Date().toUTCString();
        const certId = auctionData.id ? `GCP2E-NFT-${auctionData.id.substring(0,8).toUpperCase()}` : 'GCP2E-NFT-8DBA6AED';
        ctx.fillText(`Issued Date: ${issuedDateStr} | Certificate ID: ${certId}`, 600, 580);

        // 5. Render Gambar Stempel & Tanda Tangan dari GitHub ke Pojok Kanan Bawah
        const sealImg = new Image();
        sealImg.crossOrigin = "anonymous";
        sealImg.onload = function() {
            // Menampilkan gambar stempel/tanda tangan secara transparan di posisi kanan bawah
            ctx.drawImage(sealImg, 800, 530, 260, 200);

            // Teks Label di Bawah Stempel Kanan
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('CHAIRMAN OF GCP2E', 930, 755);
        };
        sealImg.src = SEAL_SIGN_URL;

        // Teks Kiri Bawah
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('CHAIRMAN OF GCP2E', 140, 755);
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
