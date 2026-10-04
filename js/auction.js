import { compressImage } from './compressor.js';

// js/auction.js - Logika Lelang, Kompresi, & Pengamanan Database
export function initAuction() {
    console.log("Modul lelang Nusantara NFT dimuat.");

    const fileInput = document.getElementById('file-input');
    
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const originalFile = e.target.files[0];
            if (!originalFile) return;

            try {
                console.log(`Ukuran file asli: ${(originalFile.size / 1024 / 1024).toFixed(2)} MB`);
                
                // Kompres gambar secara otomatis agar aman di perangkat seluler
                const optimizedFile = await compressImage(originalFile, 1024, 0.7);
                
                console.log(`Ukuran setelah dikompres: ${(optimizedFile.size / 1024 / 1024).toFixed(2)} MB`);
            } catch (err) {
                console.error("Gagal mengompres gambar:", err);
            }
        });
    }
}

// Fungsi bantu untuk memastikan kolom ends_at selalu terisi saat melakukan insert ke Supabase
export function getAuctionPayload(customData = {}) {
    const defaultEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return {
        ends_at: defaultEndsAt, // Mencegah error 'null value in column ends_at'
        ...customData
    };
}

initAuction();
