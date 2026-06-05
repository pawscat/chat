# Telegram You AI Bot

Bot Telegram AI yang ditenagai oleh You.com API, lengkap dengan sistem manajemen data berbasis JSON murni dan Web Dashboard untuk pengguna serta administrator.

## Fitur Utama
1. **AI Chat**: Bot menjawab pertanyaan secara pintar menggunakan You.com API (mendukung mode Research dan Search).
2. **Dashboard Pengguna**: Web portal untuk pengguna melihat statistik pribadi.
3. **Dashboard Admin Web**: Monitoring statistik keseluruhan, manajemen pengguna/grup/channel, live server monitoring, cek logs, dan kontrol konfigurasi.
4. **Admin Panel Telegram**: Mengelola bot langsung dari dalam aplikasi Telegram.
5. **Realtime Broadcast**: Broadcast pesan massal secara realtime ke pengguna, grup, maupun channel dengan progress tracking.
6. **No-Database SQL/NoSQL**: Semua data (User, Admin, Grup, Log) disimpan dengan aman dalam file JSON otomatis. Tahan restart.
7. **Rate Limiting & Security**: Memiliki batas akses harian, proteksi spam (per-menit), dan blacklist.

---

## Prasyarat
- Node.js versi 18 atau 20
- Akun Telegram dan Bot Token (dari @BotFather)
- You.com API Key (dari You.com Developer)

## Cara Instalasi
1. Clone atau download repositori ini.
2. Buka terminal di dalam folder proyek.
3. Jalankan perintah instalasi dependensi:
   ```bash
   npm install
   ```

## Konfigurasi
Sistem konfigurasi bot telah terpusat di satu file `settings.js` tanpa menggunakan `.env`.

1. Salin file `settings.example.js` dan ubah namanya menjadi `settings.js`.
2. Buka file `settings.js` dan isi nilai-nilainya sesuai petunjuk:

```javascript
module.exports = {
  telegram: {
    botToken: "ISI_TOKEN_BOT_TELEGRAM", // Token dari @BotFather
    botUsername: "username_bot_anda"
  },

  youApi: {
    apiKey: "ISI_API_KEY_YOU_COM", // API Key You.com
    mode: "research", // Pilih 'research' atau 'search'
    // ... setting endpoint lainnya
  },

  web: {
    enabled: true,
    port: 3000,
    baseUrl: "http://localhost:3000",
    sessionSecret: "ganti_dengan_rahasia_acak"
  },

  admin: {
    superAdminId: "123456789", // Ganti dengan Telegram ID Anda
    // ... setting admin lainnya
  },
  
  // ... setting bot & broadcast lainnya
};
```

*Catatan: Anda juga dapat mengubah sebagian besar konfigurasi ini secara langsung via menu **Settings** di Web Dashboard tanpa perlu membuka file kodenya lagi. Bot akan memuat ulang (live-reload) perubahannya secara otomatis.*

*Cara mendapatkan ID Telegram: Mulai percakapan dengan @userinfobot atau kirim `/id` ke bot Anda jika sudah menyala.*

## Menjalankan Bot
Untuk menjalankan bot di mode produksi:
```bash
npm start
```
Untuk mode pengembangan (auto-reload dari nodemon):
```bash
npm run dev
```

Saat pertama kali dijalankan, sistem akan otomatis membuat file penyimpanan JSON di dalam folder `data/` dan melakukan backup otomatis.

---

## Cara Akses Dashboard
### Dashboard Pengguna
- URL: `http://localhost:3000/user/login` (sesuaikan port jika di VPS).
- Login menggunakan ID Telegram atau Username. Pengguna harus sudah mengirim `/start` di Telegram terlebih dahulu.

### Dashboard Admin
- URL: `http://localhost:3000/admin/login`
- Login menggunakan ID Telegram yang sudah terdaftar sebagai admin.
- Akun `superAdminId` di `settings.js` otomatis mendapatkan akses hak tertinggi saat login.

---

## Cara Menggunakan Fitur Telegram
- `/start` : Mendaftarkan akun dan menyapa pengguna.
- `/help` : Panduan interaksi bot.
- `/id` : Melihat ID Telegram.
- `/stats` : Melihat statistik dan sisa limit harian.
- `/ping` : Cek response time bot.
- `/admin` : Membuka panel kontrol Admin di Telegram (Hanya untuk admin).
- **Di Grup**: Panggil bot dengan perintah `/ai <pertanyaan>` atau mention bot `@nama_bot <pertanyaan>`.

---

## Manajemen Admin
### Super Admin
Super Admin adalah pemilik bot dengan hak akses penuh.
1. Super Admin pertama kali diatur melalui variabel `superAdminId` di dalam `settings.js`.
2. Super Admin dapat menambah dan menghapus admin lain melalui menu **Manage Admins** di Web Dashboard.
3. Super Admin tidak dapat dihapus oleh admin biasa.

### Menambah Admin Baru
1. Login ke Dashboard Admin menggunakan akun Super Admin.
2. Buka menu **Manage Admins**.
3. Masukkan Telegram ID admin yang baru. Admin baru otomatis memiliki hak akses moderasi dan broadcast (kecuali pengaturan manajemen admin).

---

## Panduan Broadcast (Siaran Massal)
Anda dapat melakukan broadcast melalui 2 cara:

1. **Via Telegram (Inline Panel)**: 
   - Ketik `/admin`, klik tombol `📢 Broadcast`.
   - Pilih target (User, Grup, Channel, Semua).
   - Kirim pesan yang ingin disiarkan.
   - Konfirmasi pengiriman. Pesan kemajuan akan diupdate secara realtime.
   
2. **Via Web Dashboard**:
   - Login ke Web Dashboard sebagai Admin.
   - Pilih menu **Broadcast**.
   - Pilih target dan tulis pesan (Mendukung tag HTML Telegram seperti `<b>`, `<i>`, dll).
   - Klik Kirim. Status progress akan muncul di web secara realtime (Auto Polling).

---

## Cara Cek API Usage
Setiap request ke You.com akan dicatat. Anda dapat memantaunya di:
1. Panel Admin Telegram: Klik tombol **🔑 API Usage**.
2. Web Dashboard: Buka menu **API Usage**. Anda bisa melihat rasio sukses/gagal, rata-rata waktu respon, dan estimasi pemakaian bulanan.

---

## Deployment ke Server
### Deploy di VPS (Linux/Ubuntu)
1. Upload file proyek ke VPS.
2. Install Node.js dan NPM.
3. Instal dependencies: `npm install --production`
4. Setup `settings.js` sesuai environment server.
5. Disarankan menggunakan PM2 untuk menjalankan bot agar tetap hidup di background:
   ```bash
   npm install -g pm2
   pm2 start index.js --name "you-ai-bot"
   pm2 save
   pm2 startup
   ```
6. Akses web melalui IP VPS Anda (Contoh: `http://192.168.1.1:3000`).

### Deploy di cPanel Node.js
1. Buat aplikasi Node.js baru dari menu `Setup Node.js App`.
2. Tentukan Node.js versi 18 atau 20.
3. Upload semua file (kecuali `node_modules`).
4. Jalankan `npm install` dari antarmuka cPanel atau SSH.
5. Setup file `settings.js` di file manager.
6. Restart aplikasi Node.js.
7. Aplikasi web dapat diakses via domain Anda.

---

## Troubleshooting (Penyelesaian Masalah)
- **Error 401 API Key**: Pastikan `apiKey` You.com sudah benar di `settings.js`.
- **Bot tidak merespon di grup**: Pastikan Anda sudah mematikan `Privacy Mode` di @BotFather atau jadikan bot sebagai administrator di grup tersebut.
- **Data json corrupt**: Jangan khawatir, bot melakukan pencadangan otomatis (backup). Anda bisa mengambil versi sebelumnya dari folder `data/backups/`.
- **Dashboard tidak bisa diakses**: Pastikan port web (default 3000) sudah dibuka di firewall server Anda (misal `ufw allow 3000`).
- **Log Error Lengkap**: Lihat dari halaman Web Dashboard menu **Logs** untuk pesan error teknis terperinci.

## Catatan Keamanan
- Pastikan folder `data/` tidak dapat diakses secara langsung oleh publik dari luar web server (Express tidak mengekspos folder data, yang diekspos hanya folder `public/`).
- Jangan membagikan file `data/admins.json` atau file konfigurasi `settings.js`.
- File `settings.js` telah masuk dalam list `.gitignore` sehingga aman dari komit Git yang tidak disengaja.
