import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang & Galeri
export function initAuction() {
    // 1. Logika untuk tombol Sertifikat
    const btnCert = document.getElementById('btn-certificate');
    if (btnCert) {
        btnCert.addEventListener('click', () => {
            alert('Modul Sertifikat NFT-GM dibuka.');
            // Logika canvas sertifikat dapat dipanggil di sini
        });
    }

    // 2. Logika untuk Kompresi Gambar Otomatis saat Pilih File
    const fileInput = document.getElementById('file-input'); // Sesuaikan ID jika id di HTML Anda berbeda
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            let file = e.target.files[0];
            if (!file) return;

            try {
                console.log(`Ukuran file asli: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Proses kompresi gambar (maksimal lebar 1024px, kualitas 70%)
                file = await compressImage(file, 1024, 0.7);
                
                console.log(`Ukuran setelah dikompres: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Beritahu pengguna bahwa gambar siap
                alert('Gambar berhasil dikompres dan siap diunggah!');

                // Di sini Anda bisa melanjutkan proses unggah file 'file' yang sudah diringkas ke Supabase/Galeri Anda
            } catch (err) {
                console.error("Gagal mengompres gambar:", err);
                alert("Terjadi kesalahan saat memproses gambar.");
            }
        });
    }
}

initAuction();
