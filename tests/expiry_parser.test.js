const assert = require('assert');
const { getISTDate, isMarketHours, parseExpiryDateFromSymbol } = require('../utils/expiry_parser');

console.log('🧪 Running Enhanced Expiry Parser Tests...\n');

const todayRef = new Date(2026, 8, 22); // 22 Sep 2026

// Test 1: Zerodha format 22SEP
const res1 = parseExpiryDateFromSymbol('NIFTY 22SEP 24500 CE', todayRef);
assert.strictEqual(res1.isZeroDte, true, 'Should mark NIFTY 22SEP as 0-DTE');
console.log('✅ Test 1 Passed: Zerodha 22SEP 0-DTE detected');

// Test 2: mStock format 22-SEP-2026
const res2 = parseExpiryDateFromSymbol('NIFTY 22-SEP-2026 24500 CE', todayRef);
assert.strictEqual(res2.isZeroDte, true, 'Should mark mStock 22-SEP-2026 as 0-DTE');
console.log('✅ Test 2 Passed: mStock 22-SEP-2026 0-DTE detected');

// Test 3: mStock numeric format 22/09/2026
const res3 = parseExpiryDateFromSymbol('NIFTY 22/09/2026 24500 CE', todayRef);
assert.strictEqual(res3.isZeroDte, true, 'Should mark numeric 22/09/2026 as 0-DTE');
console.log('✅ Test 3 Passed: mStock numeric 22/09/2026 0-DTE detected');

// Test 4: Keyword Expiry: Today
const res4 = parseExpiryDateFromSymbol('NIFTY 24500 CE (EXPIRY: TODAY)', todayRef);
assert.strictEqual(res4.isZeroDte, true, 'Should mark EXPIRY: TODAY as 0-DTE');
console.log('✅ Test 4 Passed: Keyword EXPIRY: TODAY detected');

// Test 5: Future expiry date (29-09-2026)
const res5 = parseExpiryDateFromSymbol('NIFTY 29-09-2026 24500 CE', todayRef);
assert.strictEqual(res5.isZeroDte, false, 'Should NOT mark 29-09-2026 as 0-DTE');
console.log('✅ Test 5 Passed: Future expiry 29-09-2026 allowed');

console.log('\n🎉 ALL ENHANCED PARSER TESTS PASSED!');
