import { createRequire } from 'module';
import { execFile, spawn } from 'child_process';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { parseLogLine, parseMultiLineStealerBlocks } from './logParser.js';

const require = createRequire(import.meta.url);

let cachedRgBinary = null;

/**
 * Safely locate the best available ripgrep binary across Android/Termux, Windows, Linux, and macOS
 */
export function getRipgrepBinary() {
  if (cachedRgBinary) return cachedRgBinary;

  // 1. Explicit override via environment variable
  if (process.env.RG_PATH) {
    cachedRgBinary = process.env.RG_PATH;
    return cachedRgBinary;
  }

  // 2. Android / Termux environment check (pkg install ripgrep)
  if (process.platform === 'android') {
    const termuxRg = '/data/data/com.termux/files/usr/bin/rg';
    if (fs.existsSync(termuxRg)) {
      cachedRgBinary = termuxRg;
      return cachedRgBinary;
    }
    cachedRgBinary = 'rg';
    return cachedRgBinary;
  }

  // 3. Desktop / Server OS prebuilt package check
  try {
    const vscodeRg = require('@vscode/ripgrep');
    if (vscodeRg?.rgPath && fs.existsSync(vscodeRg.rgPath)) {
      cachedRgBinary = vscodeRg.rgPath;
      return cachedRgBinary;
    }
  } catch {
    // Package not installed or platform has no prebuilt binary (e.g., Android/Termux)
  }

  // 4. Default to system PATH
  cachedRgBinary = 'rg';
  return cachedRgBinary;
}

/**
 * Accurately parses a line from ripgrep stdout (<filePath>:<lineNumber>:<lineContent> or <lineNumber>:<lineContent>)
 * Correctly handles Windows drive letters (C:\ or C:/), Unix paths (/...), and colons in line content.
 */
function parseRipgrepOutputLine(line, baseDir, fallbackPath = '') {
  if (!line || !line.trim()) return null;

  let rawPath = '';
  let lineNumber = 1;
  let lineContent = '';

  // 1. Match full path + line number + content: ^(.+?):(\d+):([\s\S]*)$
  const matchFull = line.match(/^(.+?):(\d+):([\s\S]*)$/);
  if (matchFull) {
    rawPath = matchFull[1];
    lineNumber = parseInt(matchFull[2], 10);
    lineContent = matchFull[3];
  } else {
    // 2. Match single-file output without path: ^(\d+):([\s\S]*)$
    const matchSingle = line.match(/^(\d+):([\s\S]*)$/);
    if (matchSingle) {
      rawPath = fallbackPath || 'log.txt';
      lineNumber = parseInt(matchSingle[1], 10);
      lineContent = matchSingle[2];
    } else {
      return null;
    }
  }

  if (isNaN(lineNumber)) return null;

  let relativeFile = rawPath;
  if (baseDir) {
    try {
      const canonicalBase = path.resolve(baseDir);
      const canonicalFile = path.resolve(rawPath);
      const isWindows = process.platform === 'win32';
      const fileLower = isWindows ? canonicalFile.toLowerCase() : canonicalFile;
      const baseLower = isWindows ? canonicalBase.toLowerCase() : canonicalBase;

      if (fileLower.startsWith(baseLower)) {
        relativeFile = path.relative(canonicalBase, canonicalFile).replace(/\\/g, '/');
      } else {
        relativeFile = path.basename(rawPath);
      }
    } catch {
      relativeFile = path.basename(rawPath);
    }
  } else {
    relativeFile = path.basename(rawPath);
  }

  return {
    filePath: rawPath,
    relativeFile: relativeFile || path.basename(rawPath),
    lineNumber,
    lineContent
  };
}

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

  // If target files specified, check for multi-line stealer logs
  let stealerParsedResults = [];
  if (targetFiles.length > 0) {
    for (const f of targetFiles) {
      try {
        if (fs.existsSync(f)) {
          const content = fs.readFileSync(f, 'utf8');
          // Check if file contains multi-line stealer pattern (URL: ... \n Username: ...)
          if (/(?:URL|Host|Site):\s*https?:\/\//i.test(content) && /(?:USER|Username|Login):\s*/i.test(content)) {
            const relPath = baseDir ? path.relative(baseDir, f).replace(/\\/g, '/') : path.basename(f);
            const blocks = parseMultiLineStealerBlocks(content, relPath);
            if (blocks.length > 0) {
              stealerParsedResults.push(...blocks);
            }
          }
        }
      } catch {}
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
    // Fallback to ultra-fast pure Node streaming search
    rawMatches = await runStreamingSearch({
      query,
      targetFiles,
      baseDir,
      isRegex,
      caseSensitive,
      invertMatch,
      maxResults
    });
  }

  // If we found multi-line stealer blocks in target file and rawMatches produced single line fragments, use stealer blocks
  const parsedResults = [];
  const domainCounts = {};
  const strengthCounts = { 'Very Strong': 0, 'Strong': 0, 'Medium': 0, 'Weak': 0, 'None': 0, 'Cryptographic': 0, 'API Key': 0 };
  const fileDistribution = {};
  const stealerFiles = new Set(stealerParsedResults.map(s => s.filePath));

  if (stealerParsedResults.length > 0) {
    const q = caseSensitive ? query : (query || '').toLowerCase();
    for (const block of stealerParsedResults) {
      if (q) {
        const text = caseSensitive ? block.raw : block.raw.toLowerCase();
        if (!text.includes(q)) continue;
      }

      if (targetField !== 'ALL') {
        let matchField = false;
        if (targetField === 'URL' && (caseSensitive ? block.url : block.url.toLowerCase()).includes(q)) matchField = true;
        if (targetField === 'USER' && (caseSensitive ? block.username : block.username.toLowerCase()).includes(q)) matchField = true;
        if (targetField === 'PASS' && (caseSensitive ? block.password : block.password.toLowerCase()).includes(q)) matchField = true;
        if (!matchField) continue;
      }

      parsedResults.push(block);

      const domain = block.domain || 'Other';
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;

      const strengthLevel = block.strength?.level || 'None';
      strengthCounts[strengthLevel] = (strengthCounts[strengthLevel] || 0) + 1;

      const relFile = block.filePath || 'unknown.txt';
      fileDistribution[relFile] = (fileDistribution[relFile] || 0) + 1;
    }
  }

  // Standard single-line logs / token parser (skip files already processed as full multi-line stealer blocks)
  for (const match of rawMatches) {
    if (stealerFiles.has(match.relativeFile)) continue;

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
      filesScanned: filesScannedCount || 1,
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
    '-H', // ALWAYS output full filename prefix
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
    runNodeStreamingFallback({
      query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch, 
      maxResults, targetField, customRules, onChunk, onDone, onError, abortSignal, startTime
    });
    return;
  }

  let spawnedFailed = false;
  child.on('error', (err) => {
    spawnedFailed = true;
    clearInterval(flushInterval);
    runNodeStreamingFallback({
      query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch, 
      maxResults, targetField, customRules, onChunk, onDone, onError, abortSignal, startTime
    });
  });

  if (abortSignal) {
    abortSignal.addEventListener('abort', () => {
      try {
        child?.kill();
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
    const item = parseRipgrepOutputLine(line, baseDir, targetFiles[0]);
    if (!item) return;

    const { lineContent, lineNumber, relativeFile } = item;
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
    if (spawnedFailed) return;
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
}

/**
 * Pure Node.js streaming fallback when ripgrep binary is unavailable
 */
async function runNodeStreamingFallback({
  query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch,
  maxResults, targetField, customRules, onChunk, onDone, onError, abortSignal, startTime
}) {
  try {
    let filesToScan = targetFiles;
    if (!filesToScan || filesToScan.length === 0) {
      const findTxtFiles = (dir) => {
        let results = [];
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) results = results.concat(findTxtFiles(full));
            else if (entry.isFile() && entry.name.toLowerCase().endsWith('.txt')) results.push(full);
          }
        } catch {}
        return results;
      };
      filesToScan = findTxtFiles(baseDir);
    }

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

    let regex = null;
    if (isRegex) regex = new RegExp(query, caseSensitive ? 'm' : 'im');
    const queryCompare = caseSensitive ? query : query.toLowerCase();

    for (const filePath of filesToScan) {
      if (abortSignal?.aborted) break;
      if (!fs.existsSync(filePath)) continue;

      let relFile = filePath;
      if (baseDir) {
        try {
          const canonicalBase = path.resolve(baseDir);
          const canonicalFile = path.resolve(filePath);
          const isWindows = process.platform === 'win32';
          const fileLower = isWindows ? canonicalFile.toLowerCase() : canonicalFile;
          const baseLower = isWindows ? canonicalBase.toLowerCase() : canonicalBase;

          if (fileLower.startsWith(baseLower)) {
            relFile = path.relative(canonicalBase, canonicalFile).replace(/\\/g, '/');
          } else {
            relFile = path.basename(filePath);
          }
        } catch {
          relFile = path.basename(filePath);
        }
      } else {
        relFile = path.basename(filePath);
      }

      const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let lineNum = 0;
      for await (const line of rl) {
        if (abortSignal?.aborted) {
          rl.close();
          fileStream.destroy();
          break;
        }
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
          const parsed = parseLogLine(line, lineNum, relFile, customRules);
          if (!parsed) continue;

          if (targetField !== 'ALL') {
            const q = caseSensitive ? query : query.toLowerCase();
            let matchField = false;
            if (targetField === 'URL' && (caseSensitive ? parsed.url : parsed.url.toLowerCase()).includes(q)) matchField = true;
            if (targetField === 'USER' && (caseSensitive ? parsed.username : parsed.username.toLowerCase()).includes(q)) matchField = true;
            if (targetField === 'PASS' && (caseSensitive ? parsed.password : parsed.password.toLowerCase()).includes(q)) matchField = true;
            if (!matchField) continue;
          }

          matchCount++;
          chunkBuffer.push(parsed);

          const domain = parsed.domain || 'Other';
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          fileDistribution[relFile] = (fileDistribution[relFile] || 0) + 1;

          const key = parsed.username && parsed.password 
            ? `${parsed.domain}::${parsed.username}::${parsed.password}`
            : `${parsed.filePath}::${parsed.lineNumber}::${parsed.raw}`;
          if (!uniqueKeyMap.has(key)) uniqueKeyMap.set(key, true);

          if (chunkBuffer.length >= 50) flushChunk();
          if (matchCount >= maxResults) {
            rl.close();
            fileStream.destroy();
            break;
          }
        }
      }
      if (matchCount >= maxResults) break;
    }

    flushChunk();

    const endTime = process.hrtime.bigint();
    const executionTimeMs = Number(endTime - startTime) / 1_000_000;

    if (onDone) {
      onDone({
        metrics: {
          executionTimeMs: Math.round(executionTimeMs * 100) / 100,
          totalMatches: matchCount,
          uniqueMatches: uniqueKeyMap.size,
          filesScanned: filesToScan.length
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
  } catch (err) {
    if (onError) onError(err);
  }
}

/**
 * Execute ripgrep binary process via execFile
 */
function runRipgrep({ query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch, maxResults }) {
  return new Promise((resolve, reject) => {
    const bin = getRipgrepBinary();
    const args = [
      '-H', // ALWAYS include filename in output
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
        const item = parseRipgrepOutputLine(line, baseDir, targetFiles[0]);
        if (!item) continue;

        matches.push({
          absolutePath: item.filePath,
          relativeFile: item.relativeFile,
          lineNumber: item.lineNumber,
          lineContent: item.lineContent
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
async function runStreamingSearch({ query, targetFiles, baseDir, isRegex, caseSensitive, invertMatch, maxResults }) {
  const matches = [];
  let regex = null;

  if (isRegex) {
    regex = new RegExp(query, caseSensitive ? 'm' : 'im');
  }

  const queryCompare = caseSensitive ? query : query.toLowerCase();

  for (const filePath of targetFiles) {
    if (!fs.existsSync(filePath)) continue;

    let relFile = filePath;
    if (baseDir) {
      try {
        const canonicalBase = path.resolve(baseDir);
        const canonicalFile = path.resolve(filePath);
        const isWindows = process.platform === 'win32';
        const fileLower = isWindows ? canonicalFile.toLowerCase() : canonicalFile;
        const baseLower = isWindows ? canonicalBase.toLowerCase() : canonicalBase;

        if (fileLower.startsWith(baseLower)) {
          relFile = path.relative(canonicalBase, canonicalFile).replace(/\\/g, '/');
        } else {
          relFile = path.basename(filePath);
        }
      } catch {
        relFile = path.basename(filePath);
      }
    } else {
      relFile = path.basename(filePath);
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lineNum = 0;

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
          relativeFile: relFile,
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
    throw new Error(`File not found: ${filePath}`);
  }

  const targetLine = parseInt(lineNumber, 10);
  const start = Math.max(1, targetLine - radius);
  const end = targetLine + radius;

  const lines = [];
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let current = 0;
  for await (const line of rl) {
    current++;
    if (current >= start && current <= end) {
      lines.push({
        lineNumber: current,
        content: line,
        isTarget: current === targetLine
      });
    }
    if (current > end) {
      rl.close();
      fileStream.destroy();
      break;
    }
  }

  return {
    filePath,
    targetLine,
    startLine: start,
    endLine: Math.min(current, end),
    lines
  };
}
