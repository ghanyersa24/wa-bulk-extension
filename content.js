chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PING') {
        sendResponse({ pong: true });
        return false;
    }
    if (msg.type === 'SEND_TO_NUMBER') {
        sendToNumber(msg.phone, msg.message)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ ok: false, reason: err.message }));
        return true;
    }
    return false;
});

async function sendToNumber(phone, message) {
    // 1. Pastikan WA sudah load (sidebar muncul)
    if (!await waitFor(() => document.querySelector('#side, [data-testid="chat-list"]'), 15000)) {
        return { ok: false, reason: 'wa_not_ready' };
    }

    // 2. Cari search bar utama di sidebar
    const searchBox = await waitFor(() => findSidebarSearch(), 8000);
    if (!searchBox) return { ok: false, reason: 'search_box_not_found' };

    // 3. Ketik nomor di search bar
    await typeIntoSearch(searchBox, phone);

    // 4. Tekan Enter di search bar untuk membuka chat hasil pencarian
    await sleep(400);
    pressEnterOn(searchBox);

    // 5. Tunggu footer textbox (kolom ketik pesan) muncul
    const footer = await waitFor(() => getFooterTextbox(), 10000);
    if (!footer) return { ok: false, reason: 'footer_not_ready' };

    await typeIntoBox(footer, message);
    await sleep(300);

    // 6. Klik tombol kirim
    const sendBtn = findSendButton();
    if (sendBtn) {
        sendBtn.click();
        return { ok: true, method: 'click' };
    }

    dispatchEnter(footer);
    return { ok: true, method: 'enter' };
}

function findSidebarSearch() {
    const selectors = [
        'input[role="textbox"][aria-label*="Search" i]',
        'input[role="textbox"][aria-label*="Cari" i]',
        'input[type="text"][data-tab="3"]',
        'div[contenteditable="true"][role="textbox"][data-tab="3"]'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el;
    }
    return null;
}

function findContactResult(phone) {
    // WA versi baru: action "Message <nomor>" — klik parent listitem-nya
    const direct = document.querySelector('[data-testid="message-yourself-row"]');
    if (direct) {
        return direct.closest('div[role="listitem"], div[role="row"], div[role="button"]') || direct;
    }

    const items = document.querySelectorAll('div[role="listitem"], div[role="row"]');
    for (const item of items) {
        const text = (item.textContent || '').replace(/[^\d]/g, '');
        if (text && text.includes(phone)) return item;
    }
    return null;
}

function realClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, button: 0 };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerType: 'mouse', isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerType: 'mouse', isPrimary: true }));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
}

function findSendButton() {
    const selectors = [
        '[data-testid="wds-ic-send-filled"]',
        'button[aria-label="Send"]',
        'button[aria-label="Kirim"]',
        'span[data-icon="send"]',
        'span[data-icon="wds-ic-send-filled"]'
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) return el.closest('button') || el;
    }
    return null;
}

function getFooterTextbox() {
    const boxes = document.querySelectorAll('div[contenteditable="true"][role="textbox"]');
    if (!boxes.length) return null;
    for (let i = boxes.length - 1; i >= 0; i--) {
        const label = (boxes[i].getAttribute('aria-label') || '') + ' ' + (boxes[i].getAttribute('data-tab') || '');
        if (/message|pesan|type/i.test(label)) return boxes[i];
    }
    return boxes[boxes.length - 1];
}

async function typeIntoSearch(input, text) {
    input.focus();

    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
        const proto = input.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(input, text);
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        await typeIntoBox(input, text);
    }
}

async function typeIntoBox(box, text) {
    box.focus();
    // Clear isi dulu
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(50);

    // Insert sekali pakai execCommand — ini sudah trigger input event secara otomatis
    document.execCommand('insertText', false, text);
    await sleep(400);
}

function dispatchEnter(target) {
    pressEnterOn(target);
}

function pressEnterOn(target) {
    // Buat KeyboardEvent dengan keyCode/which yang berfungsi (perlu Object.defineProperty
    // karena beberapa browser mengabaikan keyCode di constructor)
    const make = (type) => {
        const ev = new KeyboardEvent(type, {
            bubbles: true,
            cancelable: true,
            key: 'Enter',
            code: 'Enter',
            location: 0,
            repeat: false,
            isComposing: false,
            charCode: 0,
            keyCode: 13,
            which: 13
        });
        // Force keyCode/which via defineProperty (beberapa engine read-only di constructor)
        try {
            Object.defineProperty(ev, 'keyCode', { get: () => 13 });
            Object.defineProperty(ev, 'which', { get: () => 13 });
        } catch (_) {}
        return ev;
    };

    target.dispatchEvent(make('keydown'));
    target.dispatchEvent(make('keypress'));
    target.dispatchEvent(make('keyup'));
}

function pressEscape() {
    const opts = { bubbles: true, cancelable: true, key: 'Escape', code: 'Escape', keyCode: 27, which: 27 };
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', opts));
    document.body.dispatchEvent(new KeyboardEvent('keydown', opts));
}

async function waitFor(fn, maxMs = 8000, intervalMs = 300) {
    const start = Date.now();
    while (Date.now() - start < maxMs) {
        try {
            const v = fn();
            if (v) return v;
        } catch (_) {}
        await sleep(intervalMs);
    }
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
