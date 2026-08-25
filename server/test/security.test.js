import assert from 'assert';
import path from 'path';
import { getBaseLogDir, validateSafePath, setBaseLogDir } from '../utils/pathSecurity.js';
import { parseLogLine, evaluatePasswordStrength, extractDomain } from '../utils/logParser.js';
import { executeSearch, getContextLines } from '../utils/searchEngine.js';
console.log('=== Running Security & Performance Tests ===');

const base = getBaseLogDir();

// 1. Directory Traversal Security Tests
console.log('\n[Test 1] Directory Traversal Security Verification');
console.log('Base directory:', base);

// Test safe relative path
const safeRelative = validateSafePath('stealer_dumps/stealer_combos_2026.txt');
assert(safeRelative.startsWith(base), 'Safe path should resolve inside base dir');
console.log('✔ Safe path resolution passed');

// Test path traversal attempt with ../
let blocked = false;
try {
  validateSafePath('../../../Windows/System32/drivers/etc/hosts');
} catch (e) {
  if (e.statusCode === 403 || e.message.includes('Access Denied')) {
    blocked = true;
  }
}
assert(blocked, 'Path traversal with ../ should be blocked with 403 Access Denied');
console.log('✔ Traversal attempt ../ blocked successfully');

// Test absolute escape attempt
blocked = false;
try {
  validateSafePath('C:\\Windows\\win.ini');
} catch (e) {
  if (e.statusCode === 403 || e.message.includes('Access Denied')) {
    blocked = true;
  }
}
assert(blocked, 'Direct absolute path outside base should be blocked');
console.log('✔ Absolute escape attempt blocked successfully');

// 2. Parser Accuracy Tests
console.log('\n[Test 2] Log & Credential Parser Verification');

// Test URL:User:Pass
const parsed1 = parseLogLine('https://accounts.google.com/signin:admin@company.com:SuperSecretPass#99', 1, 'test.txt');
assert.strictEqual(parsed1.domain, 'accounts.google.com');
assert.strictEqual(parsed1.username, 'admin@company.com');
assert.strictEqual(parsed1.password, 'SuperSecretPass#99');
assert.strictEqual(parsed1.isEmail, true);
assert.strictEqual(parsed1.strength.level, 'Very Strong');
console.log('✔ URL:User:Pass parser passed');

// Test Pipe Delimited
const parsed2 = parseLogLine('paypal.com|sales_lead|PayPal_P@ss2026', 2, 'test.txt');
assert.strictEqual(parsed2.domain, 'paypal.com');
assert.strictEqual(parsed2.username, 'sales_lead');
assert.strictEqual(parsed2.password, 'PayPal_P@ss2026');
console.log('✔ Pipe delimited parser passed');

// Test JWT Token
const parsed3 = parseLogLine('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', 3, 'test.txt');
assert.strictEqual(parsed3.type, 'JWT_TOKEN');
assert(parsed3.token.length > 50);
console.log('✔ JWT secret detector passed');

// Test Country Tagged URL Combo (e.g. DUMP ULP FR/DE/IN)
const parsed4 = parseLogLine('FR https://www.resume-now.com/build-resume/final-resume:jatin2k3@gmail.com:bzejS#8F@!4hgpX', 4, 'test.txt');
assert.strictEqual(parsed4.country, 'FR');
assert.strictEqual(parsed4.domain, 'resume-now.com');
assert.strictEqual(parsed4.username, 'jatin2k3@gmail.com');
assert.strictEqual(parsed4.password, 'bzejS#8F@!4hgpX');
assert.strictEqual(parsed4.isEmail, true);
console.log('✔ Country-tagged ULP parser passed (FR/DE/IN prefixes)');

// Test Email-Anchored Combo without protocol
const parsed5 = parseLogLine('[US] paypal.com:admin@paypal.com:Super#Secret:Pass', 5, 'test.txt');
assert.strictEqual(parsed5.country, 'US');
assert.strictEqual(parsed5.domain, 'paypal.com');
assert.strictEqual(parsed5.username, 'admin@paypal.com');
assert.strictEqual(parsed5.password, 'Super#Secret:Pass');
console.log('✔ Email-anchored tagged parser passed');

// Test Server Log Noise Suppression
const parsed6 = parseLogLine('127.0.0.1 - - [25/Aug/2026:12:00:00] "GET / HTTP/1.1" 200 123', 6, 'test.txt');
assert.strictEqual(parsed6.type, 'RAW_LOG_ENTRY');
assert.strictEqual(parsed6.username, '—');
console.log('✔ Server access log noise filter passed');

// 3. Search Engine Performance Test
console.log('\n[Test 3] Search Engine Speed Benchmark');
(async () => {
  const result = await executeSearch({
    query: 'google',
    baseDir: base,
    targetFiles: [path.join(base, 'massive_combo_dataset.txt')]
  });

  console.log(`Execution Time: ${result.metrics.executionTimeMs} ms for ${result.metrics.filesScanned} files`);
  console.log(`Total Matches: ${result.metrics.totalMatches} matches`);
  console.log(`Throughput: ${result.metrics.throughputMBs} MB/s`);
  assert(result.metrics.executionTimeMs < 500, 'Search should be sub-500ms (often < 20ms)');
  assert(result.metrics.totalMatches > 0, 'Should find matches in dataset');
  console.log('✔ Sub-second search benchmark passed');

  // Test Context Lines
  const context = await getContextLines(path.join(base, 'stealer_dumps', 'stealer_combos_2026.txt'), 5, 2);
  assert.strictEqual(context.lines.length, 5);
  console.log('✔ Context line inspection passed');

  console.log('\n🎉 ALL BACKEND & SECURITY TESTS PASSED SUCCESSFULLY!');
})();
