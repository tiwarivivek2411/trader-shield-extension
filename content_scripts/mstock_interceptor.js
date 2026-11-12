/**
 * TraderShield - Universal mStock Content Script Interceptor
 * Injected on *.mstock.com and *.mstock.trade
 */

(function () {
  console.log('🛡️ TraderShield Universal Interceptor active on mStock');

  function injectPageScript() {
    try {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content_scripts/page_interceptor.js');
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);
    } catch (e) {
      console.error('TraderShield: Failed to inject page script on mStock:', e);
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

  // Single Banner Creator (Safe, non-recursive)
  function showSingleWarningBanner(targetContainer, message) {
    if (targetContainer.querySelector('.tradershield-banner')) {
      return; // Banner already exists, do not mutate DOM
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
      clear: both !important;
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
          <h2 style="margin: 0 0 10px 0; color: #1f1f1f; font-size: 20px;">mStock Fund Additions Blocked</h2>
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

  // Global Capture-Phase Click Interceptor
  document.addEventListener('click', (e) => {
    if (!settings.blockZeroDteOptions) return;

    const target = e.target;
    if (!target) return;

    const text = (target.innerText || target.textContent || '').toUpperCase();
    const isOrderButton = text.includes('BUY') || text.includes('SELL') || text.includes('PLACE') || text.includes('SUBMIT') || text.includes('CONFIRM');

    if (isOrderButton || target.tagName === 'BUTTON' || target.type === 'submit') {
      let container = target.closest('[role="dialog"], .modal, .dialog, .popup, .drawer, .order-pad, .order-slip, form');
      if (!container) {
        container = document.querySelector('[role="dialog"], .order-pad, .order-drawer, form');
      }

      if (container) {
        const fullContainerText = container.innerText || container.textContent || '';
        const expiryInfo = parseExpiryDateFromSymbol(fullContainerText);

        if (expiryInfo.isZeroDte) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          alert(`🚫 TraderShield Alert: 0-DTE Option Order Blocked!\n\nTrading contracts expiring today is disabled by your discipline rules.`);
          return false;
        }
      }
    }
  }, true);

  // Core Processing Routine with Recursion Guard
  let isMutating = false;

  function checkAndApplyLimiters() {
    const isMarket = isMarketHours();

    // 1. FUND ADDITION BLOCKER
    if (settings.blockFundsDuringMarketHours && isMarket) {
      const fundElements = document.querySelectorAll('a, button, div, span');
      fundElements.forEach(el => {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        const href = (el.href || '').toLowerCase();
        if (
          t === 'add fund' || t === 'add funds' || t === 'fund transfer' || t === 'deposit' ||
          href.includes('/fund') || href.includes('/pay') || href.includes('/deposit')
        ) {
          if (!el.dataset.tradershieldHandled) {
            el.dataset.tradershieldHandled = "true";
            el.style.opacity = "0.3";
            el.style.cursor = "not-allowed";

            el.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              showFundBlockedModal();
              return false;
            }, true);
          }
        }
      });
    }

    // 2. 0-DTE OPTION BLOCKER
    if (settings.blockZeroDteOptions) {
      const activeOrderPad = document.querySelector('[role="dialog"], .order-pad, .order-drawer, .buy-sell-modal, form[name="order"]');

      if (activeOrderPad) {
        const existingBanner = activeOrderPad.querySelector('.tradershield-banner');
        const padText = activeOrderPad.innerText || activeOrderPad.textContent || '';
        const expiryInfo = parseExpiryDateFromSymbol(padText);

        if (expiryInfo.isZeroDte) {
          // Disable submit buttons inside active order pad
          const btns = activeOrderPad.querySelectorAll('button, a, input[type="submit"], div[role="button"]');
          btns.forEach(btn => {
            const btnText = (btn.innerText || btn.textContent || btn.value || '').toUpperCase();
            if (btnText.includes('BUY') || btnText.includes('SELL') || btnText.includes('PLACE') || btnText.includes('SUBMIT') || btnText.includes('CONFIRM')) {
              btn.disabled = true;
              btn.style.opacity = '0.2';
              btn.style.pointerEvents = 'none';
              btn.style.filter = 'grayscale(100%)';
            }
          });

          // Show banner ONLY if not already present
          if (!existingBanner) {
            showSingleWarningBanner(activeOrderPad, '0-DTE Option Contract Expiring Today Blocked.');
          }
        } else {
          if (existingBanner) existingBanner.remove();
        }
      } else {
        removeWarningBanners();
      }
    }
  }

  // MutationObserver with Recursion Guard
  const observer = new MutationObserver(() => {
    if (isMutating) return;
    isMutating = true;

    try {
      checkAndApplyLimiters();
    } catch (e) {
      console.warn('TraderShield interceptor error:', e);
    } finally {
      setTimeout(() => { isMutating = false; }, 100);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
