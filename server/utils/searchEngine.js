import { rgPath } from '@vscode/ripgrep';
import { execFile, spawn } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { parseLogLine, parseMultiLineStealerBlocks } from './logParser.js';

export { rgPath };

/**
 * Execute high-speed search across single or multiple files using ripgrep or stream engine
 */
export async function executeSearch({
  query,
  targetFiles = [], // Array of absolute safe paths
  baseDir,
  isRegex = false,
  caseSensitive = false,
  invertMatch = false,
  maxResults = 50000,
  targetField = 'ALL', // 'ALL' | 'URL' | 'USER' | 'PASS'
  customRules = []
}) {
  const startTime = process.hrtime.bigint();

  let rawMatches = [];
  let filesScannedCount = targetFiles.length;
  let totalBytesScanned = 0;

  // Calculate total size of files to be scanned
  for (const f of targetFiles) {
    try {
      const stat = fs.statSync(f);
      totalBytesScanned += stat.size;
    } catch {
      // file might not exist or inaccessible
    }
  }

  // Try Ripgrep first
  try {
    rawMatches = await runRipgrep({
      query,
      targetFiles,
      baseDir,
      isRegex,
      caseSensitive,
      invertMatch,
      maxResults
    });
  } catch (rgError) {
    console.warn('[SearchEngine] Ripgrep failed or unavailable, using fast stream fallback:', rgError.message);
    rawMatches = await runStreamingSearch({
      query,
      targetFiles,
      isRegex,
      caseSensitive,
      invertMatch,
      maxResults
    });
  }

  // Parse matches into structured payloads
  const parsedResults = [];
  const domainCounts = {};
  const strengthCounts = { 'Very Strong': 0, 'Strong': 0, 'Medium': 0, 'Weak': 0, 'None': 0, 'Cryptographic': 0, 'API Key': 0 };
  const fileDistribution = {};

  for (const match of rawMatches) {
    const parsed = parseLogLine(match.lineContent, match.lineNumber, match.relativeFile, customRules);
    if (!parsed) continue;

    // Field-level filtering if specified
    if (targetField !== 'ALL') {
      const q = caseSensitive ? query : query.toLowerCase();
      let matchField = false;
      if (targetField === 'URL' && (caseSensitive ? parsed.url : parsed.url.toLowerCase()).includes(q)) matchField = true;
      if (targetField === 'USER' && (caseSensitive ? parsed.username : parsed.username.toLowerCase()).includes(q)) matchField = true;
      if (targetField === 'PASS' && (caseSensitive ? parsed.password : parsed.password.toLowerCase()).includes(q)) matchField = true;
      if (!matchField) continue;
    }

    parsedResults.push(parsed);

    // Collect analytics
    const domain = parsed.domain || 'Other';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;

    const strengthLevel = parsed.strength?.level || 'None';
    strengthCounts[strengthLevel] = (strengthCounts[strengthLevel] || 0) + 1;

    const relFile = match.relativeFile || 'unknown.txt';
    fileDistribution[relFile] = (fileDistribution[relFile] || 0) + 1;
  }

  const endTime = process.hrtime.bigint();
  const executionTimeMs = Number(endTime - startTime) / 1_000_000;
  const throughputMBs = totalBytesScanned > 0 && executionTimeMs > 0
    ? (totalBytesScanned / (1024 * 1024)) / (executionTimeMs / 1000)
    : 0;

  // Deduplication analysis
  const uniqueKeyMap = new Map();
  for (const item of parsedResults) {
    // Unique key combination: username + password + domain (or raw line if no user/pass)
    const key = item.username && item.password 
      ? `${item.domain}::${item.username}::${item.password}`
      : `${item.filePath}::${item.lineNumber}::${item.raw}`;
    if (!uniqueKeyMap.has(key)) {
      uniqueKeyMap.set(key, item);
    }
  }

  const deduplicatedResults = Array.from(uniqueKeyMap.values());

  return {
    metrics: {
      executionTimeMs: Math.round(executionTimeMs * 100) / 100,
      totalMatches: parsedResults.length,
      uniqueMatches: deduplicatedResults.length,
      filesScanned: filesScannedCount,
      totalSizeScannedBytes: totalBytesScanned,
      throughputMBs: Math.round(throughputMBs * 100) / 100
    },
    results: parsedResults,
    deduplicatedResults,
    analytics: {
      topDomains: Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([domain, count]) => ({ domain, count })),
      strengthDistribution: strengthCounts,
      fileDistribution: Object.entries(fileDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, count }))
    }
  };
}

/**
 * Stream search results in real time with batching
 */
export function streamSearch({
  query,
  targetFiles = [],
  baseDir,
  isRegex = false,
  caseSensitive = false,
  invertMatch = false,
  maxResults = 50000,
  targetField = 'ALL',
  customRules = [],
  onChunk,
  onDone,
  onError,
  abortSignal
}) {
  const startTime = process.hrtime.bigint();
  const bin = getRipgrepBinary();

  const args = [
    '-n',
    '--no-heading',
    '--color=never',
    '--max-count', String(maxResults)
  ];

  if (!caseSensitive) args.push('-i');
  if (!isRegex) args.push('-F');
  if (invertMatch) args.push('-v');

  args.push('-e', query || '');

  if (targetFiles && targetFiles.length > 0) {
    args.push('--', ...targetFiles);
  } else {
    args.push('--', baseDir);
  }

  let child;
  try {
    child = spawn(bin, args, { windowsHide: true });
  } catch (err) {
    if (onError) onError(err);
    return;
  }

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      try {
        child.kill();
      } catch {}
    });
  }

  const rl = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity
  });

  let matchCount = 0;
  let chunkBuffer = [];
  const domainCounts = {};
  const fileDistribution = {};
  const uniqueKeyMap = new Map();

  const flushChunk = () => {
    if (chunkBuffer.length > 0) {
      if (onChunk) onChunk([...chunkBuffer]);
      chunkBuffer = [];
    }
  };

  const flushInterval = setInterval(flushChunk, 60);

  rl.on('line', (line) => {
    if (!line.trim()) return;

    let filePath = '';
    let rest = line;

    if (/^[a-zA-Z]:\\/.test(line)) {
      const drivePrefix = line.slice(0, 2);
      const afterDrive = line.slice(2);
      const firstColon = afterDrive.indexOf(':');
      if (firstColon !== -1) {
        filePath = drivePrefix + afterDrive.slice(0, firstColon);
        rest = afterDrive.slice(firstColon + 1);
      }
    } else {
      const firstColon = line.indexOf(':');
      if (firstColon !== -1) {
        filePath = line.slice(0, firstColon);
        rest = line.slice(firstColon + 1);
      }
    }

    const secondColon = rest.indexOf(':');
    if (secondColon === -1) return;

    const lineNumber = parseInt(rest.slice(0, secondColon), 10);
    const lineContent = rest.slice(secondColon + 1);

    if (isNaN(lineNumber)) return;

    const relativeFile = baseDir 
      ? path.relative(baseDir, filePath).replace(/\\/g, '/')
      : path.basename(filePath);

    const parsed = parseLogLine(lineContent, lineNumber, relativeFile, customRules);
    if (!parsed) return;

    // Field-level filter
    if (targetField !== 'ALL') {
      const q = caseSensitive ? query : query.toLowerCase();
      let matchField = false;
      if (targetField === 'URL' && (caseSensitive ? parsed.url : parsed.url.toLowerCase()).includes(q)) matchField = true;
      if (targetField === 'USER' && (caseSensitive ? parsed.username : parsed.username.toLowerCase()).includes(q)) matchField = true;
      if (targetField === 'PASS' && (caseSensitive ? parsed.password : parsed.password.toLowerCase()).includes(q)) matchField = true;
      if (!matchField) return;
    }

    matchCount++;
    chunkBuffer.push(parsed);

    // Track analytics
    const domain = parsed.domain || 'Other';
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    fileDistribution[relativeFile] = (fileDistribution[relativeFile] || 0) + 1;

    const key = parsed.username && parsed.password 
      ? `${parsed.domain}::${parsed.username}::${parsed.password}`
      : `${parsed.filePath}::${parsed.lineNumber}::${parsed.raw}`;
    if (!uniqueKeyMap.has(key)) {
      uniqueKeyMap.set(key, true);
    }

    if (chunkBuffer.length >= 100) {
      flushChunk();
    }
  });

  child.on('close', () => {
    clearInterval(flushInterval);
    flushChunk();

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1_000_000;

    if (onDone) {
      onDone({
        metrics: {
          executionTimeMs: Math.round(executionTimeMs * 100) / 100,
          totalMatches: matchCount,
          uniqueMatches: uniqueKeyMap.size,
          filesScanned: targetFiles.length || 1
        },
        analytics: {
          topDomains: Object.entries(domainCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([domain, count]) => ({ domain, count })),
          fileDistribution: Object.entries(fileDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([file, count]) => ({ file, count }))
        }
      });
    }
  });

  child.on('error', (err) => {
    clearInterval(flushInterval);
    if (onError) onError(err);
  });
}

function getRipgrepBinary() {
  if (process.env.RG_PATH) return process.env.RG_PATH;
  try {
    if (rgPath && fs.existsSync(rgPath)) return rgPath;
  } catch {}
  return 'rg'; // Fallback to system PATH (e.g. `pkg install ripgrep` on Termux)
}

/**
 * Execute ripgrep binary process via execFile
 */
function runRipgrep({ query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch, maxResults }) {
  return new Promise((resolve, reject) => {
    const bin = getRipgrepBinary();
    const args = [
      '-n', // line numbers
      '--no-heading',
      '--color=never',
      '--max-count', String(maxResults)
    ];

    if (!caseSensitive) args.push('-i');
    if (!isRegex) args.push('-F'); // fixed strings
    if (invertMatch) args.push('-v');

    args.push('-e', query || '');

    // Target files or directory
    if (targetFiles && targetFiles.length > 0) {
      args.push('--', ...targetFiles);
    } else {
      args.push('--', baseDir);
    }

    execFile(bin, args, { maxBuffer: 50 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error && error.code !== 1) { // code 1 means no match found, which is normal
        if (stderr && stderr.trim().length > 0) {
          return reject(new Error(stderr));
        }
      }

      const matches = [];
      const lines = (stdout || '').split(/\r?\n/);

      for (const line of lines) {
        if (!line.trim()) continue;

        let filePath = '';
        let rest = line;

        if (/^[a-zA-Z]:\\/.test(line)) {
          const drivePrefix = line.slice(0, 2);
          const afterDrive = line.slice(2);
          const firstColon = afterDrive.indexOf(':');
          if (firstColon !== -1) {
            filePath = drivePrefix + afterDrive.slice(0, firstColon);
            rest = afterDrive.slice(firstColon + 1);
          }
        } else {
          const firstColon = line.indexOf(':');
          if (firstColon !== -1) {
            filePath = line.slice(0, firstColon);
            rest = line.slice(firstColon + 1);
          }
        }

        const secondColon = rest.indexOf(':');
        let lineNumber = 1;
        let lineContent = rest;

        if (secondColon !== -1) {
          const numStr = rest.slice(0, secondColon);
          const parsedNum = parseInt(numStr, 10);
          if (!isNaN(parsedNum)) {
            lineNumber = parsedNum;
            lineContent = rest.slice(secondColon + 1);
          }
        }

        let relativeFile = filePath;
        if (baseDir && filePath.startsWith(baseDir)) {
          relativeFile = path.relative(baseDir, filePath).replace(/\\/g, '/');
        } else {
          relativeFile = path.basename(filePath);
        }

        matches.push({
          absolutePath: filePath,
          relativeFile,
          lineNumber,
          lineContent
        });

        if (matches.length >= maxResults) break;
      }

      resolve(matches);
    });
  });
}

/**
 * High-performance streaming fallback search in Node.js
 */
async function runStreamingSearch({ query, targetFiles, isRegex, caseSensitive, invertMatch, maxResults }) {
  const matches = [];
  let regex = null;

  if (isRegex) {
    regex = new RegExp(query, caseSensitive ? 'm' : 'im');
  }

  const queryCompare = caseSensitive ? query : query.toLowerCase();

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;
    const relName = path.basename(filePath);

    for await (const line of rl) {
      lineNum++;
      let isMatch = false;

      if (isRegex) {
        isMatch = regex.test(line);
      } else {
        const lineCompare = caseSensitive ? line : line.toLowerCase();
        isMatch = lineCompare.includes(queryCompare);
      }

      if (invertMatch) isMatch = !isMatch;

      if (isMatch) {
        matches.push({
          absolutePath: filePath,
          relativeFile: relName,
          lineNumber: lineNum,
          lineContent: line
        });

        if (matches.length >= maxResults) {
          rl.close();
          fileStream.destroy();
          return matches;
        }
      }
    }
  }

  return matches;
}

/**
 * Fetch surrounding context lines around a specific line number in a file
 */
export async function getContextLines(filePath, lineNumber, radius = 5) {
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found');
  }

  const startLine = Math.max(1, lineNumber - radius);
  const endLine = lineNumber + radius;

  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let currentLine = 0;
  const contextLines = [];

  for await (const line of rl) {
    currentLine++;
    if (currentLine >= startLine && currentLine <= endLine) {
      contextLines.push({
        lineNumber: currentLine,
        isTarget: currentLine === lineNumber,
        content: line
      });
    }
    if (currentLine > endLine) {
      rl.close();
      fileStream.destroy();
      break;
    }
  }

  return {
    filePath,
    targetLine: lineNumber,
    startLine,
    endLine: currentLine,
    lines: contextLines
  };
}
