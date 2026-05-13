// === i18n: Indonesian & English translations ===
const I18N = {
    id: {
        // Header
        header_title: 'WA Bulk Sender',
        header_sub: 'Kirim cerdas, tetap aman 🛡️',
        badge_detecting: 'Mendeteksi...',
        badge_connected: 'Terhubung',
        badge_disconnected: 'Buka WA Web',
        lang_toggle_title: 'Ganti bahasa / Change language',

        // Sections
        sec_import: 'Import Excel / CSV',
        sec_manual: 'Tambah Manual',
        sec_contacts: 'Daftar Kontak',
        sec_attachment: 'Lampiran',
        sec_template: 'Template Pesan',
        sec_delay: 'Jeda Pengiriman',
        optional: 'opsional',

        // File drop
        file_drop_import: 'Seret file ke sini atau <u>klik untuk pilih</u>',
        file_drop_media: 'Foto, video, PDF, atau dokumen (maks 60MB)',

        // Manual input
        contact_placeholder: '628123456789\n628987654321\nPisah dengan baris, koma, atau spasi',
        add_to_list: '＋ Tambah ke Daftar',

        // Contacts
        contact_count_suffix: 'kontak',
        clear_all: '🗑️ Hapus Semua',
        confirm_clear: 'Hapus semua kontak?',
        chip_remove_title: 'Hapus',

        // Template
        message_placeholder: 'Halo *{nama}*, undangan kamu sudah siap! 🎉',
        tt_bold: 'Bold (Ctrl+B)',
        tt_italic: 'Italic (Ctrl+I)',
        tt_strike: 'Coret',
        tt_mono: 'Monospace',
        tt_bullet: 'Daftar poin',
        tt_quote: 'Kutipan',
        tt_var: 'Sisip variabel',
        preview_label: 'PRATINJAU:',
        var_hint_prefix: 'Variabel:',

        // Delay
        delay_unit: 'detik',
        delay_min: 'Min',
        delay_max: 'Max',
        delay_hint: 'Jeda acak mencegah akun terkena pembatasan 🔒',

        // Buttons
        btn_start: 'Mulai Kirim',
        btn_stop: 'Stop',

        // Status / alerts
        alert_no_message: 'Pesan tidak boleh kosong',
        alert_invalid_delay: 'Delay min tidak boleh lebih besar dari max',
        alert_no_contacts: 'Tambahkan minimal 1 kontak',
        status_starting: '🚀 Memulai pengiriman...',
        status_stopping: '⏹ Menghentikan pengiriman...',
        status_wa_ready: '✅ Tab WhatsApp Web terdeteksi. Siap kirim!',
        status_wa_missing: '⚠️ Buka WhatsApp Web dan login dulu, ya!',
        title_open_wa: 'Buka https://web.whatsapp.com/ dan login dulu',

        // Import results
        added_skipped: (a, s) => `Ditambahkan: ${a}, dilewati (duplikat/invalid): ${s}`,
        file_empty: 'File kosong atau tidak terbaca.',
        file_no_header: 'File tidak punya header. Pastikan baris pertama berisi nama kolom (mis. nama, nomor, acara).',
        file_no_phone: (headers) => `Tidak menemukan kolom nomor. Header: ${headers}. Tambahkan kolom dengan nama: phone/nomor/wa/hp.`,
        file_imported: (name, added, skipped, phoneKey, vars) =>
            `Diimpor dari "${name}": +${added} kontak, dilewati ${skipped}. Kolom nomor: "${phoneKey}". Variabel: ${vars || '(tidak ada)'}`,
        file_read_error: (msg) => 'Error baca file: ' + msg,

        // Media
        media_too_big: (mb) => `File terlalu besar (${mb}MB). Maks 60MB.`,
        media_read_fail: 'Gagal baca file.',
        media_info: (name, kb, kind) => `Lampiran: ${name} (${kb} KB) — ${kind}`,
        media_photo: 'foto',
        media_video: 'video',
        media_doc: 'dokumen',

        // Progress (dipancarkan dari background.js)
        prog_no_tab: 'Tab WhatsApp Web tidak ditemukan. Buka https://web.whatsapp.com/ dan login dulu.',
        prog_checking_login: 'Memeriksa status login WhatsApp Web...',
        prog_not_logged_in: 'Belum login di WhatsApp Web. Silakan scan QR di tab WA, lalu coba lagi.',
        prog_stopped: (i, n) => `Dihentikan pada ${i}/${n}`,
        prog_processing: (i, n, phone) => `(${i}/${n}) Memproses ${phone}...`,
        prog_tab_closed: 'Tab WhatsApp Web ditutup. Proses dihentikan.',
        prog_sent: (i, n, phone) => `(${i}/${n}) Terkirim ke ${phone}`,
        prog_failed: (i, n, phone, reason) => `(${i}/${n}) Gagal kirim ke ${phone} (${reason})`,
        prog_break: (sec) => `Istirahat ${sec} detik (anti-banned)...`,
        prog_done: 'Selesai mengirim semua pesan.',
        prog_error: (msg) => 'Error: ' + msg,
    },
    en: {
        // Header
        header_title: 'WA Bulk Sender',
        header_sub: 'Send smart, stay safe 🛡️',
        badge_detecting: 'Detecting...',
        badge_connected: 'Connected',
        badge_disconnected: 'Open WA Web',
        lang_toggle_title: 'Change language / Ganti bahasa',

        // Sections
        sec_import: 'Import Excel / CSV',
        sec_manual: 'Add Manually',
        sec_contacts: 'Contact List',
        sec_attachment: 'Attachment',
        sec_template: 'Message Template',
        sec_delay: 'Sending Delay',
        optional: 'optional',

        // File drop
        file_drop_import: 'Drag file here or <u>click to choose</u>',
        file_drop_media: 'Photo, video, PDF, or document (max 60MB)',

        // Manual input
        contact_placeholder: '628123456789\n628987654321\nSeparate by line, comma, or space',
        add_to_list: '＋ Add to List',

        // Contacts
        contact_count_suffix: 'contacts',
        clear_all: '🗑️ Clear All',
        confirm_clear: 'Remove all contacts?',
        chip_remove_title: 'Remove',

        // Template
        message_placeholder: 'Hi *{nama}*, your invitation is ready! 🎉',
        tt_bold: 'Bold (Ctrl+B)',
        tt_italic: 'Italic (Ctrl+I)',
        tt_strike: 'Strikethrough',
        tt_mono: 'Monospace',
        tt_bullet: 'Bullet list',
        tt_quote: 'Quote',
        tt_var: 'Insert variable',
        preview_label: 'PREVIEW:',
        var_hint_prefix: 'Variables:',

        // Delay
        delay_unit: 'seconds',
        delay_min: 'Min',
        delay_max: 'Max',
        delay_hint: 'Random delay helps avoid account restrictions 🔒',

        // Buttons
        btn_start: 'Start Sending',
        btn_stop: 'Stop',

        // Status / alerts
        alert_no_message: 'Message cannot be empty',
        alert_invalid_delay: 'Min delay cannot exceed max',
        alert_no_contacts: 'Add at least 1 contact',
        status_starting: '🚀 Starting send...',
        status_stopping: '⏹ Stopping...',
        status_wa_ready: '✅ WhatsApp Web tab detected. Ready to send!',
        status_wa_missing: '⚠️ Please open WhatsApp Web and log in first!',
        title_open_wa: 'Open https://web.whatsapp.com/ and log in first',

        // Import results
        added_skipped: (a, s) => `Added: ${a}, skipped (duplicate/invalid): ${s}`,
        file_empty: 'File is empty or unreadable.',
        file_no_header: 'File has no header. Make sure the first row contains column names (e.g. name, phone, event).',
        file_no_phone: (headers) => `No phone column found. Headers: ${headers}. Add a column named: phone/nomor/wa/hp.`,
        file_imported: (name, added, skipped, phoneKey, vars) =>
            `Imported from "${name}": +${added} contacts, skipped ${skipped}. Phone column: "${phoneKey}". Variables: ${vars || '(none)'}`,
        file_read_error: (msg) => 'File read error: ' + msg,

        // Media
        media_too_big: (mb) => `File too large (${mb}MB). Max 60MB.`,
        media_read_fail: 'Failed to read file.',
        media_info: (name, kb, kind) => `Attachment: ${name} (${kb} KB) — ${kind}`,
        media_photo: 'photo',
        media_video: 'video',
        media_doc: 'document',

        // Progress (emitted by background.js)
        prog_no_tab: 'WhatsApp Web tab not found. Open https://web.whatsapp.com/ and log in first.',
        prog_checking_login: 'Checking WhatsApp Web login status...',
        prog_not_logged_in: 'Not logged in to WhatsApp Web. Scan the QR in the WA tab, then try again.',
        prog_stopped: (i, n) => `Stopped at ${i}/${n}`,
        prog_processing: (i, n, phone) => `(${i}/${n}) Processing ${phone}...`,
        prog_tab_closed: 'WhatsApp Web tab was closed. Process stopped.',
        prog_sent: (i, n, phone) => `(${i}/${n}) Sent to ${phone}`,
        prog_failed: (i, n, phone, reason) => `(${i}/${n}) Failed to send to ${phone} (${reason})`,
        prog_break: (sec) => `Resting ${sec} seconds (anti-banned)...`,
        prog_done: 'Finished sending all messages.',
        prog_error: (msg) => 'Error: ' + msg,
    }
};

let currentLang = 'en';

function t(key, ...args) {
    const dict = I18N[currentLang] || I18N.en;
    const val = dict[key];
    if (typeof val === 'function') return val(...args);
    return val ?? key;
}

function setLang(lang) {
    if (!I18N[lang]) return;
    currentLang = lang;
    try { chrome.storage.local.set({ lang }); } catch (_) {}
    applyI18n();
}

function getLang() { return currentLang; }

function applyI18n() {
    document.documentElement.lang = currentLang;

    // Elemen dengan data-i18n: ganti textContent
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = t(key);
    });

    // Elemen dengan data-i18n-html: ganti innerHTML (untuk teks yang mengandung HTML)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.dataset.i18nHtml);
    });

    // Atribut placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    // Atribut title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = t(el.dataset.i18nTitle);
    });

    // Update tombol toggle bahasa
    const langBtn = document.getElementById('langToggle');
    if (langBtn) {
        langBtn.textContent = currentLang === 'id' ? 'EN' : 'ID';
        langBtn.title = t('lang_toggle_title');
    }

    // Update badge text (status koneksi) — dipegang oleh popup.js via updateBadgeText()
    if (typeof window.updateBadgeText === 'function') window.updateBadgeText();

    // Re-render preview & var hint kalau popup.js sudah load
    if (typeof window.renderPreview === 'function') window.renderPreview();
    if (typeof window.updateVarHint === 'function') window.updateVarHint();
}

function initI18n() {
    // Pasang listener tombol DULU — jangan menunggu chrome.storage callback,
    // supaya klik selalu responsif walau storage belum balas.
    const btn = document.getElementById('langToggle');
    if (btn && !btn.dataset.i18nBound) {
        btn.dataset.i18nBound = '1';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            setLang(currentLang === 'id' ? 'en' : 'id');
        });
    }

    try {
        chrome.storage.local.get(['lang'], (data) => {
            if (data && data.lang && I18N[data.lang]) currentLang = data.lang;
            applyI18n();
        });
    } catch (_) {
        applyI18n();
    }
}

window.t = t;
window.setLang = setLang;
window.getLang = getLang;
window.applyI18n = applyI18n;
window.initI18n = initI18n;
