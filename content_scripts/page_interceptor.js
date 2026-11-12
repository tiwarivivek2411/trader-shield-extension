/**
 * TraderShield Universal Page Script Interceptor
 * Injected directly in page window context to intercept raw Fetch & XMLHttpRequest API calls to mStock & Zerodha servers
 */

(function () {
  console.log('🛡️ TraderShield Universal API Network Interceptor Active');

  const MONTH_MAP = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };

  function checkIsZeroDtePayload(text) {
    if (!text || typeof text !== 'string') return false;

    const cleanStr = text.toUpperCase();
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utc + (3600000 * 5.5));

    const refYear = istNow.getFullYear();
    const refMonth = istNow.getMonth();
    const refDay = istNow.getDate();

    // Check keyword
    if (cleanStr.includes('EXPIRY: TODAY') || cleanStr.includes('EXPIRES TODAY') || cleanStr.includes('EXP: TODAY')) {
      return true;
    }

    // Check 4-digit year pattern
    let match = cleanStr.match(/(\d{1,2})[\s\-]*([A-Z]{3})[\s\-]*(\d{4})(?![0-9])/);
    if (!match) {
      match = cleanStr.match(/(\d{1,2})[\s\-]*([A-Z]{3})(?:[\s\-]*([0-9]{2})(?![0-9]))?/);
    }

    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2];
      const rawYearStr = match[3];

      if (MONTH_MAP.hasOwnProperty(monthStr)) {
        const month = MONTH_MAP[monthStr];
        let year = refYear;
        if (rawYearStr) {
          if (rawYearStr.length === 4) year = parseInt(rawYearStr, 10);
          else if (rawYearStr.length === 2) year = 2000 + parseInt(rawYearStr, 10);
        }

        if (year === refYear && month === refMonth && day === refDay) {
          return true;
        }
      }
    }

    // Check numeric date DD/MM/YYYY or DD-MM-YYYY
    const numericMatch = cleanStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (numericMatch) {
      const day = parseInt(numericMatch[1], 10);
      const month = parseInt(numericMatch[2], 10) - 1;
      let year = parseInt(numericMatch[3], 10);
      if (year < 100) year += 2000;

      if (year === refYear && month === refMonth && day === refDay) {
        return true;
      }
    }

    return false;
  }

  // 1. INTERCEPT FETCH API
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const [resource, config] = args;
    const url = (typeof resource === 'string' ? resource : resource?.url || '').toLowerCase();

    if (config && config.method && config.method.toUpperCase() === 'POST' && config.body) {
      try {
        let bodyStr = config.body;
        if (typeof bodyStr !== 'string' && bodyStr instanceof FormData) {
          bodyStr = new URLSearchParams(bodyStr).toString();
        } else if (typeof bodyStr === 'object') {
          bodyStr = JSON.stringify(bodyStr);
        }

        if (checkIsZeroDtePayload(bodyStr) || checkIsZeroDtePayload(url)) {
          console.error('🚫 TraderShield: Blocked 0-DTE Order Fetch Request:', url);
          alert('🚫 TraderShield Alert: 0-DTE Order Blocked!\n\nTrading contracts expiring today is prohibited by your discipline rules.');
          return Promise.reject(new Error('TraderShield: 0-DTE Order Execution Blocked'));
        }
      } catch (e) {
        console.warn('TraderShield fetch interceptor error:', e);
      }
    }

    return originalFetch.apply(this, args);
  };

  // 2. INTERCEPT XMLHTTPREQUEST API
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._tradershieldUrl = url;
    this._tradershieldMethod = method;
    return originalXhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    if (this._tradershieldMethod && this._tradershieldMethod.toUpperCase() === 'POST' && body) {
      try {
        let bodyStr = body;
        if (typeof bodyStr !== 'string' && bodyStr instanceof FormData) {
          bodyStr = new URLSearchParams(bodyStr).toString();
        } else if (typeof bodyStr === 'object') {
          bodyStr = JSON.stringify(bodyStr);
        }

        if (checkIsZeroDtePayload(bodyStr) || checkIsZeroDtePayload(this._tradershieldUrl || '')) {
          console.error('🚫 TraderShield: Blocked 0-DTE Order XHR Request:', this._tradershieldUrl);
          alert('🚫 TraderShield Alert: 0-DTE Order Blocked!\n\nTrading contracts expiring today is prohibited by your discipline rules.');
          throw new Error('TraderShield: 0-DTE Order Execution Blocked');
        }
      } catch (e) {
        if (e.message.includes('TraderShield')) throw e;
        console.warn('TraderShield XHR interceptor error:', e);
      }
    }
    return originalXhrSend.call(this, body);
  };
})();
