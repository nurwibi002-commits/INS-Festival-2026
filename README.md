# Formulir Pendaftaran Lomba INSFestival – ELEVATE

Situs statis (HTML + CSS + JS murni) untuk GitHub Pages. Backend memakai Google Apps Script:
data masuk ke Google Sheets, bukti transfer tersimpan di Google Drive.

```
insfestival-form/
├── index.html
├── style.css
├── script.js          ← ubah CONFIG di bagian atas (URL backend + data pembayaran)
└── apps-script/
    └── Code.gs        ← ditempel ke Google Apps Script (bukan bagian situs)
```

## A. Setup backend (Google Apps Script)

1. Buat Google Sheets baru, misalnya "Data Pendaftaran INSFestival".
2. Klik **Extensions (Ekstensi) → Apps Script**.
3. Hapus isi `Code.gs` bawaan, lalu tempel seluruh isi `apps-script/Code.gs` dari repositori ini. Simpan.
4. Pilih fungsi **`authorize`** di menu dropdown, klik **Run**, lalu setujui izin akses
   (Sheets dan Drive). Bila muncul "Google hasn't verified this app", klik **Advanced → Go to ... (unsafe)**;
   ini aman karena skrip milik akunmu sendiri.
5. Klik **Deploy → New deployment**, ikon roda gigi → **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik **Deploy** dan salin **Web app URL** (berakhiran `/exec`).

> Setiap kali `Code.gs` diubah: **Deploy → Manage deployments → ikon pensil → Version: New version → Deploy**.
> URL tetap sama.

## B. Atur frontend

Buka `script.js`, ubah bagian `CONFIG` di paling atas:

```js
SCRIPT_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
PAYMENT: { nominal: "150.000", metode: "Bank ...", nomor: "...", nama: "..." }
```

## C. Deploy ke GitHub Pages

1. Buat repositori baru di GitHub (Public), misalnya `insfestival-form`.
2. Unggah `index.html`, `style.css`, `script.js` ke root repositori
   (**Add file → Upload files**, lalu **Commit**). Folder `apps-script` boleh ikut diunggah atau tidak.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment → Source**, pilih **Deploy from a branch**.
   Branch: **main**, folder: **/(root)**, klik **Save**.
5. Tunggu 1–3 menit. Situs aktif di `https://USERNAME.github.io/insfestival-form/`.

## D. Uji coba

1. Buka URL situs, isi seluruh bagian dengan data uji, unggah gambar kecil, lalu kirim.
2. Cek Google Sheets (sheet "Pendaftaran") dan folder Drive "Bukti Transfer INSFestival".
3. Hapus baris dan file uji sebelum pendaftaran dibuka.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| "Tidak dapat terhubung ke server" | `SCRIPT_URL` salah, atau akses deployment belum **Anyone**. |
| Perubahan `Code.gs` tidak berpengaruh | Buat **New version** di Manage deployments. |
| Data tidak masuk, tidak ada error | Jalankan `authorize` dulu, lalu deploy ulang. |
| Halaman 404 di GitHub Pages | Pastikan `index.html` ada di root dan Pages memakai branch `main`. |

## Catatan

- File bukti transfer bersifat privat (hanya pemilik Drive). Link di Sheets hanya bisa dibuka akun pemilik.
- Batas kuota Apps Script akun gratis cukup untuk ratusan pendaftar; pantau di dasbor Apps Script.
- URL Web App bersifat publik di kode situs. Validasi server dan honeypot sudah ada, tetapi jangan
  menyimpan data sensitif lain di skrip.
