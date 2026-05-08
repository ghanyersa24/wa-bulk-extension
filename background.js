let running = false;
let stopRequested = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'START_BULK') {
        if (running) {
            sendResponse({ ok: false, reason: 'already_running' });
            return false;
        }
        startBulk(msg).catch(err => {
            console.error(err);
            setProgress('Error: ' + err.message);
            running = false;
        });
        sendResponse({ ok: true });
        return false;
    }

    if (msg.type === 'STOP_BULK') {
        stopRequested = true;
        sendResponse({ ok: true });
        return false;
    }

    if (msg.type === 'CHECK_WA_TAB') {
        findWhatsAppTab().then(tab => sendResponse({ ok: !!tab, tabId: tab?.id || null }));
        return true;
    }

    if (msg.type === 'IS_RUNNING') {
        sendResponse({ running });
        return false;
    }
});

async function findWhatsAppTab() {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    return tabs[0] || null;
}

async function tabExists(tabId) {
    try { await chrome.tabs.get(tabId); return true; } catch { return false; }
}

async function ensureContentScript(tabId) {
    // Ping dulu — kalau content script sudah ada, tidak perlu inject ulang
    try {
        const res = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        if (res?.pong) return true;
    } catch (_) {}

    // Inject content.js ke tab (untuk tab WA yang dibuka sebelum extension di-reload)
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        });
        await sleep(300);
        return true;
    } catch (err) {
        console.warn('[WA Bulk] inject content gagal:', err);
        return false;
    }
}

async function startBulk({ contacts, message, minDelay, maxDelay, media }) {
    running = true;
    stopRequested = false;

    const templates = [
        message,
        message + ' 🙏',
        message + '.',
        message + ' 😊'
    ];

    const tab = await findWhatsAppTab();
    if (!tab) {
        setProgress('Tab WhatsApp Web tidak ditemukan. Buka https://web.whatsapp.com/ dan login dulu.');
        running = false;
        return;
    }

    setProgress('Memeriksa status login WhatsApp Web...');
    const loggedIn = await waitForWhatsAppReady(tab.id, 10000);
    if (!loggedIn) {
        setProgress('Belum login di WhatsApp Web. Silakan scan QR di tab WA, lalu coba lagi.');
        running = false;
        return;
    }

    for (let i = 0; i < contacts.length; i++) {
        if (stopRequested) {
            setProgress(`Dihentikan pada ${i}/${contacts.length}`);
            break;
        }

        const contact = contacts[i];
        const finalMessage = parseMessage(randomTemplate(templates), contact);

        setProgress(`(${i + 1}/${contacts.length}) Memproses ${contact.phone}...`);

        if (!await tabExists(tab.id)) {
            setProgress('Tab WhatsApp Web ditutup. Proses dihentikan.');
            break;
        }

        // Jeda acak sebelum mulai (mensimulasikan manusia)
        await sleep(randomDelay(minDelay * 1000, maxDelay * 1000));
        if (stopRequested) break;

        await ensureContentScript(tab.id);

        let sendResult;
        try {
            sendResult = await chrome.tabs.sendMessage(tab.id, {
                type: 'SEND_TO_NUMBER',
                phone: contact.phone,
                message: finalMessage,
                media // diteruskan ke content script
            });
        } catch (err) {
            sendResult = { ok: false, reason: 'no_response: ' + (err?.message || 'unknown') };
        }

        if (sendResult && sendResult.ok) {
            setProgress(`(${i + 1}/${contacts.length}) Terkirim ke ${contact.phone}`);
        } else {
            setProgress(`(${i + 1}/${contacts.length}) Gagal kirim ke ${contact.phone} (${sendResult?.reason || 'unknown'})`);
        }

        // Kalau ada media, kasih waktu ekstra untuk upload selesai
        const extraWait = media ? randomDelay(3000, 6000) : 0;
        await sleep(randomDelay(minDelay * 1000, maxDelay * 1000) + extraWait);

        if ((i + 1) % 5 === 0 && i + 1 < contacts.length) {
            const longBreak = randomDelay(60000, 180000);
            setProgress(`Istirahat ${Math.round(longBreak / 1000)} detik (anti-banned)...`);
            const stepped = await sleepInterruptible(longBreak);
            if (!stepped) break;
        }
    }

    if (!stopRequested) setProgress('Selesai mengirim semua pesan.');
    running = false;
    stopRequested = false;
}

async function waitForWhatsAppReady(tabId, maxWaitMs = 120000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        if (stopRequested) return false;
        try {
            const [res] = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => !!document.querySelector('#side') || !!document.querySelector('[data-testid="chat-list"]')
            });
            if (res?.result) return true;
        } catch (_) {}
        await sleep(1500);
    }
    return false;
}

function setProgress(text) {
    console.log('[WA Bulk]', text);
    chrome.storage.local.set({ progress: text });
}

function parseMessage(template, contact) {
    let result = template.replaceAll('{phone}', contact.phone || '');
    if (contact.vars) {
        for (const [key, val] of Object.entries(contact.vars)) {
            const re = new RegExp(`\\{${escapeRegex(key)}\\}`, 'gi');
            result = result.replace(re, val ?? '');
        }
    }
    // alias umum
    result = result.replaceAll('{name}', (contact.vars?.nama || contact.vars?.name || ''));
    return result;
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function randomTemplate(templates) {
    return templates[Math.floor(Math.random() * templates.length)];
}

function randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleepInterruptible(ms) {
    const step = 500;
    let elapsed = 0;
    while (elapsed < ms) {
        if (stopRequested) return false;
        await sleep(Math.min(step, ms - elapsed));
        elapsed += step;
    }
    return true;
}
