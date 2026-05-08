chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'SEND_NOW') return false;

    sendNow().then(result => sendResponse(result))
             .catch(err => sendResponse({ ok: false, reason: err.message }));

    return true; // keep message channel open for async sendResponse
});

async function sendNow() {
    const ready = await waitUntilReady();
    if (!ready) return { ok: false, reason: 'textbox_not_ready' };

    // Pastikan input ter-focus & berisi pesan dari URL prefilled
    const footer = getFooterTextbox();
    if (!footer) return { ok: false, reason: 'no_footer' };

    footer.focus();

    // Beberapa selector tombol kirim (WA mengubahnya beberapa kali)
    const selectors = [
        'button[aria-label="Send"]',
        'button[aria-label="Kirim"]',
        'span[data-icon="send"]',
        'span[data-icon="wds-ic-send-filled"]',
        '[data-testid="compose-btn-send"]'
    ];

    let sendBtn = null;
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
            sendBtn = el.closest('button') || el;
            break;
        }
    }

    if (sendBtn) {
        sendBtn.click();
        return { ok: true, method: 'click' };
    }

    // Fallback: tekan Enter di textbox
    const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13
    });
    footer.dispatchEvent(enterEvent);

    return { ok: true, method: 'enter' };
}

function getFooterTextbox() {
    const boxes = document.querySelectorAll('div[contenteditable="true"][role="textbox"]');
    if (!boxes.length) return null;
    // box terakhir = footer kirim pesan; box pertama biasanya search
    return boxes[boxes.length - 1];
}

async function waitUntilReady() {
    let retry = 0;
    while (retry < 30) {
        const footer = getFooterTextbox();
        // pastikan ada textbox dan sudah ada teks prefilled (dari URL ?text=)
        if (footer && (footer.textContent || '').trim().length > 0) {
            return true;
        }
        await sleep(1000);
        retry++;
    }
    return false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
