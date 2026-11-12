/**
 * TraderShield - Zerodha Kite Content Script Interceptor
 */

(function () {
  console.log('🛡️ TraderShield active on Zerodha Kite');

  function injectPageScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content_scripts/page_interceptor.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('TraderShield: Failed to inject page script:', e);
    }
  }

  injectPageScript();

  let settings = {
    blockFundsDuringMarketHours: true,
    blockZeroDteOptions: true
  };

  chrome.storage.sync.get(settings, (stored) => {
    settings = stored;
  });

  chrome.storage.onChanged.addListener((changes) => {
    for (let key in changes) {
      settings[key] = changes[key].newValue;
    }
  });

  function showSingleWarningBanner(targetContainer, message) {
    if (targetContainer.querySelector('.tradershield-banner')) {
      return;
    }

    const banner = document.createElement('div');
    banner.className = 'tradershield-banner';
    banner.style.cssText = `
      background-color: #fff1f0 !important;
      border: 1px solid #ffa39e !important;
      color: #cf1322 !important;
      padding: 8px 12px !important;
      margin: 8px 12px !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      font-size: 12px !important;
      text-align: center !important;
      box-shadow: 0 2px 6px rgba(255,77,79,0.12) !important;
      display: block !important;
    `;
    banner.innerHTML = `🛡️ <strong>TraderShield Limiter Active</strong>: ${message}`;
    targetContainer.prepend(banner);
  }

  function removeWarningBanners() {
    const banners = document.querySelectorAll('.tradershield-banner');
    banners.forEach(b => b.remove());
  }

  function showFundBlockedModal() {
    let modal = document.getElementById('tradershield-fund-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'tradershield-fund-modal';
      modal.style.cssText = `
        position: fixed !important;
        top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
        background: rgba(0, 0, 0, 0.75) !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        z-index: 9999999 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;
      modal.innerHTML = `
        <div style="background: #ffffff; width: 420px; padding: 28px; border-radius: 12px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
          <div style="font-size: 48px; margin-bottom: 12px;">🔒</div>
          <h2 style="margin: 0 0 10px 0; color: #1f1f1f; font-size: 20px;">Fund Additions Blocked</h2>
          <p style="color: #595959; font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
            Adding funds is disabled during trading hours (<strong>09:15 AM - 03:30 PM IST</strong>) by your TraderShield discipline rules.
          </p>
          <button id="tradershield-close-modal" style="
            background: #1890ff; color: #fff; border: none; padding: 10px 24px;
            font-size: 14px; font-weight: 600; border-radius: 6px; cursor: pointer;
          ">I Understand</button>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('tradershield-close-modal').onclick = () => {
        modal.style.display = 'none';
      };
    } else {
      modal.style.display = 'flex';
    }
  }

  let isMutating = false;

  function checkAndApplyLimiters() {
    const isMarket = isMarketHours();

    if (settings.blockFundsDuringMarketHours && isMarket) {
      const fundElements = document.querySelectorAll(
        'a[href*="/funds"], button.add-funds, .add-funds, button:contains("Add funds")'
      );

      fundElements.forEach(el => {
        if (!el.dataset.tradershieldHandled) {
          el.dataset.tradershieldHandled = "true";
          el.style.opacity = "0.4";
          el.style.cursor = "not-allowed";

          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showFundBlockedModal();
            return false;
          }, true);
        }
      });
    }

    if (settings.blockZeroDteOptions) {
      const activeWindow = document.querySelector('.order-window, .modal-wrapper');

      if (activeWindow) {
        const symbolEl = activeWindow.querySelector('.title, .tradingsymbol, .instrument-name, header');
        if (symbolEl) {
          const symbolText = symbolEl.innerText || symbolEl.textContent;
          const expiryInfo = parseExpiryDateFromSymbol(symbolText);

          if (expiryInfo.isZeroDte) {
            const submitButtons = activeWindow.querySelectorAll('button[type="submit"], #buy-submit, #sell-submit, .button-blue, .button-orange');

            submitButtons.forEach(btn => {
              btn.disabled = true;
              btn.style.opacity = '0.3';
              btn.style.pointerEvents = 'none';
              btn.style.filter = 'grayscale(100%)';
            });

            showSingleWarningBanner(
              activeWindow,
              `<strong>${expiryInfo.symbol}</strong> is a 0-DTE contract expiring today. Order execution is disabled.`
            );
          } else {
            removeWarningBanners();
          }
        } else {
          removeWarningBanners();
        }
      } else {
        removeWarningBanners();
      }
    }
  }

  const observer = new MutationObserver(() => {
    if (isMutating) return;
    isMutating = true;

    try {
      checkAndApplyLimiters();
    } catch(e) {
      console.warn('TraderShield interceptor error:', e);
    } finally {
      setTimeout(() => { isMutating = false; }, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
