# WA Bulk Sender

A Chrome extension for sending bulk WhatsApp messages via WhatsApp Web with randomized delays to mimic natural human behavior.

## Features

- **Bulk messaging** — send to hundreds of contacts in one session
- **Import contacts** from Excel (`.xlsx`/`.xls`) or CSV files
- **Manual input** — paste numbers separated by newlines, commas, or spaces
- **Personalized messages** — use `{column_name}` variables from your spreadsheet (e.g. `{nama}`, `{kota}`)
- **Media attachments** — attach images, videos, PDFs, Office documents, or text files
- **Formatting toolbar** — bold, italic, strikethrough, monospace, bullet list, quote with one click (or `Ctrl+B` / `Ctrl+I`)
- **Live message preview** — see how the final message looks before sending
- **Randomized delay** — configurable min/max delay (seconds) between sends to reduce ban risk
- **Persistent state** — contacts, message template, and delay settings are saved across sessions

## Installation

1. Clone or download this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.
5. Open [WhatsApp Web](https://web.whatsapp.com) and scan the QR code.

## Usage

1. Click the extension icon to open the popup.
2. **Import contacts** via Excel/CSV or type numbers manually and click **Tambah ke Daftar**.
3. (Optional) **Attach a file** using the media input.
4. Write your **message template**. Use `{column_name}` for personalized variables that map to columns in your spreadsheet.
5. Set **Delay Min** and **Delay Max** (minimum 3 seconds each).
6. Click **Mulai Kirim** to start. Click **Stop** to abort at any time.

### Variable substitution example

Spreadsheet columns: `nomor`, `nama`, `kota`

```
Halo *{nama}*, undangan dari {kota} sudah siap. Silakan konfirmasi kehadiranmu!
```

The extension automatically detects the phone number column using common aliases (`nomor`, `no_hp`, `whatsapp`, `hp`, etc.).

## Delay recommendation

| Use case | Min delay | Max delay |
|---|---|---|
| Safe / low volume | 15s | 30s |
| Moderate volume | 10s | 25s |
| High volume (risky) | 5s | 15s |

Using very short delays increases the risk of a temporary WhatsApp ban.

## File structure

```
├── manifest.json       # Extension manifest (MV3)
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic (contacts, formatting, send trigger)
├── content.js          # WhatsApp Web automation (injected into the page)
├── background.js       # Service worker (orchestrates the send queue)
├── style.css           # Popup styles
└── xlsx.full.min.js    # SheetJS library for Excel/CSV parsing
```

## Permissions

| Permission | Reason |
|---|---|
| `tabs` | Detect and communicate with the active WhatsApp Web tab |
| `storage` | Persist contacts, message template, and delay settings |
| `scripting` | Inject `content.js` to interact with WhatsApp Web DOM |
| `https://web.whatsapp.com/*` | Host permission for the above |

## Disclaimer

This extension automates WhatsApp Web for personal productivity. Use responsibly and in compliance with [WhatsApp's Terms of Service](https://www.whatsapp.com/legal/terms-of-service). Excessive automated messaging may result in your account being temporarily or permanently banned.
