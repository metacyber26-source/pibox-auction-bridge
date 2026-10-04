// js/payment.js - Modul Pembayaran Pi
export function initPayment() {
    const btnRelease = document.getElementById('btn-release');
    
    if (btnRelease) {
        btnRelease.addEventListener('click', () => {
            alert('Memproses biaya server 0.2 Pi melalui Pi Network...');
            // Integrasi Pi.createPayment(...) diletakkan di sini
        });
    }
}

initPayment();
