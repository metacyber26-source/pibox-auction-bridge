// certificate.js - Modul Pembuatan Sertifikat Resmi & Anti-Pemalsuan
export function generateCertificate(assetData) {
    const canvas = document.getElementById('certificateCanvas');
    if (!canvas) {
        console.error("Canvas sertifikat tidak ditemukan di DOM.");
        return;
    }
    const ctx = canvas.getContext('2d');

    // Atur ukuran resolusi canvas sertifikat (Landscape)
    canvas.width = 1200;
    canvas.height = 800;

    // 1. Latar Belakang Sertifikat (Elegan & Berstandar Galeri)
    ctx.fillStyle = "#fcfbfa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bingkai Luar & Dalam
    ctx.strokeStyle = "#c5a059"; // Warna emas galeri
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.lineWidth = 2;
    ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

    // 2. Judul & Header Sertifikat
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "bold 36px serif";
    ctx.textAlign = "center";
    ctx.fillText("SERTIFIKAT KEPEMILIKAN ASET NUSANTARA", canvas.width / 2, 130);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#666";
    ctx.fillText("PIBOX AUCTION BRIDGE & NFT-GM VERIFIED SYSTEM", canvas.width / 2, 165);

    // 3. Informasi Kepemilikan & Aset
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText("Sertifikat digital ini diberikan secara resmi kepada:", canvas.width / 2, 240);

    ctx.font = "bold 32px serif";
    ctx.fillStyle = "#b8860b";
    ctx.fillText(assetData.owner || "Nama Pemilik / Kolektor", canvas.width / 2, 290);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText("Atas keberhasilan verifikasi dan kepemilikan sah aset budaya / NFT:", canvas.width / 2, 350);

    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = "#111";
    ctx.fillText(assetData.title || "Judul Aset Nusantara", canvas.width / 2, 400);

    // 4. Fitur Keamanan Anti-Pemalsuan (Nomor Hash & Timestamp)
    const secureHash = assetData.hash || "NFT-GM-" + Math.random().toString(36.substring(2, 12)).toUpperCase();
    ctx.font = "14px monospace";
    ctx.fillStyle = "#555";
    ctx.fillText("Secure Hash / TX ID: " + secureHash, canvas.width / 2, 470);
    ctx.fillText("Tanggal Terbit: " + new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }), canvas.width / 2, 500);

    // 5. Memuat Gambar Stempel & Tanda Tangan Resmi (stamp.png)
    const stampImg = new Image();
    stampImg.src = 'stamp.png'; // Pastikan nama file di GitHub sudah benar (stamp.png)
    stampImg.onload = () => {
        // Gambar stempel di pojok kanan bawah sertifikat
        ctx.drawImage(stampImg, canvas.width - 320, canvas.height - 280, 220, 220);
        
        // Label Penandatangan
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#333";
        ctx.textAlign = "center";
        ctx.fillText("Otoritas Resmi NFT-GM", canvas.width - 210, canvas.height - 50);
    };

    return canvas.toDataURL("image/png");
}
