/**
 * INSFestival – Backend pendaftaran (Google Apps Script Web App)
 * Pasang di: Google Sheets > Extensions > Apps Script (container-bound).
 * Data masuk ke sheet "Pendaftaran", file bukti transfer ke folder Google Drive.
 */
const SHEET_NAME  = 'Pendaftaran';
const FOLDER_NAME = 'Bukti Transfer INSFestival'; // dibuat otomatis bila belum ada
const MAX_BYTES   = 5 * 1024 * 1024;
const CABANG = ['Coding Scratch', 'Ilustrasi Digital', 'Medley Lagu Nusantara'];
const FILE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };
const HEADERS = ['Waktu', 'Kode', 'Email', 'No. HP/WA', 'Nama Pengisi', 'Peran', 'Asal Sekolah',
                 'Asal Daerah', 'Cabang Lomba', 'Nama Peserta', 'NISN', 'Bukti Transfer (Link)', 'Status'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const d = JSON.parse(e.postData.contents);
    if (d.website) return out({ ok: true, id: '-' }); // honeypot: abaikan bot

    const err = validate(d);
    if (err) return out({ ok: false, message: err });

    const bytes = Utilities.base64Decode(d.file.data);
    if (bytes.length > MAX_BYTES) return out({ ok: false, message: 'Ukuran file maksimal 5 MB.' });

    const tz = Session.getScriptTimeZone();
    const id = 'INS-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyMMdd') + '-' +
               Math.random().toString(36).slice(2, 6).toUpperCase();

    const safeName = clean(d.nama_peserta, 40).replace(/[^\w\- ]/g, '').trim().replace(/\s+/g, '_') || 'peserta';
    const blob = Utilities.newBlob(bytes, d.file.type, id + '_' + safeName + '.' + FILE_TYPES[d.file.type]);
    const file = getFolder().createFile(blob);

    const sheet = getSheet();
    sheet.appendRow([
      new Date(), id, clean(d.email, 120), "'" + d.phone, clean(d.nama_pengisi, 120), clean(d.peran, 120),
      clean(d.sekolah, 150), clean(d.daerah, 150), d.cabang, clean(d.nama_peserta, 120), "'" + d.nisn,
      file.getUrl(), 'Menunggu verifikasi'
    ]);
    return out({ ok: true, id: id });
  } catch (ex) {
    console.error(ex);
    return out({ ok: false, message: 'Terjadi kesalahan di server. Silakan coba lagi.' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet() { return out({ ok: true, message: 'API INSFestival aktif.' }); }

/** Jalankan SEKALI secara manual untuk memberi izin akses Drive & Sheets. */
function authorize() {
  getSheet();
  getFolder();
  Logger.log('Izin berhasil. Sheet dan folder siap.');
}

function validate(d) {
  if (!d || !d.file || !d.file.data) return 'Bukti transfer tidak ditemukan.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || '')) return 'Format email tidak valid.';
  if (!/^\d{9,15}$/.test(d.phone || '')) return 'Nomor telepon harus 9–15 digit angka.';
  if (!/^\d{10}$/.test(d.nisn || '')) return 'NISN harus 10 digit angka.';
  if (CABANG.indexOf(d.cabang) < 0) return 'Cabang lomba tidak valid.';
  const peranOk = ['Guru/Pendamping', 'Siswa', 'Orang tua'].indexOf(d.peran) >= 0 || /^Lainnya: .+/.test(d.peran || '');
  if (!peranOk) return 'Peran tidak valid.';
  if (['nama_pengisi', 'sekolah', 'daerah', 'nama_peserta'].some(function (k) { return !String(d[k] || '').trim(); }))
    return 'Ada kolom wajib yang belum diisi.';
  if (!FILE_TYPES[d.file.type]) return 'Format file harus JPG, PNG, atau PDF.';
  return '';
}

// Cegah formula injection di Sheets & batasi panjang
function clean(v, max) {
  var s = String(v || '').trim().slice(0, max || 200);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0B2A5B').setFontColor('#ffffff');
  }
  return sh;
}

function getFolder() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
