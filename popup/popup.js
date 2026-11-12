document.addEventListener('DOMContentLoaded', () => {
  const clockEl = document.getElementById('ist-clock');
  const marketBadge = document.getElementById('market-status-badge');
  const fundStatusPill = document.getElementById('fund-lock-status');
  const zeroDteStatusPill = document.getElementById('zero-dte-status');
  const cooldownCard = document.getElementById('cooldown-alert');
  const cooldownText = document.getElementById('cooldown-text');
  const settingsBtn = document.getElementById('open-settings-btn');

  function updateClockAndStatus() {
    const istNow = getISTDate();
    const timeStr = istNow.toLocaleTimeString('en-IN', { hour12: true });
    clockEl.innerText = `${timeStr} IST`;

    const isMarket = isMarketHours(istNow);
    if (isMarket) {
      marketBadge.innerText = '🟢 Market Open';
      marketBadge.className = 'badge open';
    } else {
      marketBadge.innerText = '🔴 Market Closed';
      marketBadge.className = 'badge closed';
    }
  }

  setInterval(updateClockAndStatus, 1000);
  updateClockAndStatus();

  chrome.storage.sync.get({
    blockFundsDuringMarketHours: true,
    blockZeroDteOptions: true,
    cooldownUntil: null
  }, (settings) => {
    fundStatusPill.innerText = settings.blockFundsDuringMarketHours ? 'ON' : 'OFF';
    fundStatusPill.className = `status-pill ${settings.blockFundsDuringMarketHours ? 'active' : 'inactive'}`;

    zeroDteStatusPill.innerText = settings.blockZeroDteOptions ? 'ON' : 'OFF';
    zeroDteStatusPill.className = `status-pill ${settings.blockZeroDteOptions ? 'active' : 'inactive'}`;

    if (settings.cooldownUntil && Date.now() < settings.cooldownUntil) {
      const remainingHours = Math.ceil((settings.cooldownUntil - Date.now()) / (1000 * 3600));
      cooldownCard.style.display = 'flex';
      cooldownText.innerText = `🔒 Anti-Tamper Cooldown Active (${remainingHours}h remaining)`;
    } else {
      cooldownCard.style.display = 'none';
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
