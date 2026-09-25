/**
 * Modul Generator Sertifikat Elektronik GCP2E (Desain Baru dari Nol)
 * Menggunakan aset gambar gabungan stempel & tanda tangan resmi dari GitHub.
 */
const GCP2ECertificateModule = (function() {
    
    // Mengambil file gambar stempel & tanda tangan langsung dari repository
    const SIGN_SEAL_IMAGE_URL = "1790326586371.jpg";

    function sanitize(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    function render(canvas, auctionData) {
        const ctx = canvas.getContext('2d');
        
        // Resolusi Tinggi Landscape (1200 x 850 piksel)
        canvas.width = 1200;
        canvas.height = 850;

        // 1. Background Putih Bersih
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1200, 850);

        // Aksen background tipis
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(30, 30, 1140, 790);

        // Bingkai Luar Biru Klasik
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 6;
        ctx.strokeRect(40, 40, 1120, 770);

        // Bingkai Dalam Emas Mewah
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, 1100, 750);

        // 2. KEPALA / HEADER SERTIFIKAT
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText('GLOBAL COMMUNITY PLAY TO EARN (GCP2E)', 600, 110);

        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('OFFICIAL ELECTRONIC AUCTION CERTIFICATE', 600, 135);

        // JUDUL UTAMA
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 32px serif';
        ctx.fillText('CERTIFICATE OF OWNERSHIP & AUTHENTICITY', 600, 195);

        ctx.fillStyle = '#475569';
        ctx.font = 'italic 15px sans-serif';
        ctx.fillText('This prestigious electronic certificate is proudly awarded to', 600, 235);

        // NAMA PEMENANG (REAL-TIME)
        const winnerName = auctionData.highest_bidder ? `@${sanitize(auctionData.highest_bidder)}` : 'VALUED WINNER';
        ctx.fillStyle = '#d97706';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText(winnerName.toUpperCase(), 600, 285);

        // Garis Pemisah Emas
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(350, 310);
        ctx.lineTo(850, 310);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '14px sans-serif';
        ctx.fillText('For successfully winning the official auction event with verified details below:', 600, 350);

        // 3. KOTAK INFORMASI DETAIL LELANG
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(150, 380, 900, 185, 8);
        ctx.fill();
        ctx.stroke();

        const startX = 180;
        const col2X = 370;
        let startY = 420;
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

        // 4. TANGGAL & ID SERTIFIKAT (REAL-TIME)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        const issuedDateStr = auctionData.closing_time ? new Date(auctionData.closing_time).toUTCString() : new Date().toUTCString();
        const certId = auctionData.id ? `GCP2E-AUC-${auctionData.id.substring(0,8).toUpperCase()}` : 'GCP2E-AUC-8DBA6AED';
        ctx.fillText(`Issued Date: ${issuedDateStr} | Certificate ID: ${certId}`, 600, 605);

        // 5. MEMUAT GAMBAR STEMPEL & TANDA TANGAN DARI GITHUB
        const comboImg = new Image();
        comboImg.crossOrigin = "anonymous";
        comboImg.onload = function() {
            // Menempatkan gambar stempel & tanda tangan di sudut kanan bawah secara presisi
            // Ukuran lebar 300px, tinggi 225px agar proporsional dan sangat jelas
            ctx.drawImage(comboImg, 760, 560, 300, 225);

            // Label Jabatan di bawah stempel
            ctx.textAlign = 'center';
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('CHAIRMAN OF GCP2E', 910, 795);
        };
        comboImg.src = SIGN_SEAL_IMAGE_URL;

        // Label Kiri Bawah (Opsional untuk Penyeimbang)
        ctx.textAlign = 'left';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('AUTHORIZED BY GCP2E', 150, 795);
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
