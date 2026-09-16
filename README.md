# ⚡ PiAuction Bridge

Aplikasi lelang *off-chain* berbasis web yang dirancang untuk menjembatani penjual dan pembeli aset NFT sebelum eksekusi transaksi akhir dilakukan di platform **PiBox (PIBOX NFT EVENT ZONE)**.

## 📌 Fitur Utama

- **Model Lelang Ringan (Off-Chain Auction):** Mempertemukan pembeli dan penjual tanpa perlu *smart contract escrow* yang rumit.
- **Biaya Anti-Spam (0.2 Pi):** Mengenakan biaya 0.2 Pi untuk *listing* (penjual) dan *bid* pertama (pembeli) guna menekan penawaran palsu dan menutupi operasional server.
- **Perpanjangan Waktu Otomatis (Anti-Sniping):** Waktu lelang otomatis bertambah 5 menit jika terdapat penawaran baru di 2 menit terakhir.
- **Sistem Harga Terendah (Reserve Price):** Menolak otomatis penawaran di bawah harga minimum yang ditetapkan penjual.
- **Dukungan Multi-Bahasa:** Tersedia pengubah bahasa instan (Bahasa Indonesia & Bahasa Inggris).
- **Notifikasi Alur Rilis PiBox:** Peringatan otomatis bagi pemenang lelang dan penjual untuk menyelesaikan transaksi akhir di PiBox.

## 🛠️ Teknologi yang Digunakan

- **HTML5 & Vanilla JavaScript**
- **Tailwind CSS** (via CDN)
- **Pi Network SDK** (`pi-sdk.js`)
- **Vercel** (Deployment & Hosting)

## 🚀 Cara Menjalankan secara Lokal / Deploy

1. **Clone Repositori**
   ```bash
   git clone [https://github.com/username-kamu/pibox-auction-bridge.git](https://github.com/username-kamu/pibox-auction-bridge.git)
   cd pibox-auction-bridge
