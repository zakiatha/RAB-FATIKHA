# 📊 RAB - Fatikha (Rencana Anggaran Biaya & Belanja)

Aplikasi manajemen anggaran belanja (RAB), monitoring realisasi bulanan fleksibel, kalender heatmap pengeluaran, visualisasi grafik & neraca keuangan, serta ekspor spreadsheet Excel.

---

## ✨ Fitur Utama

- 💰 **Multi-Month Budgeting**: Bebas memilih dan mengatur pagu anggaran untuk bulan apa saja (bulan lalu, berjalan, maupun perencanaan bulan depan) secara independen.
- 🥦 **3 Kategori Utama Terfokus**:
  - **Sayur & Mayur**
  - **Protein (Daging, Ikan, Telur)**
  - **Bumbu & Minyak Dapur**
- 📝 **Format Catatan Belanja Harian (Saldo Berjalan)**:
  - Format ringkas notasi `k` dengan perhitungan saldo otomatis:
    `1. 12,5k (ebi+empon 7,5k, paket lodeh 5k). saldo : 287,5k`
  - Tombol **Salin Catatan** instan untuk kebutuhan pencatatan harian.
- 📅 **Kalender Pengeluaran Interaktif (Heatmap)**:
  - Indikator warna pengeluaran harian: Hijau (&le; 50rb), Kuning (50rb - 200rb), dan Merah (&gt; 200rb).
  - Klik tanggal untuk melihat rincian belanja pada hari tersebut.
- ⚖️ **Grafik & Neraca Keuangan**:
  - **Neraca Keuangan Bulanan**: Rekapitulasi Debet (Pagu Masuk), Kredit (Realisasi Belanja 3 Kategori), dan Saldo Bersih (Surplus/Defisit).
  - **Grafik Batang (Bar Chart)**: Tren belanja harian per tanggal.
  - **Donut / Pie Chart**: Proporsi pengeluaran 3 kategori utama.
- 📑 **Ekspor Excel Rapi (.xls)**:
  - Menghasilkan spreadsheet resmi Microsoft Excel dengan tabel bergaris, warna header, dan pemisahan section jelas (Pagu, Nota Rincian, Rekap Kategori, dan Neraca).
- 🔒 **Kontrol Akses Role (Admin vs User)**:
  - **Mode Pengguna**: Hanya baca (*read-only*), aman dari perubahan tak sengaja.
  - **Mode Admin**: Dilindungi autentikasi PIN (Default: `1234`) untuk mengedit anggaran dan belanja.
- ☁️ **Sinkronisasi Database Cloud (Supabase)**:
  - Sinkronisasi instan dua arah (*two-way sync*) ke database PostgreSQL Supabase.
  - **Offline-First Architecture**: Tetap dapat diakses dan digunakan meskipun offline; data tersimpan di LocalStorage dan disinkronkan saat online.
  - Skrip DDL & RLS lengkap tersedia di `supabase_schema.sql`.
- 🛡️ **Keamanan Berlapis (Enterprise SecOps)**:
  - **Anti Brute-Force Rate Limiting**: Batas 5 kali percobaan PIN salah dengan jeda lockout 60 detik.
  - **Sanitasi XSS Penuh**: Seluruh input teks disanitasi secara ketat sebelum render ke DOM.
  - **Enkripsi Web Crypto SHA-256**: Autentikasi PIN di-hash dengan salt statis.
- 🎨 **3 Pilihan Tema**:
  - 🌙 Gelap (Dark Mode)
  - ☀️ Terang (Light Mode)
  - 🌸 Pink Pastel

---

## 🚀 Cara Menjalankan

Aplikasi ini berbasis web modern (*pure front-end client*):
1. **Jalankan Aplikasi:**
   - Buka berkas `index.html` langsung di peramban web (Chrome, Edge, Firefox, Safari).
   - Atau gunakan ekstensi *Live Server* pada editor kode Anda.
2. **Setup Database Supabase (Opsional):**
   - Salin seluruh skrip dari `supabase_schema.sql`.
   - Tempel dan jalankan di menu **SQL Editor** pada dashboard proyek Supabase Anda.
   - Tabel `rab_budgets` dan `rab_transactions` akan dibuat secara otomatis lengkap dengan kebijakan keamanan Row Level Security (RLS).

