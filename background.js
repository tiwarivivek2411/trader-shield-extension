/**
 * TraderShield Background Service Worker (Multi-Broker: Zerodha Kite & mStock)
 */

importScripts('utils/expiry_parser.js');

const DEFAULT_SETTINGS = {
  blockFundsDuringMarketHours: true,
  blockZeroDteOptions: true,
  enableAntiTamperLock: false,
  cooldownUntil: null,
  lockPin: null
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    chrome.storage.sync.set(stored);
    console.log('🛡️ TraderShield Multi-Broker Guard initialized:', stored);
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_STATUS') {
    const isMarket = isMarketHours();
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      sendResponse({
        isMarketHours: isMarket,
        settings: settings
      });
    });
    return true;
  }

  if (message.action === 'UPDATE_SETTINGS') {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (currentSettings) => {
      const now = Date.now();
      if (currentSettings.cooldownUntil && now < currentSettings.cooldownUntil) {
        const remainingHours = Math.ceil((currentSettings.cooldownUntil - now) / (1000 * 3600));
        sendResponse({
          success: false,
          error: `🔒 Anti-Tamper Cooldown Active! You cannot disable guardrails for another ${remainingHours} hours.`
        });
        return;
      }

      chrome.storage.sync.set(message.newSettings, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (message.action === 'START_COOLDOWN') {
    const twelveHoursInMs = 12 * 60 * 60 * 1000;
    const cooldownUntil = Date.now() + twelveHoursInMs;
    chrome.storage.sync.set({ cooldownUntil }, () => {
      sendResponse({ success: true, cooldownUntil });
    });
    return true;
  }
});
