import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang & Kompresi Gambar Terintegrasi
export function initAuction() {
    const fileInput = document.getElementById('file-input');
    const btnRelease = document.getElementById('btn-release');

    let compressedFile = null;

    // 1. Kompres gambar otomatis saat file dipilih untuk mencegah macet di HP
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const originalFile = e.target.files[0];
            if (!originalFile) return;

            try {
                console.log(`Ukuran asli: ${(originalFile.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Kompres gambar (maks lebar 1024px, kualitas 70%)
                compressedFile = await compressImage(originalFile, 1024, 0.7);
                
                console.log(`Ukuran setelah kompres: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
                alert('Gambar berhasil dikompres dan siap dirilis!');
            } catch (err) {
                console.error("Gagal mengompres gambar:", err);
                alert("Terjadi kesalahan saat memproses gambar.");
            }
        });
    }

    // 2. Menyiapkan data lelang saat tombol Rilis Aset diklik
    if (btnRelease) {
        btnRelease.addEventListener('click', async () => {
            try {
                // Wajib ada untuk memenuhi aturan database (ends_at tidak boleh null)
                const endsAtTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

                console.log("Parameter waktu lelang disiapkan:", endsAtTime);

                // Contoh struktur data yang dikirim ke Supabase:
                /* 
                const auctionPayload = {
                    title: "Aset Nusantara",
                    image_file: compressedFile,
                    ends_at: endsAtTime // <-- KUNCI UTAMA AGAR TIDAK ERROR NULL
                };
                // await supabase.from('auctions').insert([auctionPayload]);
                */

            } catch (err) {
                console.error("Gagal merilis aset:", err);
            }
        });
    }
}

initAuction();
