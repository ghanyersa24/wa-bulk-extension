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
});

async function startBulk({ contacts, message, minDelay, maxDelay }) {
    running = true;
    stopRequested = false;

    const templates = [
        message,
        message + ' 🙏',
        message + '.',
        message + ' 😊'
    ];

    // Reuse one tab for all sends
    const tab = await chrome.tabs.create({
        url: 'https://web.whatsapp.com/',
        active: true
    });

    // Tunggu WhatsApp Web siap (user mungkin perlu scan QR)
    setProgress('Membuka WhatsApp Web... pastikan sudah login (scan QR jika perlu).');
    await waitForWhatsAppReady(tab.id);

    for (let i = 0; i < contacts.length; i++) {
        if (stopRequested) {
            setProgress(`Dihentikan pada ${i}/${contacts.length}`);
            break;
        }

        const contact = contacts[i];
        const template = randomTemplate(templates);
        const finalMessage = parseMessage(template, contact);
        const encoded = encodeURIComponent(finalMessage);
        const url = `https://web.whatsapp.com/send?phone=${contact.phone}&text=${encoded}`;

        setProgress(`(${i + 1}/${contacts.length}) Membuka chat ${contact.name || contact.phone}...`);

        await chrome.tabs.update(tab.id, { url });

        // Tunggu halaman chat siap (input + textbox terisi prefilled text)
        const ready = await waitForChatReady(tab.id);

        if (!ready) {
            setProgress(`(${i + 1}/${contacts.length}) Gagal: nomor ${contact.phone} mungkin tidak valid. Skip.`);
            await sleep(randomDelay(3000, 6000));
            continue;
        }

        // Jeda acak sebelum klik kirim (mensimulasikan manusia)
        await sleep(randomDelay(minDelay * 1000, maxDelay * 1000));

        if (stopRequested) break;

        // Trigger send via content script
        let sendResult;
        try {
            sendResult = await chrome.tabs.sendMessage(tab.id, { type: 'SEND_NOW' });
        } catch (err) {
            sendResult = { ok: false, reason: 'no_response' };
        }

        if (sendResult && sendResult.ok) {
            setProgress(`(${i + 1}/${contacts.length}) Terkirim ke ${contact.name || contact.phone}`);
        } else {
            setProgress(`(${i + 1}/${contacts.length}) Gagal kirim ke ${contact.name || contact.phone} (${sendResult?.reason || 'unknown'})`);
        }

        // Jeda acak setelah kirim
        await sleep(randomDelay(minDelay * 1000, maxDelay * 1000));

        // Istirahat panjang setiap 5 pesan untuk hindari banned
        if ((i + 1) % 5 === 0 && i + 1 < contacts.length) {
            const longBreak = randomDelay(60000, 180000);
            setProgress(`Istirahat ${Math.round(longBreak / 1000)} detik (anti-banned)...`);
            const stepped = await sleepInterruptible(longBreak);
            if (!stepped) break;
        }
    }

    if (!stopRequested) {
        setProgress('Selesai mengirim semua pesan.');
    }

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
                func: () => {
                    // Sidebar chat list muncul = sudah login
                    return !!document.querySelector('#side') ||
                           !!document.querySelector('[data-testid="chat-list"]');
                }
            });
            if (res?.result) return true;
        } catch (_) {
            // tab mungkin masih loading
        }
        await sleep(1500);
    }
    return false;
}

async function waitForChatReady(tabId, maxWaitMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
        if (stopRequested) return false;
        try {
            const [res] = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => {
                    // Cek invalid number popup
                    const invalid = document.querySelector('div[data-testid="popup-contents"]') ||
                                    Array.from(document.querySelectorAll('div'))
                                        .find(d => /Phone number shared via url is invalid|nomor telepon yang dibagikan/i.test(d.textContent || ''));
                    if (invalid) return 'invalid';

                    // Cari textbox kirim pesan (footer)
                    const boxes = document.querySelectorAll('div[contenteditable="true"][role="textbox"]');
                    // footer biasanya box ke-2 (box pertama = search)
                    const footer = boxes[boxes.length - 1];
                    if (footer && footer.textContent && footer.textContent.length > 0) {
                        return 'ready';
                    }
                    return 'pending';
                }
            });
            if (res?.result === 'ready') return true;
            if (res?.result === 'invalid') return false;
        } catch (_) {}
        await sleep(1000);
    }
    return false;
}

function setProgress(text) {
    console.log('[WA Bulk]', text);
    chrome.storage.local.set({ progress: text });
}

function parseMessage(template, contact) {
    return template
        .replaceAll('{name}', contact.name || '')
        .replaceAll('{phone}', contact.phone || '');
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
