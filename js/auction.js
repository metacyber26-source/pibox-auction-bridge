// js/auction.js - Logika Lelang & Galeri
export function initAuction() {
    const btnCert = document.getElementById('btn-certificate');

    if (btnCert) {
        btnCert.addEventListener('click', () => {
            alert('Modul Sertifikat NFT-GM dibuka.');
            // Logika canvas sertifikat dapat dipanggil di sini
        });
    }
}

initAuction();
