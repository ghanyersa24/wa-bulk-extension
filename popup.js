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

let phones = []; // array of strings (digits only)

// restore
chrome.storage.local.get(['phones', 'message', 'minDelay', 'maxDelay'], (data) => {
    if (Array.isArray(data.phones)) phones = data.phones;
    if (data.message) messageEl.value = data.message;
    if (data.minDelay) minDelayEl.value = data.minDelay;
    if (data.maxDelay) maxDelayEl.value = data.maxDelay;
    renderChips();
});

function persist() {
    chrome.storage.local.set({
        phones,
        message: messageEl.value,
        minDelay: minDelayEl.value,
        maxDelay: maxDelayEl.value
    });
}

[messageEl, minDelayEl, maxDelayEl].forEach(el => {
    el.addEventListener('input', persist);
});

function renderChips() {
    chipsEl.innerHTML = '';
    phones.forEach((phone, idx) => {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = phone;

        const x = document.createElement('span');
        x.className = 'x';
        x.textContent = '×';
        x.title = 'Hapus';
        x.addEventListener('click', () => {
            phones.splice(idx, 1);
            persist();
            renderChips();
        });

        chip.appendChild(x);
        chipsEl.appendChild(chip);
    });
    countEl.textContent = phones.length;
}

function addPhonesFromInput() {
    const raw = contactInputEl.value;
    if (!raw.trim()) return;

    const tokens = raw.split(/[\s,;\n]+/).map(t => t.replace(/[^\d]/g, '')).filter(Boolean);
    let added = 0, skipped = 0;
    for (const t of tokens) {
        if (t.length < 8) { skipped++; continue; }
        if (phones.includes(t)) { skipped++; continue; }
        phones.push(t);
        added++;
    }
    contactInputEl.value = '';
    persist();
    renderChips();
    statusEl.textContent = `Ditambahkan: ${added}, dilewati (duplikat/invalid): ${skipped}`;
}

addBtn.addEventListener('click', addPhonesFromInput);

// Enter (tanpa Shift) di textarea = tambah
contactInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        addPhonesFromInput();
    }
});

clearAllBtn.addEventListener('click', () => {
    if (phones.length && !confirm('Hapus semua nomor?')) return;
    phones = [];
    persist();
    renderChips();
});

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

// Bersihkan progress lama saat popup dibuka
chrome.storage.local.remove('progress');

startBtn.addEventListener('click', () => {
    const message = messageEl.value.trim();
    const minDelay = parseInt(minDelayEl.value) || 10;
    const maxDelay = parseInt(maxDelayEl.value) || 25;

    if (!message) { alert('Pesan tidak boleh kosong'); return; }
    if (minDelay > maxDelay) { alert('Delay min tidak boleh lebih besar dari max'); return; }
    if (!phones.length) { alert('Tambahkan minimal 1 nomor'); return; }

    const contacts = phones.map(p => ({ name: '', phone: p }));

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
