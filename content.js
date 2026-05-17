chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PING') {
        sendResponse({ pong: true });
        return false;
    }
    if (msg.type === 'SEND_TO_NUMBER') {
        sendToNumber(msg.phone, msg.message, msg.media)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ ok: false, reason: err.message }));
        return true;
    }
    return false;
});

async function sendToNumber(phone, message, media) {
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

    // 6a. Jika ada media — paste file langsung ke footer (mensimulasikan Ctrl+V)
    if (media && media.dataUrl) {
        const file = dataUrlToFile(media.dataUrl, media.name, media.type);
        const isImageOrVideo = (media.type || '').startsWith('image/') || (media.type || '').startsWith('video/');

        footer.focus();
        await sleep(200);

        const dt = new DataTransfer();
        dt.items.add(file);

        const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
        });
        try { Object.defineProperty(pasteEvent, 'clipboardData', { value: dt }); } catch (_) {}

        footer.dispatchEvent(pasteEvent);

        // Setelah paste, WA buka preview overlay. Tunggu caption box muncul.
        const captionBox = await waitFor(() => getCaptionBox(), 8000);
        if (!captionBox) return { ok: false, reason: 'caption_box_not_ready' };

        // Caption hanya untuk foto/video. Dokumen tidak menerima caption di paste flow.
        if (isImageOrVideo && message && message.trim()) {
            await typeIntoBox(captionBox, message);
            await sleep(300);
        }

        const sendBtnMedia = await waitFor(() => findSendButton(), 5000);
        if (!sendBtnMedia) return { ok: false, reason: 'send_btn_after_media_not_found' };
        sendBtnMedia.click();
        await sleep(1500); // tunggu preview tertutup

        // Untuk dokumen: kirim pesan teks sebagai chat terpisah setelah file terkirim
        if (!isImageOrVideo && message && message.trim()) {
            const textFooter = await waitFor(() => getFooterTextbox(), 5000);
            if (textFooter) {
                await typeIntoBox(textFooter, message);
                await sleep(300);
                const textSendBtn = findSendButton();
                if (textSendBtn) textSendBtn.click();
                else dispatchEnter(textFooter);
                await sleep(500);
            }
        }

        return { ok: true, method: 'paste' };
    }

    // 6b. Pesan teks biasa
    await typeIntoBox(footer, message);
    await sleep(300);

    const sendBtn = findSendButton();
    if (sendBtn) {
        sendBtn.click();
        return { ok: true, method: 'click' };
    }

    dispatchEnter(footer);
    return { ok: true, method: 'enter' };
}

function dataUrlToFile(dataUrl, name, type) {
    const [meta, b64] = dataUrl.split(',');
    const mime = type || (meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream');
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new File([u8], name, { type: mime });
}

function getCaptionBox() {
    // Setelah attach, muncul textbox baru "Add a caption" / "Tambahkan keterangan"
    const boxes = document.querySelectorAll('div[contenteditable="true"][role="textbox"]');
    for (const box of boxes) {
        const label = (box.getAttribute('aria-label') || '') + ' ' + (box.getAttribute('data-tab') || '');
        if (/caption|keterangan|add a/i.test(label)) return box;
    }
    // Fallback: textbox terakhir (overlay biasanya di atas footer asli)
    return boxes[boxes.length - 1] || null;
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

    // Normalisasi line ending (CRLF / CR → LF), lalu pecah per baris.
    // execCommand('insertText') tidak memproses \n di dalam contenteditable,
    // jadi kita insert baris demi baris dan sisipkan line break manual via
    // dispatch InputEvent('insertLineBreak') yang dipahami oleh editor WA.
    const normalized = String(text).replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length) {
            document.execCommand('insertText', false, lines[i]);
        }
        if (i < lines.length - 1) {
            insertLineBreak(box);
        }
    }
    await sleep(400);
}

function insertLineBreak(box) {
    // Coba beforeinput dulu — editor modern WA Web mendengarkan event ini.
    let handled = false;
    try {
        const ev = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertLineBreak',
            data: null
        });
        handled = !box.dispatchEvent(ev); // true berarti preventDefault dipanggil → editor handle
    } catch (_) {}

    if (!handled) {
        // Fallback 1: execCommand insertLineBreak (sebagian Chromium support).
        try {
            const ok = document.execCommand('insertLineBreak', false, null);
            if (ok) return;
        } catch (_) {}

        // Fallback 2: sisipkan <br> manual via Selection/Range API supaya tetap
        // menghasilkan line break visual di contenteditable.
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const br = document.createElement('br');
            range.insertNode(br);
            range.setStartAfter(br);
            range.setEndAfter(br);
            sel.removeAllRanges();
            sel.addRange(range);
            box.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertLineBreak' }));
        }
    }
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
