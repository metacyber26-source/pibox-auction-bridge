// certificate.js - Mengambil data URL & Menampilkan Stempel Resmi
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

document.addEventListener("DOMContentLoaded", async () => {
    // Ambil parameter ID aset dari URL (contoh: certificate.html?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const assetId = urlParams.get('id');

    const winnerEl = document.querySelector('.loading-winner, #winner-name');
    const assetEl = document.querySelector('.loading-asset, #asset-title');
    const stampContainer = document.getElementById('stamp-container'); // Sesuaikan elemen wadah stempel jika ada

    if (assetId) {
        try {
            // Contoh pengambilan data dari Supabase (sesuaikan konfigurasi klien Anda jika sudah ada)
            // const { data, error } = await supabase.from('auctions').select('*').eq('id', assetId).single();
            
            // Simulasi data berhasil dimuat:
            if (winnerEl) winnerEl.textContent = "Kolektor Terverifikasi (Pi Network)";
            if (assetEl) assetEl.textContent = "Aset Budaya Nusantara #" + assetId;
            
        } catch (err) {
            console.error("Gagal memuat data sertifikat:", err);
        }
    } else {
        if (winnerEl) winnerEl.textContent = "Pemegang Hak Sah";
        if (assetEl) assetEl.textContent = "Nusantara Verified NFT";
    }

    // Memuat stempel resmi stamp.png secara dinamis ke halaman
    const stampImgImg = document.createElement('img');
    stampImgImg.src = 'stamp.png';
    stampImgImg.alt = 'Stempel Resmi NFT-GM';
    stampImgImg.style.width = '180px';
    stampImgImg.style.height = 'auto';
    
    // Tempatkan stempel di area sertifikat jika elemen target tersedia
    const targetArea = document.getElementById('certificate-footer') || document.body;
    targetArea.appendChild(stampImgImg);
});
