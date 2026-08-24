import assert from 'assert';
import path from 'path';
import { fileURLToPath } from 'url';

const BASE_URL = 'http://localhost:4000';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_LOGS_DIR = path.resolve(__dirname, '../../logs');

async function runE2ETests() {
  console.log('🚀 Running End-to-End API and Search Verification Tests...\n');

  // Reset base log directory to default logs
  await fetch(`${BASE_URL}/api/config/dir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDir: DEFAULT_LOGS_DIR })
  });

  // Test 1: File Discovery
  console.log('[Test 1] Testing Recursive File Discovery (/api/files)');
  const resFiles = await fetch(`${BASE_URL}/api/files`);
  const filesData = await resFiles.json();
  assert(filesData.success === true, 'Discovery endpoint should succeed');
  assert(filesData.totalFiles >= 4, `Expected at least 4 files, got ${filesData.totalFiles}`);
  assert(filesData.totalLines > 25000, `Expected 25k+ lines from massive dataset, got ${filesData.totalLines}`);
  console.log(`✔ Found ${filesData.totalFiles} files with ${filesData.totalLines.toLocaleString()} total lines (${filesData.formattedTotalSize})`);

  // Test 2: Global Search Performance & Parsing
  console.log('\n[Test 2] Testing Global Query Execution (/api/search)');
  const searchPayload = {
    query: 'google',
    targetFiles: [], // Global
    isRegex: false,
    caseSensitive: false,
    invertMatch: false,
    targetField: 'ALL'
  };

  const resSearch = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchPayload)
  });
  const searchData = await resSearch.json();

  assert(searchData.success === true, 'Search endpoint should succeed');
  assert(searchData.metrics.executionTimeMs < 500, `Execution time should be sub-500ms, got ${searchData.metrics.executionTimeMs}ms`);
  assert(searchData.results.length > 0, 'Should return matching results for "google"');
  assert(searchData.deduplicatedResults.length > 0, 'Should generate deduplicated list');
  console.log(`✔ Search executed in ${searchData.metrics.executionTimeMs} ms with ${searchData.metrics.totalMatches} matches (${searchData.metrics.uniqueMatches} unique)`);
  console.log(`✔ Top domain: ${searchData.analytics.topDomains[0]?.domain} (${searchData.analytics.topDomains[0]?.count} occurrences)`);

  // Test 3: Token and Secret Detection
  console.log('\n[Test 3] Testing Token & Secret Search');
  const tokenRes = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'Bearer ey', targetFiles: [], targetField: 'ALL' })
  });
  const tokenData = await tokenRes.json();
  assert(tokenData.results.length > 0, 'Should find JWT Bearer tokens');
  assert(tokenData.results[0].type === 'JWT_TOKEN', 'Should categorize as JWT_TOKEN');
  console.log(`✔ Detected ${tokenData.results[0].type} with entropy ${tokenData.results[0].strength.entropy}`);

  // Test 4: Single-File Isolated Search Scope
  console.log('\n[Test 4] Testing Single File Scope Isolation');
  const singleFileRes = await fetch(`${BASE_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'admin',
      targetFiles: ['stealer_dumps/stealer_combos_2026.txt']
    })
  });
  const singleFileData = await singleFileRes.json();
  assert(singleFileData.metrics.filesScanned === 1, 'Should scan only 1 target file');
  assert(singleFileData.scope === 'SELECTED', 'Scope should be SELECTED');
  console.log(`✔ Single file query executed in ${singleFileData.metrics.executionTimeMs} ms on ${singleFileData.metrics.filesScanned} file`);

  // Test 5: Raw File Context Inspection
  console.log('\n[Test 5] Testing Surrounding Context Inspection (/api/file/context)');
  const contextRes = await fetch(`${BASE_URL}/api/file/context?filePath=stealer_dumps/stealer_combos_2026.txt&lineNumber=10&radius=5`);
  const contextData = await contextRes.json();
  assert(contextData.success === true, 'Context fetch should succeed');
  assert(contextData.lines.length === 11, `Expected 11 lines (+/- 5 around line 10), got ${contextData.lines.length}`);
  const targetLine = contextData.lines.find(l => l.isTarget);
  assert(targetLine && targetLine.lineNumber === 10, 'Target line 10 should be flagged isTarget');
  console.log(`✔ Fetched context window [lines ${contextData.startLine}-${contextData.endLine}] with target highlight`);

  // Test 6: Directory Traversal Security Guard on Endpoints
  console.log('\n[Test 6] Testing Security Guard Traversal Protection');
  const traversalRes = await fetch(`${BASE_URL}/api/file/context?filePath=../../../../Windows/System32/cmd.exe&lineNumber=1`);
  assert(traversalRes.status === 403, `Expected 403 Forbidden for traversal attempt, got ${traversalRes.status}`);
  const traversalData = await traversalRes.json();
  assert(traversalData.error.includes('Access Denied'), 'Error should state Access Denied');
  console.log('✔ Traversal attempt successfully blocked with 403 Forbidden Access Denied');

  // Test 7: Custom Delimiter & Regex Rule Testing (/api/rules/test)
  console.log('\n[Test 7] Testing Custom Delimiter & Regex Rule Validator (/api/rules/test)');
  const ruleTestRes = await fetch(`${BASE_URL}/api/rules/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rule: {
        name: 'Pipe Rule Test',
        type: 'delimiter',
        delimiter: '|',
        columns: ['url', 'username', 'password']
      },
      sampleLine: 'https://test.domain.com/login|sec_user_99|VerySecretP@ss2026!'
    })
  });
  const ruleTestData = await ruleTestRes.json();
  assert(ruleTestData.success === true, 'Custom rule test should succeed');
  assert(ruleTestData.parsed.domain === 'test.domain.com', 'Should extract domain');
  assert(ruleTestData.parsed.username === 'sec_user_99', 'Should extract username');
  assert(ruleTestData.parsed.password === 'VerySecretP@ss2026!', 'Should extract password');
  console.log(`✔ Custom rule parsed: ${ruleTestData.parsed.domain} | ${ruleTestData.parsed.username} | ${ruleTestData.parsed.password}`);

  // Test 8: Live Streaming Search via SSE (/api/search/stream)
  console.log('\n[Test 8] Testing Live Streaming Search via SSE (/api/search/stream)');
  const streamRes = await fetch(`${BASE_URL}/api/search/stream?query=google&targetFiles=[]`);
  assert(streamRes.headers.get('content-type')?.includes('text/event-stream'), 'Content-Type should be text/event-stream');
  const streamText = await streamRes.text();
  assert(streamText.includes('event: init'), 'Stream should emit init event');
  assert(streamText.includes('event: chunk'), 'Stream should emit chunk event');
  assert(streamText.includes('event: done'), 'Stream should emit done event');
  console.log('✔ Live SSE stream emitted valid init, chunk, and done events');

  // Test 9: Single-Command Unified Server (Static SPA Delivery)
  console.log('\n[Test 9] Testing Unified Server Static SPA Route (GET /)');
  const spaRes = await fetch(`${BASE_URL}/`);
  const spaHtml = await spaRes.text();
  assert(spaRes.status === 200, 'Root SPA route should return 200');
  assert(spaHtml.includes('html') || spaHtml.includes('CipherLog') || spaHtml.includes('root'), 'Should serve React SPA HTML');
  console.log('✔ Unified server correctly serves compiled React SPA from port 4000');

  // Test 10: Dynamic Directory Switch & Raw Context Inspection
  console.log('\n[Test 10] Testing Dynamic Target Directory Switch & Context Inspection');
  const customSubDir = path.join(DEFAULT_LOGS_DIR, 'stealer_dumps');
  const setDirRes = await fetch(`${BASE_URL}/api/config/dir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDir: customSubDir })
  });
  const setDirData = await setDirRes.json();
  assert(setDirData.success === true, 'Setting custom target directory should succeed');

  const filesAfterSwitch = await (await fetch(`${BASE_URL}/api/files`)).json();
  assert(filesAfterSwitch.success === true, 'File discovery should succeed in new directory');
  assert(filesAfterSwitch.files.length >= 1, 'Should find files in new directory');

  const sampleFile = filesAfterSwitch.files[0].relativePath;
  const inspectRes = await fetch(`${BASE_URL}/api/file/context?filePath=${encodeURIComponent(sampleFile)}&lineNumber=5&radius=5`);
  const inspectData = await inspectRes.json();
  assert(inspectData.success === true, 'Context inspection in custom target directory should succeed');
  assert(inspectData.lines.length > 0, 'Should return context lines');
  console.log(`✔ Switched to custom directory, discovered file: ${sampleFile}, inspected line 5 (+/-5) successfully`);

  // Restore default directory
  await fetch(`${BASE_URL}/api/config/dir`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newDir: DEFAULT_LOGS_DIR })
  });

  console.log('\n🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!');
}

runE2ETests().catch(err => {
  console.error('❌ E2E Test Failure:', err);
  process.exit(1);
});
