const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const addBtn = document.getElementById('addBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const statusEl = document.getElementById('status');
const contactInputEl = document.getElementById('contactInput');
const chipsEl = document.getElementById('chips');
const countEl = document.getElementById('count');
const messageEl = document.getElementById('message');
const minDelayEl = document.getElementById('minDelay');
const maxDelayEl = document.getElementById('maxDelay');
const fileInputEl = document.getElementById('fileInput');
const fileInfoEl = document.getElementById('fileInfo');
const varHintEl = document.getElementById('varHint');

// contacts: array of { phone, vars: { kolom1: val, ... } }
let contacts = [];

const PHONE_KEYS = ['phone', 'nomor', 'no_hp', 'nohp', 'no hp', 'whatsapp', 'wa', 'hp', 'telp', 'telepon', 'no'];

chrome.storage.local.get(['contacts', 'message', 'minDelay', 'maxDelay'], (data) => {
    if (Array.isArray(data.contacts)) contacts = data.contacts;
    if (data.message) messageEl.value = data.message;
    if (data.minDelay) minDelayEl.value = data.minDelay;
    if (data.maxDelay) maxDelayEl.value = data.maxDelay;
    cleanupContacts();
    renderChips();
    updateVarHint();
});

function persist() {
    chrome.storage.local.set({
        contacts,
        message: messageEl.value,
        minDelay: minDelayEl.value,
        maxDelay: maxDelayEl.value
    });
}

[messageEl, minDelayEl, maxDelayEl].forEach(el => el.addEventListener('input', persist));

function renderChips() {
    chipsEl.innerHTML = '';
    contacts.forEach((c, idx) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const label = c.vars && Object.keys(c.vars).length
            ? `${c.phone} (${Object.values(c.vars)[0]})`
            : c.phone;
        chip.textContent = label;

        const x = document.createElement('span');
        x.className = 'x';
        x.textContent = '×';
        x.title = 'Hapus';
        x.addEventListener('click', () => {
            contacts.splice(idx, 1);
            persist();
            renderChips();
            updateVarHint();
        });

        chip.appendChild(x);
        chipsEl.appendChild(chip);
    });
    countEl.textContent = contacts.length;
}

function isValidVarKey(k) {
    return k && !/^__empty/i.test(k) && !/^name$/i.test(k);
}

function updateVarHint() {
    const keys = new Set();
    contacts.forEach(c => {
        if (c.vars) Object.keys(c.vars).forEach(k => {
            if (isValidVarKey(k)) keys.add(k);
        });
    });
    if (keys.size) {
        varHintEl.textContent = `Variabel: ${[...keys].map(k => `{${k}}`).join(', ')}`;
    } else {
        varHintEl.textContent = '';
    }
}

function cleanupContacts() {
    let dirty = false;
    contacts.forEach(c => {
        if (!c.vars) return;
        for (const k of Object.keys(c.vars)) {
            if (!isValidVarKey(k) || !String(c.vars[k]).trim()) {
                delete c.vars[k];
                dirty = true;
            }
        }
    });
    if (dirty) persist();
}

function addPhonesFromInput() {
    const raw = contactInputEl.value;
    if (!raw.trim()) return;

    const tokens = raw.split(/[\s,;\n]+/).map(t => t.replace(/[^\d]/g, '')).filter(Boolean);
    let added = 0, skipped = 0;
    const existing = new Set(contacts.map(c => c.phone));
    for (const t of tokens) {
        if (t.length < 8) { skipped++; continue; }
        if (existing.has(t)) { skipped++; continue; }
        contacts.push({ phone: t, vars: {} });
        existing.add(t);
        added++;
    }
    contactInputEl.value = '';
    persist();
    renderChips();
    updateVarHint();
    statusEl.textContent = `Ditambahkan: ${added}, dilewati (duplikat/invalid): ${skipped}`;
}

addBtn.addEventListener('click', addPhonesFromInput);

contactInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addPhonesFromInput();
    }
});

clearAllBtn.addEventListener('click', () => {
    if (contacts.length && !confirm('Hapus semua kontak?')) return;
    contacts = [];
    persist();
    renderChips();
    updateVarHint();
});

// === Excel/CSV Import ===
fileInputEl.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        if (!rows.length) {
            fileInfoEl.textContent = 'File kosong atau tidak terbaca.';
            return;
        }

        // Kumpulkan semua header dari semua baris, abaikan kolom kosong (__EMPTY)
        const allHeaders = new Set();
        rows.forEach(r => Object.keys(r).forEach(k => allHeaders.add(k)));
        const headers = [...allHeaders].filter(h => h && !/^__empty/i.test(h));

        if (!headers.length) {
            fileInfoEl.textContent = 'File tidak punya header. Pastikan baris pertama berisi nama kolom (mis. nama, nomor, acara).';
            return;
        }

        const phoneKey = detectPhoneKey(headers);
        if (!phoneKey) {
            fileInfoEl.textContent = `Tidak menemukan kolom nomor. Header: ${headers.join(', ')}. Tambahkan kolom dengan nama: phone/nomor/wa/hp.`;
            return;
        }

        const existing = new Set(contacts.map(c => c.phone));
        let added = 0, skipped = 0;

        for (const row of rows) {
            const phone = String(row[phoneKey] || '').replace(/[^\d]/g, '');
            if (phone.length < 8) { skipped++; continue; }
            if (existing.has(phone)) { skipped++; continue; }

            const vars = {};
            for (const h of headers) {
                if (h === phoneKey) continue;
                const key = normalizeKey(h);
                if (!key) continue;
                const val = String(row[h] ?? '').trim();
                if (!val) continue; // skip nilai kosong
                vars[key] = val;
            }

            contacts.push({ phone, vars });
            existing.add(phone);
            added++;
        }

        persist();
        renderChips();
        updateVarHint();
        fileInfoEl.textContent = `Imported dari "${file.name}": +${added} kontak, skip ${skipped}. Kolom nomor: "${phoneKey}". Variabel: ${headers.filter(h => h !== phoneKey).map(h => `{${normalizeKey(h)}}`).join(', ') || '(tidak ada)'}`;
        fileInputEl.value = '';
    } catch (err) {
        fileInfoEl.textContent = 'Error baca file: ' + err.message;
    }
});

function detectPhoneKey(headers) {
    for (const h of headers) {
        const norm = h.trim().toLowerCase().replace(/[\s_-]+/g, '');
        if (PHONE_KEYS.some(k => norm === k.replace(/[\s_-]+/g, '') || norm.includes(k.replace(/[\s_-]+/g, '')))) {
            return h;
        }
    }
    return null;
}

function normalizeKey(header) {
    return header.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
}

// === Status polling & WA tab check ===
let waTabAvailable = false;

function refreshStatus() {
    if (!waTabAvailable) return;
    chrome.storage.local.get(['progress'], (data) => {
        if (data.progress) statusEl.textContent = data.progress;
    });
}
setInterval(refreshStatus, 800);

function checkWaTab() {
    chrome.runtime.sendMessage({ type: 'CHECK_WA_TAB' }, (res) => {
        const ok = !!res?.ok;
        const changed = ok !== waTabAvailable;
        waTabAvailable = ok;

        if (ok) {
            startBtn.disabled = false;
            startBtn.title = '';
            if (changed) statusEl.textContent = 'Tab WhatsApp Web terdeteksi.';
        } else {
            startBtn.disabled = true;
            startBtn.title = 'Buka https://web.whatsapp.com/ dan login dulu';
            statusEl.textContent = 'Tab WhatsApp Web tidak terbuka. Buka https://web.whatsapp.com/ dan login dulu.';
        }
    });
}
checkWaTab();
setInterval(checkWaTab, 2000);

chrome.storage.local.remove('progress');

// === Start/Stop ===
startBtn.addEventListener('click', () => {
    const message = messageEl.value.trim();
    const minDelay = parseInt(minDelayEl.value) || 10;
    const maxDelay = parseInt(maxDelayEl.value) || 25;

    if (!message) { alert('Pesan tidak boleh kosong'); return; }
    if (minDelay > maxDelay) { alert('Delay min tidak boleh lebih besar dari max'); return; }
    if (!contacts.length) { alert('Tambahkan minimal 1 kontak'); return; }

    chrome.runtime.sendMessage({
        type: 'START_BULK',
        contacts,
        message,
        minDelay,
        maxDelay
    });

    statusEl.textContent = 'Memulai...';
});

stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_BULK' });
    statusEl.textContent = 'Permintaan stop dikirim...';
});
