# 🛡️ TraderShield - Multi-Broker Discipline Guard (Zerodha & mStock)

**TraderShield** is a Chrome Extension (Manifest V3) that enforces strict behavioral risk guardrails on both **Zerodha Kite (`kite.zerodha.com`)** and **mStock by Mirae Asset (`*.mstock.com`, `*.mstock.trade`)**.

---

## ✨ Features

### 1. 🔒 Market Hours Fund Addition Lock
- **Active Hours**: 09:15 AM to 03:30 PM IST (Monday - Friday).
- Automatically hides and disables **"Add Funds"** buttons, sidebar links, and margin deposit popups on both **Zerodha Kite** and **mStock**.
- Displays a modal warning: `"Fund additions are disabled during trading hours to prevent emotional top-ups."`

### 2. 🚫 0-DTE (Same-Day Expiry) Option Blocker
- Automatically parses option contract symbols (e.g. `NIFTY 21SEP 24500 CE`, `NIFTY 21-SEP-2026 24500 CE`, `BANKNIFTY 21SEP26 51000 PE`).
- **DOM Protection**: Disables the **BUY** and **SELL** submit buttons in order pads and injects a prominent red warning banner.
- **Network Level Protection**: Intercepts outgoing `/orders` POST API calls to Zerodha and mStock (`api.mstock.trade`) servers, blocking 0-DTE order placement before transmission.

### 3. ⏱️ 12-Hour Anti-Tamper Cooldown Lock
- Prevents traders from turning off guardrails during emotional loss streaks.
- Activating the Cooldown Lock locks all settings for a mandatory **12-Hour Timer**.

---

## 🚀 How to Install in Chrome / Brave / Edge

1. Open your browser (Chrome, Brave, Edge, or Opera).
2. Go to `chrome://extensions`.
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** in the top left.
5. Select the extension folder:
   `/Users/nileshtiwari/.gemini/antigravity/scratch/trader_shield_extension`
6. Pin **TraderShield 🛡️** to your toolbar!

---

## 🧪 Testing

Run the automated test suite to verify symbol parsing and market hours logic across brokers:

```bash
cd /Users/nileshtiwari/.gemini/antigravity/scratch/trader_shield_extension
node tests/expiry_parser.test.js
```
