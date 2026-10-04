import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang, Kompresi, & Pengiriman Data
export function initAuction() {
    // 1. Logika untuk tombol Sertifikat
    const btnCert = document.getElementById('btn-certificate');
    if (btnCert) {
        btnCert.addEventListener('click', () => {
            alert('Modul Sertifikat NFT-GM dibuka.');
        });
    }

    // 2. Logika Utama Pengunggahan dan Pelelangan Aset
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
                
                // Contoh pembuatan waktu berakhir lelang otomatis (misal: 24 jam dari sekarang)
                const now = new Date();
                const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

                // Pastikan variabel 'ends_at' dikirim bersama data ke Supabase Anda, contoh:
                /*
                const auctionData = {
                    title: document.getElementById('title-input')?.value || "Aset Nusantara",
                    image_url: file, // atau hasil upload URL Supabase Storage
                    ends_at: endsAt // <-- Ini wajib diisi agar tidak error 'null constraint'
                };
                */

                alert('Gambar siap dan parameter waktu lelang terpenuhi!');

            } catch (err) {
                console.error("Gagal memproses lelang:", err);
                alert("Gagal merilis aset: " + err.message);
            }
        });
    }
}

initAuction();
