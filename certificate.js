/**
 * Modul Generator Sertifikat Elektronik GCP2E Resmi
 * Mengintegrasikan Stempel & Tanda Tangan Asli secara 100% Presisi
 */
const GCP2ECertificateModule = (function() {
    
    // Fungsi internal untuk sanitasi teks agar aman dirender ke canvas
    function sanitize(str) {
        if (!str) return '';
        return str.toString().replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
        });
    }

    function render(canvas, auctionData) {
        const ctx = canvas.getContext('2d');
        
        // Mengatur resolusi tinggi kanvas (Landscape 1200 x 850 piksel)
        canvas.width = 1200;
        canvas.height = 850;

        // 1. Latar Belakang Elegan Sertifikat
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 850);

        // Bingkai Emas Mewah Ganda
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 8;
        ctx.strokeRect(35, 35, 1130, 780);

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 1104, 754);

        // Ornamen Kotak Sudut Emas
        ctx.fillStyle = '#eab308';
        ctx.fillRect(35, 35, 25, 25);
        ctx.fillRect(1140, 35, 25, 25);
        ctx.fillRect(35, 790, 25, 25);
        ctx.fillRect(1140, 790, 25, 25);

        // 2. Header Organisasi GCP2E
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GLOBAL COMMUNITY PLAY TO EARN (GCP2E)', 600, 105);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('OFFICIAL ELECTRONIC AUCTION CERTIFICATE', 600, 135);

        // Garis Pemisah Emas
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(350, 155);
        ctx.lineTo(850, 155);
        ctx.stroke();

        // Judul Utama Sertifikat (Bahasa Inggris)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px serif';
        ctx.fillText('CERTIFICATE OF OWNERSHIP & AUTHENTICITY', 600, 215);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 18px sans-serif';
        ctx.fillText('This prestigious electronic certificate is proudly awarded to', 600, 255);

        // 3. Nama Pemenang Lelang (Real-Time Data)
        const winnerName = auctionData.highest_bidder ? `@${sanitize(auctionData.highest_bidder)}` : 'Valued Winner';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(winnerName.toUpperCase(), 600, 310);

        // Garis Bawah Nama Pemenang
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(380, 325);
        ctx.lineTo(820, 325);
        ctx.stroke();

        // 4. Keterangan & Detail Aset Real-Time
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '17px sans-serif';
        ctx.fillText('For successfully winning the official PiBox NFT auction event with verified details below:', 600, 370);

        // Kotak Panel Informasi Detail Aset
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(150, 400, 900, 170, 12);
        ctx.fill();
        ctx.stroke();

        // Baris Detail di dalam Panel
        ctx.textAlign = 'left';
        ctx.font = 'bold 15px sans-serif';
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• NFT Asset Name:', 180, 435);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(sanitize(auctionData.title) || 'Nusantara NFT Asset', 370, 435);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• Seller / Creator:', 180, 470);
        ctx.fillStyle = '#facc15';
        ctx.fillText(`@${sanitize(auctionData.seller)}`, 370, 470);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• Winning Bid Price:', 180, 505);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(`${auctionData.highest_bid || auctionData.reserve_price} Pi`, 370, 505);

        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• Mint / Tx Hash:', 180, 540);
        ctx.fillStyle = '#facc15';
        ctx.font = '13px monospace';
        ctx.fillText(sanitize(auctionData.hash) || 'GCVJ2EXX...', 370, 540);

        // 5. Tanggal Terbit & ID Unik Sertifikat (Real-Time)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        const issueDate = new Date().toUTCString();
        ctx.fillText(`Issued Date: ${issueDate} | Certificate ID: GCP2E-NFT-${auctionData.id.substring(0,8).toUpperCase()}`, 600, 605);

        // 6. Merender Stempel & Tanda Tangan Asli (100% Persis dari Gambar Sumber[span_0](start_span)[span_0](end_span))
        const officialSealImg = new Image();
        officialSealImg.crossOrigin = "anonymous";
        // Menggunakan sumber gambar asli yang Anda lampirkan[span_1](start_span)[span_1](end_span)
        officialSealImg.src = "174925.jpg";[span_2](start_span)[span_2](end_span)

        officialSealImg.onload = function() {
            // Menempatkan stempel dan tanda tangan secara presisi di pojok kanan bawah sertifikat
            ctx.drawImage(officialSealImg, 760, 550, 340, 220);
            
            // Label Tanda Tangan Ketua
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CHAIRMAN OF GCP2E', 930, 785);
        };

        officialSealImg.onerror = function() {
            // Fallback pengaman jika gambar gagal dimuat
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('CHAIRMAN OF GCP2E (Official Stamp & Signature)', 930, 680);
        };
    }

    // Publik API modul
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
