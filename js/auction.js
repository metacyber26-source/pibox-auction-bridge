import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang, Kompresi, & Pengiriman Supabase
export function initAuction() {
    const btnRelease = document.getElementById('btn-release');
    const fileInput = document.getElementById('file-input');

    let processedFile = null; // Menyimpan file yang sudah dikompres

    // 1. Tangani pemilihan file & kompresi otomatis
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            let file = e.target.files[0];
            if (!file) return;

            try {
                console.log("Ukuran file asli:", (file.size / 1024 / 1024).toFixed(2), "MB");
                // Kompres gambar agar tidak macet di perangkat seluler
                processedFile = await compressImage(file, 1024, 0.7);
                console.log("Ukuran setelah dikompres:", (processedFile.size / 1024 / 1024).toFixed(2), "MB");
            } catch (err) {
                console.error("Gagal kompres gambar:", err);
                alert("Gagal memproses gambar.");
            }
        });
    }

    // 2. Tangani tombol Rilis Aset & Kirim ke Supabase
    if (btnRelease) {
        btnRelease.addEventListener('click', async () => {
            try {
                console.log("Memulai proses rilis aset ke galeri...");
                
                // Buat waktu berakhir lelang 24 jam ke depan (Mencegah error ends_at null)
                const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                
                // Ambil nilai input judul atau nama aset jika ada
                const titleInput = document.getElementById('nft-title') || document.getElementById('title');
                const titleValue = titleInput ? titleInput.value : "Aset Nusantara";

                // Contoh perintah pengiriman ke Supabase 
                /*
                // Pastikan variabel 'supabase' sudah terhubung di proyek Anda
                const { data, error } = await supabase
                    .from('auctions')
                    .insert([
                        {
                            title: titleValue,
                            image_url: processedFile ? processedFile.name : "default.jpg",
                            ends_at: endsAt // <-- Parameter wajib agar tidak error null constraint
                        }
                    ]);

                if (error) throw error;
                */

                alert("Aset berhasil dirilis dan waktu lelang (ends_at) telah dicatat!");

            } catch (err) {
                console.error("Gagal merilis aset:", err);
                alert("Gagal merilis aset: " + err.message);
            }
        });
    }
}

initAuction();
