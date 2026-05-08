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
let media = null; // { name, type, dataUrl }

const PHONE_KEYS = ['phone', 'nomor', 'no_hp', 'nohp', 'no hp', 'whatsapp', 'wa', 'hp', 'telp', 'telepon', 'no'];

chrome.storage.local.get(['contacts', 'message', 'minDelay', 'maxDelay'], (data) => {
    if (Array.isArray(data.contacts)) contacts = data.contacts;
    if (data.message) messageEl.value = data.message;
    if (data.minDelay) minDelayEl.value = data.minDelay;
    if (data.maxDelay) maxDelayEl.value = data.maxDelay;
    cleanupContacts();
    renderChips();
    updateVarHint();
    if (typeof renderPreview === 'function') renderPreview();
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

// === Formatting toolbar ===
const FMT_WRAP = {
    bold: { open: '*', close: '*' },
    italic: { open: '_', close: '_' },
    strike: { open: '~', close: '~' },
    mono: { open: '```', close: '```' }
};

document.querySelectorAll('.fmt-btn[data-fmt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fmt = btn.dataset.fmt;
        applyFormat(fmt);
    });
});

document.getElementById('varBtn').addEventListener('click', (e) => {
    e.preventDefault();
    insertAtCursor(messageEl, '{');
    showAutocomplete();
});

messageEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') { e.preventDefault(); applyFormat('bold'); }
        else if (e.key === 'i') { e.preventDefault(); applyFormat('italic'); }
    }
});

function applyFormat(fmt) {
    if (fmt === 'bullet') return applyLinePrefix('• ');
    if (fmt === 'quote') return applyLinePrefix('> ');

    const wrap = FMT_WRAP[fmt];
    if (!wrap) return;

    const start = messageEl.selectionStart;
    const end = messageEl.selectionEnd;
    const value = messageEl.value;
    const selected = value.slice(start, end);

    const before = value.slice(0, start);
    const after = value.slice(end);
    const newText = wrap.open + (selected || 'teks') + wrap.close;

    messageEl.value = before + newText + after;
    const cursorStart = start + wrap.open.length;
    const cursorEnd = cursorStart + (selected ? selected.length : 4);
    messageEl.setSelectionRange(cursorStart, cursorEnd);
    messageEl.focus();
    messageEl.dispatchEvent(new Event('input'));
}

function applyLinePrefix(prefix) {
    const start = messageEl.selectionStart;
    const value = messageEl.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    messageEl.value = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    messageEl.setSelectionRange(start + prefix.length, start + prefix.length);
    messageEl.focus();
    messageEl.dispatchEvent(new Event('input'));
}

function insertAtCursor(el, text) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    el.value = el.value.slice(0, start) + text + el.value.slice(end);
    el.setSelectionRange(start + text.length, start + text.length);
    el.focus();
    el.dispatchEvent(new Event('input'));
}

// === Autocomplete variabel saat ketik { ===
const acEl = document.getElementById('autocomplete');
let acItems = [];
let acIndex = 0;

function getAvailableVars() {
    const keys = new Set();
    (contacts || []).forEach(c => {
        if (c && c.vars) {
            Object.keys(c.vars).forEach(k => {
                if (isValidVarKey(k)) keys.add(k);
            });
        }
    });
    keys.add('phone');
    return [...keys].sort();
}

function showAutocomplete(filter = '') {
    const all = getAvailableVars();
    const vars = all.filter(v => v.toLowerCase().includes(filter.toLowerCase()));
    console.log('[autocomplete] available:', all, 'filter:', filter, 'matched:', vars, 'contacts sample:', contacts[0]);
    if (!vars.length) { hideAutocomplete(); return; }

    acItems = vars;
    acIndex = 0;
    renderAutocomplete();
    acEl.classList.remove('hidden');
}

function renderAutocomplete() {
    acEl.innerHTML = '';
    acItems.forEach((v, i) => {
        const item = document.createElement('div');
        item.className = 'ac-item' + (i === acIndex ? ' active' : '');
        item.textContent = '{' + v + '}';
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            pickAutocomplete(i);
        });
        acEl.appendChild(item);
    });
}

function hideAutocomplete() {
    acEl.classList.add('hidden');
    acItems = [];
}

function pickAutocomplete(idx) {
    const v = acItems[idx];
    if (!v) return;

    const value = messageEl.value;
    const cursor = messageEl.selectionStart;
    // Cari posisi { terakhir sebelum cursor
    const braceIdx = value.lastIndexOf('{', cursor - 1);
    if (braceIdx === -1) return;

    const before = value.slice(0, braceIdx);
    const after = value.slice(cursor);
    const replacement = '{' + v + '}';
    messageEl.value = before + replacement + after;
    const newPos = before.length + replacement.length;
    messageEl.setSelectionRange(newPos, newPos);
    messageEl.focus();
    messageEl.dispatchEvent(new Event('input'));
    hideAutocomplete();
}

messageEl.addEventListener('input', () => {
    const value = messageEl.value;
    const cursor = messageEl.selectionStart;
    const braceIdx = value.lastIndexOf('{', cursor - 1);

    if (braceIdx === -1) { hideAutocomplete(); return; }
    // Pastikan tidak ada } setelah brace dan sebelum cursor
    const segment = value.slice(braceIdx + 1, cursor);
    if (/[}\s]/.test(segment)) { hideAutocomplete(); return; }

    showAutocomplete(segment);
});

messageEl.addEventListener('keydown', (e) => {
    if (acEl.classList.contains('hidden')) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        acIndex = (acIndex + 1) % acItems.length;
        renderAutocomplete();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        acIndex = (acIndex - 1 + acItems.length) % acItems.length;
        renderAutocomplete();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickAutocomplete(acIndex);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideAutocomplete();
    }
});

messageEl.addEventListener('blur', () => setTimeout(hideAutocomplete, 150));

// === Preview formatting ===
const previewEl = document.getElementById('preview');

function renderPreview() {
    const text = messageEl.value;
    if (!text.trim()) {
        previewEl.classList.remove('show');
        return;
    }

    // Sample dari kontak pertama untuk preview
    const sample = contacts[0];
    let rendered = text;
    if (sample) {
        rendered = rendered.replace(/\{(\w+)\}/g, (m, key) => {
            if (key === 'phone') return sample.phone;
            return sample.vars?.[key] ?? m;
        });
    }

    previewEl.innerHTML = '<b style="color:#666;font-weight:normal;font-size:10px">PREVIEW:</b><br>' + waToHtml(rendered);
    previewEl.classList.add('show');
}

function waToHtml(text) {
    // Escape HTML dulu
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Mono triple-backtick (proses dulu sebelum single-char)
    text = text.replace(/```([^`\n]+)```/g, '<code>$1</code>');
    // Bold *text*
    text = text.replace(/(^|\s)\*([^\*\n]+)\*(?=\s|$|[.,!?])/g, '$1<b>$2</b>');
    // Italic _text_
    text = text.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?])/g, '$1<i>$2</i>');
    // Strike ~text~
    text = text.replace(/(^|\s)~([^~\n]+)~(?=\s|$|[.,!?])/g, '$1<s>$2</s>');
    return text;
}

messageEl.addEventListener('input', renderPreview);

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
    return k && !/^__empty/i.test(k);
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

// === Media attachment ===
const mediaInputEl = document.getElementById('mediaInput');
const mediaInfoEl = document.getElementById('mediaInfo');

mediaInputEl.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) {
        media = null;
        mediaInfoEl.textContent = '';
        return;
    }

    const MAX = 60 * 1024 * 1024; // 60MB
    if (file.size > MAX) {
        mediaInfoEl.textContent = `File terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks 60MB.`;
        mediaInputEl.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        media = { name: file.name, type: file.type, dataUrl: reader.result };
        mediaInfoEl.textContent = `Lampiran: ${file.name} (${(file.size / 1024).toFixed(1)} KB) — ${detectMediaKind(file)}`;
    };
    reader.onerror = () => {
        mediaInfoEl.textContent = 'Gagal baca file.';
    };
    reader.readAsDataURL(file);
});

function detectMediaKind(file) {
    if (file.type.startsWith('image/')) return 'foto';
    if (file.type.startsWith('video/')) return 'video';
    return 'dokumen';
}

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

function checkRunning() {
    chrome.runtime.sendMessage({ type: 'IS_RUNNING' }, (res) => {
        const running = !!res?.running;
        startBtn.style.display = running ? 'none' : '';
        stopBtn.style.display = running ? '' : 'none';
    });
}
checkRunning();
setInterval(checkRunning, 800);

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
        maxDelay,
        media // { name, type, dataUrl } | null
    });

    statusEl.textContent = 'Memulai...';
    startBtn.style.display = 'none';
    stopBtn.style.display = '';
});

stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_BULK' });
    statusEl.textContent = 'Permintaan stop dikirim...';
});
