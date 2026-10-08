/* =========================================================
   KONFIGURASI — ubah bagian ini saja sebelum deploy
   ========================================================= */
const CONFIG = {
  // URL Web App Google Apps Script (berakhiran /exec)
  SCRIPT_URL: "PASTE_URL_WEB_APP_DI_SINI",
  MAX_FILE_MB: 5,
  PAYMENT: {
    nominal: "[ISI_NOMINAL]",        // tampil setelah tulisan "Rp "
    metode:  "[ISI_BANK/E-WALLET]",
    nomor:   "[ISI_NOMOR_REKENING]",
    nama:    "[ISI_NAMA_PEMILIK]"
  }
};
/* ========================================================= */

(() => {
  "use strict";

  const form = document.getElementById("regForm");
  const stepEls = [...form.querySelectorAll(".step")];
  const progressItems = [...document.querySelectorAll("#progress li")];
  const btnBack = document.getElementById("btnBack");
  const btnNext = document.getElementById("btnNext");
  const btnSubmit = document.getElementById("btnSubmit");
  const banner = document.getElementById("banner");
  const prolog = document.getElementById("prolog");
  const chip = document.getElementById("chip");
  const fileInput = form.elements.bukti;

  const STEP_FIELDS = [
    ["email", "phone", "nama_pengisi", "peran", "peran_lainnya", "sekolah", "daerah"],
    ["cabang", "nama_peserta", "nisn"],
    ["bukti"]
  ];
  const ALLOWED_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };
  let current = 0;
  let submitting = false;

  // Isi data pembayaran dari CONFIG
  document.querySelectorAll("[data-pay]").forEach(el => { el.textContent = CONFIG.PAYMENT[el.dataset.pay]; });

  const val = n => (form.elements[n].value || "").trim();
  const required = msg => n => (val(n) ? "" : msg);

  const rules = {
    email: () => {
      const v = val("email");
      if (!v) return "Email wajib diisi.";
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "" : "Format email tidak valid. Contoh: nama@email.com";
    },
    phone: () => {
      const v = val("phone");
      if (!v) return "Nomor telepon/WhatsApp wajib diisi.";
      if (!/^\d+$/.test(v)) return "Nomor hanya boleh berisi angka.";
      return v.length < 9 || v.length > 15 ? "Nomor harus terdiri dari 9–15 digit." : "";
    },
    nama_pengisi: () => required("Nama pengisi formulir wajib diisi.")("nama_pengisi"),
    peran: () => (val("peran") ? "" : "Pilih salah satu peran pengisi formulir."),
    peran_lainnya: () => (val("peran") === "Lainnya" && !val("peran_lainnya") ? "Tulis peran kamu pada kolom ini." : ""),
    sekolah: () => required("Asal sekolah wajib diisi.")("sekolah"),
    daerah: () => required("Asal daerah wajib diisi.")("daerah"),
    cabang: () => (val("cabang") ? "" : "Pilih salah satu cabang lomba."),
    nama_peserta: () => required("Nama lengkap wajib diisi.")("nama_peserta"),
    nisn: () => {
      const v = val("nisn");
      if (!v) return "NISN wajib diisi.";
      if (!/^\d+$/.test(v)) return "NISN hanya boleh berisi angka.";
      return v.length !== 10 ? "NISN harus terdiri dari 10 digit." : "";
    },
    bukti: () => {
      const f = fileInput.files[0];
      if (!f) return "Bukti transfer wajib diunggah.";
      const ext = f.name.split(".").pop().toLowerCase();
      if (!ALLOWED_EXT[ext]) return "Format file harus JPG, PNG, atau PDF.";
      if (f.size > CONFIG.MAX_FILE_MB * 1024 * 1024) return `Ukuran file maksimal ${CONFIG.MAX_FILE_MB} MB.`;
      return "";
    }
  };

  function showError(name, msg) {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    const out = document.getElementById("err-" + name);
    if (!wrap || !out) return;
    wrap.classList.toggle("has-error", !!msg);
    out.textContent = msg;
    const ctl = form.elements[name];
    if (ctl && ctl.setAttribute && ctl.type !== "radio") ctl.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  function validateField(name) {
    const msg = rules[name]();
    showError(name, msg);
    return msg;
  }

  // Validasi satu bagian; kembalikan nama field pertama yang salah
  function validateStep(i) {
    let first = null;
    STEP_FIELDS[i].forEach(n => { if (validateField(n) && !first) first = n; });
    return first;
  }

  function focusField(name) {
    const ctl = form.elements[name];
    const el = ctl instanceof RadioNodeList ? ctl[0] : ctl;
    if (el) el.focus({ preventScroll: false });
  }

  function goTo(i) {
    current = i;
    stepEls.forEach((el, idx) => { el.hidden = idx !== i; });
    progressItems.forEach((li, idx) => {
      li.classList.toggle("active", idx === i);
      li.classList.toggle("done", idx < i);
      idx === i ? li.setAttribute("aria-current", "step") : li.removeAttribute("aria-current");
    });
    btnBack.hidden = i === 0;
    btnNext.hidden = i === stepEls.length - 1;
    btnSubmit.hidden = i !== stepEls.length - 1;
    prolog.hidden = i !== 0;
    banner.hidden = true;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    stepEls[i].querySelector("legend").focus({ preventScroll: true });
  }

  btnNext.addEventListener("click", () => {
    const bad = validateStep(current);
    if (bad) return focusField(bad);
    goTo(current + 1);
  });
  btnBack.addEventListener("click", () => goTo(current - 1));

  // Hanya angka untuk telepon & NISN
  ["phone", "nisn"].forEach(n => form.elements[n].addEventListener("input", e => {
    e.target.value = e.target.value.replace(/\D/g, "");
  }));

  // Peran "Lainnya"
  form.querySelectorAll('input[name="peran"]').forEach(r => r.addEventListener("change", () => {
    const other = val("peran") === "Lainnya";
    document.getElementById("wrap-lainnya").hidden = !other;
    if (!other) { form.elements.peran_lainnya.value = ""; showError("peran_lainnya", ""); }
  }));

  // Hapus/ulang validasi saat user memperbaiki isian
  form.addEventListener("input", e => {
    const n = e.target.name;
    if (n && rules[n] && form.querySelector(`[data-field="${n}"]`)?.classList.contains("has-error")) validateField(n);
  });
  form.addEventListener("change", e => {
    const n = e.target.name;
    if (n && rules[n] && n !== "bukti") validateField(n);
  });
  form.addEventListener("focusout", e => {
    const n = e.target.name;
    if (n && rules[n] && e.target.type !== "radio" && e.target.type !== "file" && e.target.value) validateField(n);
  });

  // File upload + preview nama file
  const fmtSize = b => (b < 1024 * 1024 ? Math.max(1, Math.round(b / 1024)) + " KB" : (b / 1048576).toFixed(2) + " MB");
  function clearFile() { fileInput.value = ""; chip.hidden = true; }
  fileInput.addEventListener("change", () => {
    const msg = rules.bukti();
    showError("bukti", msg);
    const f = fileInput.files[0];
    if (msg || !f) return clearFile();
    document.getElementById("chipName").textContent = `${f.name} (${fmtSize(f.size)})`;
    chip.hidden = false;
  });
  document.getElementById("chipX").addEventListener("click", () => { clearFile(); showError("bukti", "Bukti transfer wajib diunggah."); fileInput.focus(); });

  const toBase64 = f => new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = () => fail(new Error("Gagal membaca file."));
    r.readAsDataURL(f);
  });

  function setLoading(on) {
    submitting = on;
    btnSubmit.disabled = on;
    btnBack.disabled = on;
    btnSubmit.querySelector(".spin").hidden = !on;
    btnSubmit.querySelector(".txt").textContent = on ? "Mengirim…" : "Kirim pendaftaran";
  }

  function showBanner(msg) { banner.textContent = msg; banner.hidden = false; banner.scrollIntoView({ behavior: "smooth", block: "center" }); }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (submitting) return; // cegah submit ganda

    for (let i = 0; i < STEP_FIELDS.length; i++) {
      const bad = validateStep(i);
      if (bad) { goTo(i); return focusField(bad); }
    }
    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL.startsWith("PASTE_")) {
      return showBanner("Formulir belum terhubung ke server. Panitia perlu mengisi SCRIPT_URL di script.js.");
    }

    setLoading(true);
    banner.hidden = true;
    try {
      const f = fileInput.files[0];
      const ext = f.name.split(".").pop().toLowerCase();
      const peran = val("peran") === "Lainnya" ? "Lainnya: " + val("peran_lainnya") : val("peran");
      const payload = {
        email: val("email"), phone: val("phone"), nama_pengisi: val("nama_pengisi"), peran,
        sekolah: val("sekolah"), daerah: val("daerah"),
        cabang: val("cabang"), nama_peserta: val("nama_peserta"), nisn: val("nisn"),
        website: val("website"),
        file: { name: f.name, type: f.type || ALLOWED_EXT[ext], data: await toBase64(f) }
      };

      // text/plain = "simple request", tidak memicu preflight CORS di Apps Script
      const res = await fetch(CONFIG.SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message || "Pendaftaran gagal diproses.");

      document.getElementById("regId").textContent = json.id || "-";
      form.hidden = true;
      prolog.hidden = true;
      const done = document.getElementById("success");
      done.hidden = false;
      done.scrollIntoView({ behavior: "smooth", block: "start" });
      done.querySelector("h2").focus({ preventScroll: true });
    } catch (err) {
      const offline = err instanceof TypeError;
      showBanner(offline
        ? "Tidak dapat terhubung ke server. Periksa koneksi internet, lalu klik Kirim pendaftaran lagi."
        : err.message);
      setLoading(false);
    }
  });

  goTo(0);
})();
