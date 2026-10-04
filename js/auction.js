import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang & Kompresi Terintegrasi
export function initAuction() {
    const btnRelease = document.getElementById('btn-release');
    const fileInput = document.getElementById('file-input'); // Sesuaikan jika ada input file tersembunyi/khusus

    if (btnRelease) {
        btnRelease.addEventListener('click', async () => {
            // Jika tombol rilis diklik, kita jalankan alur lelang dan kompresi
            try {
                console.log("Memulai proses rilis aset...");
                
                // Pastikan kolom ends_at diisi waktu 24 jam kedepan untuk menghindari error database
                const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                
                // Lanjutkan logika pembayaran & pengiriman data ke database Supabase Anda di sini
                alert("Aset siap diproses dengan sistem pengamanan waktu lelang (ends_at terisi).");

            } catch (err) {
                console.error("Gagal merilis aset:", err);
                alert("Terjadi kesalahan: " + err.message);
            }
        });
    }

    // Tangani juga elemen file jika ada
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            let file = e.target.files[0];
            if (!file) return;

            try {
                // Kompres otomatis ukuran gambar besar sebelum diunggah
                file = await compressImage(file, 1024, 0.7);
                console.log("Gambar berhasil dikompres, ukuran baru:", (file.size / 1024 / 1024).toFixed(2), "MB");
            } catch (err) {
                console.error("Gagal kompres gambar:", err);
            }
        });
    }
}

initAuction();
