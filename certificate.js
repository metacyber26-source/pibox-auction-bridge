/**
 * Modul Generator Sertifikat Elektronik GCP2E
 */
const GCP2ECertificateModule = (function() {
    
    // Fungsi internal untuk merender sertifikat ke elemen canvas
    function render(canvas, auctionData) {
        const ctx = canvas.getContext('2d');

        // Resolusi tinggi kanvas (Landscape 1200 x 850)
        canvas.width = 1200;
        canvas.height = 850;

        // 1. Latar Belakang Elegan Sertifikat
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 850);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e1b4b');
        bgGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, 1200, 850);

        // Bingkai Emas Mewah
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 8;
        ctx.strokeRect(35, 35, 1130, 780);

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(48, 48, 1104, 754);

        // Ornamen Sudut
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

        // Judul Sertifikat
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px serif';
        ctx.fillText('CERTIFICATE OF OWNERSHIP & AUTHENTICITY', 600, 215);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = 'italic 18px sans-serif';
        ctx.fillText('This prestigious electronic certificate is proudly awarded to', 600, 255);

        // 3. Nama Pemenang Lelang Real-Time
        const winnerName = auctionData.highest_bidder ? `@${sanitizeInput(auctionData.highest_bidder)}` : 'Valued Winner';
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(winnerName.toUpperCase(), 600, 310);

        // Garis Bawah Nama
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(380, 325);
        ctx.lineTo(820, 325);
        ctx.stroke();

        // 4. Deskripsi & Detail Aset Real-Time
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '17px sans-serif';
        ctx.fillText('For successfully winning the official PiBox NFT auction event with verified details below:', 600, 370);

        // Kotak Panel Detail Aset
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(150, 400, 900, 170, 12);
        ctx.fill();
        ctx.stroke();

        // Isi Detail dalam Kotak
        ctx.textAlign = 'left';
        ctx.font = 'bold 15px sans-serif';
        
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• NFT Asset Name:', 180, 435);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(sanitizeInput(auctionData.title) || 'Nusantara NFT Asset', 370, 435);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText('• Seller / Creator:', 180, 470);
        ctx.fillStyle = '#facc15';
        ctx.fillText(`@${sanitizeInput(auctionData.seller)}`, 370, 470);

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
        ctx.fillText(sanitizeInput(auctionData.hash) || 'GCVJ2EXX...', 370, 540);

        // 5. Tanggal & ID Sertifikat Unik
        ctx.textAlign = 'center';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        const issueDate = new Date().toUTCString();
        ctx.fillText(`Issued Date: ${issueDate} | Certificate ID: GCP2E-NFT-${auctionData.id.substring(0,8).toUpperCase()}`, 600, 605);

        // 6. Muat Stempel & Tanda Tangan
        const stampImg = new Image();
        stampImg.crossOrigin = "anonymous";
        stampImg.src = "175259.jpg"; 

        stampImg.onload = function() {
            ctx.drawImage(stampImg, 800, 580, 300, 190);
            drawChairmanLabel(ctx);
        };

        stampImg.onerror = function() {
            // Render Stempel Cadangan jika gambar gagal dimuat
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(950, 660, 65, 0, 2 * Math.PI);
            ctx.stroke();

            ctx.fillStyle = '#3b82f6';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('★ GLOBAL COMMUNITY ★', 950, 635);
            ctx.fillText('PLAY TO EARN', 950, 655);
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('OFFICIAL STAMP', 950, 680);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'italic 16px cursive';
            ctx.fillText('Chairman GCP2E', 950, 730);

            drawChairmanLabel(ctx);
        };
    }

    function drawChairmanLabel(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CHAIRMAN OF GCP2E', 950, 785);
    }

    // Publik API untuk dipanggil dari luar modul
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
