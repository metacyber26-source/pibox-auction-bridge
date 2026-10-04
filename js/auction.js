import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang, Kompresi, & Pengiriman Data Supabase
export function initAuction() {
    // 1. Tombol Sertifikat
    const btnCert = document.getElementById('btn-certificate');
    if (btnCert) {
        btnCert.addEventListener('click', () => {
            alert('Modul Sertifikat NFT-GM dibuka.');
        });
    }

    // 2. Tombol / Form Rilis Aset Lelang
    const fileInput = document.getElementById('file-input');
    
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            let file = e.target.files[0];
            if (!file) return;

            try {
                console.log(`Ukuran file asli: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Kompres gambar otomatis (maksimal lebar 1024px, kualitas 70%)
                file = await compressImage(file, 1024, 0.7);
                
                console.log(`Ukuran setelah dikompres: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
                
                // --- ATASI ERROR: BUAT WAKTU BERAKHIR LELANG (24 JAM KEDEPAN) ---
                const now = new Date();
                const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

                // CONTOH STRUKTUR PENGIRIMAN KE SUPABASE:
                /*
                // Pastikan 'ends_at: endsAt' dimasukkan ke dalam objek .insert() Anda!
                const { data, error } = await supabase
                    .from('auctions')
                    .insert([
                        {
                            title: document.getElementById('nft-title')?.value || "Aset Nusantara",
                            image_url: file, // atau hasil upload storage URL Anda
                            ends_at: endsAt   // <-- INI WAJIB ADA AGAR TIDAK ERROR NULL
                        }
                    ]);

                if (error) throw error;
                */

                alert('Gambar siap dan parameter waktu lelang (ends_at) telah diatur!');

            } catch (err) {
                console.error("Gagal merilis aset:", err);
                alert("Gagal merilis aset: " + err.message);
            }
        });
    }
}

initAuction();
