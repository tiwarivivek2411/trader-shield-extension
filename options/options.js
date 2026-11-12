document.addEventListener('DOMContentLoaded', () => {
  const fundsToggle = document.getElementById('block-funds-toggle');
  const zeroDteToggle = document.getElementById('block-zero-dte-toggle');
  const startCooldownBtn = document.getElementById('start-cooldown-btn');
  const cooldownBanner = document.getElementById('cooldown-banner');
  const cooldownBannerText = document.getElementById('cooldown-banner-text');
  const toast = document.getElementById('toast');

  function showToast(msg) {
    toast.innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  chrome.storage.sync.get({
    blockFundsDuringMarketHours: true,
    blockZeroDteOptions: true,
    cooldownUntil: null
  }, (stored) => {
    fundsToggle.checked = stored.blockFundsDuringMarketHours;
    zeroDteToggle.checked = stored.blockZeroDteOptions;

    if (stored.cooldownUntil && Date.now() < stored.cooldownUntil) {
      const remainingHours = Math.ceil((stored.cooldownUntil - Date.now()) / (1000 * 3600));
      cooldownBanner.style.display = 'flex';
      cooldownBannerText.innerText = `Settings are locked for another ${remainingHours} hours. Toggles are disabled to prevent impulse changes.`;
      
      fundsToggle.disabled = true;
      zeroDteToggle.disabled = true;
      startCooldownBtn.disabled = true;
      startCooldownBtn.innerText = `🔒 Cooldown Active (${remainingHours}h remaining)`;
    }
  });

  function saveSetting(key, value) {
    chrome.runtime.sendMessage({
      action: 'UPDATE_SETTINGS',
      newSettings: { [key]: value }
    }, (res) => {
      if (res && !res.success) {
        alert(res.error);
        chrome.storage.sync.get([key], (stored) => {
          if (key === 'blockFundsDuringMarketHours') fundsToggle.checked = stored[key];
          if (key === 'blockZeroDteOptions') zeroDteToggle.checked = stored[key];
        });
      } else {
        showToast('Setting Saved!');
      }
    });
  }

  fundsToggle.addEventListener('change', () => {
    saveSetting('blockFundsDuringMarketHours', fundsToggle.checked);
  });

  zeroDteToggle.addEventListener('change', () => {
    saveSetting('blockZeroDteOptions', zeroDteToggle.checked);
  });

  startCooldownBtn.addEventListener('click', () => {
    if (confirm('🔒 Are you sure you want to lock settings for 12 HOURS? You will NOT be able to turn off guardrails until the timer expires.')) {
      chrome.runtime.sendMessage({ action: 'START_COOLDOWN' }, (res) => {
        if (res && res.success) {
          location.reload();
        }
      });
    }
  });
});
