/**
 * TraderShield - Multi-Broker Expiry Parser & Market Hours Utility
 * Supports Zerodha Kite, mStock, Dhan, Groww, Upstox symbol & expiry formats.
 */

const MONTH_MAP = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
};

/**
 * Returns current date and time in Indian Standard Time (IST - UTC+5:30)
 */
function getISTDate(date = new Date()) {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 5.5));
}

/**
 * Checks if current time is within Indian Stock Market trading hours:
 * Monday to Friday, 09:15 AM to 03:30 PM IST (excluding weekend).
 */
function isMarketHours(now = getISTDate()) {
  const day = now.getDay();
  // Sunday = 0, Saturday = 6
  if (day === 0 || day === 6) return false;

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const marketStart = 9 * 60 + 15; // 09:15 AM (555 mins)
  const marketEnd = 15 * 60 + 30;   // 03:30 PM (930 mins)

  return timeInMinutes >= marketStart && timeInMinutes <= marketEnd;
}

/**
 * Parses option trading symbol & text strings across Indian brokers
 * (Zerodha, mStock, Dhan, Groww, Upstox) and determines if it expires today.
 *
 * Handles:
 * - "NIFTY 22SEP 24500 CE"
 * - "NIFTY 22-SEP-2026 24500 CE"
 * - "NIFTY 22 SEP 2026"
 * - "NIFTY 22/09/2026 24500 CE"
 * - "22-09-2026" / "22/09/26"
 * - "Expiry: Today" / "Expires Today"
 */
function parseExpiryDateFromSymbol(symbolStr, referenceDate = getISTDate()) {
  if (!symbolStr || typeof symbolStr !== 'string') {
    return { isZeroDte: false, expiryDate: null, symbol: '' };
  }

  const cleanText = symbolStr.toUpperCase().trim();
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // Keyword check: "EXPIRY: TODAY", "EXPIRES TODAY", "EXP: TODAY", "TODAY"
  if (cleanText.includes('EXPIRY: TODAY') || cleanText.includes('EXPIRES TODAY') || cleanText.includes('EXP: TODAY')) {
    return { isZeroDte: true, expiryDate: referenceDate, symbol: cleanText };
  }

  // Pattern 1: Standalone 4-digit year with month name e.g. "22-SEP-2026", "22 SEP 2026"
  let match = cleanText.match(/(\d{1,2})[\s\-]*([A-Z]{3})[\s\-]*(\d{4})(?![0-9])/);

  // Pattern 2: Month name with 2-digit year or no year e.g. "22SEP26", "22SEP", "22 SEP"
  if (!match) {
    match = cleanText.match(/(\d{1,2})[\s\-]*([A-Z]{3})(?:[\s\-]*([0-9]{2})(?![0-9]))?/);
  }

  if (match) {
    const day = parseInt(match[1], 10);
    const monthStr = match[2];
    const rawYearStr = match[3];

    if (MONTH_MAP.hasOwnProperty(monthStr)) {
      const month = MONTH_MAP[monthStr];
      let year = refYear;

      if (rawYearStr) {
        if (rawYearStr.length === 4) {
          year = parseInt(rawYearStr, 10);
        } else if (rawYearStr.length === 2) {
          year = 2000 + parseInt(rawYearStr, 10);
        }
      }

      const expiryDate = new Date(year, month, day);

      const isZeroDte = (
        expiryDate.getFullYear() === refYear &&
        expiryDate.getMonth() === refMonth &&
        expiryDate.getDate() === refDay
      );

      return {
        isZeroDte,
        expiryDate,
        day,
        month: monthStr,
        symbol: cleanText
      };
    }
  }

  // Pattern 3: Numeric date format DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY (e.g., "22/09/2026", "22-09-2026", "22/09/26")
  const numericMatch = cleanText.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1; // 0-indexed month
    let year = parseInt(numericMatch[3], 10);
    if (year < 100) year += 2000;

    const expiryDate = new Date(year, month, day);

    const isZeroDte = (
      expiryDate.getFullYear() === refYear &&
      expiryDate.getMonth() === refMonth &&
      expiryDate.getDate() === refDay
    );

    return {
      isZeroDte,
      expiryDate,
      day,
      month,
      symbol: cleanText
    };
  }

  return { isZeroDte: false, expiryDate: null, symbol: cleanText };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getISTDate,
    isMarketHours,
    parseExpiryDateFromSymbol,
    MONTH_MAP
  };
}
