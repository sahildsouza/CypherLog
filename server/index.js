import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { getBaseLogDir, setBaseLogDir, validateSafePath } from './utils/pathSecurity.js';
import { executeSearch, streamSearch, getContextLines } from './utils/searchEngine.js';
import { testParserRule } from './utils/logParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * Format bytes into human readable format
 */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Quick line count estimation or exact read
 */
async function countFileLines(filePath, maxBytesToCheck = 50 * 1024 * 1024) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return 0;
    
    // For smaller files, count exactly
    if (stat.size <= maxBytesToCheck) {
      let count = 0;
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath, { encoding: 'utf8' }),
        crlfDelay: Infinity
      });
      for await (const _ of rl) {
        count++;
      }
      return count;
    }
    
    // Estimate for extremely large files
    return Math.round(stat.size / 60);
  } catch {
    return 0;
  }
}

/**
 * Recursively scan directory for .txt and .log files
 */
async function scanDirectory(dirPath, baseDir) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      const nested = await scanDirectory(fullPath, baseDir);
      files = files.concat(nested);
    } else if (entry.isFile() && (entry.name.endsWith('.txt') || entry.name.endsWith('.log') || entry.name.endsWith('.csv'))) {
      const stat = fs.statSync(fullPath);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      const lines = await countFileLines(fullPath);

      files.push({
        name: entry.name,
        relativePath,
        absolutePath: fullPath,
        size: stat.size,
        formattedSize: formatBytes(stat.size),
        lines,
        modifiedAt: stat.mtime
      });
    }
  }

  return files;
}

/**
 * 1. File Discovery Endpoint: Scans target logs directory recursively
 */
app.get('/api/files', async (req, res) => {
  try {
    const baseDir = getBaseLogDir();
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }

    const files = await scanDirectory(baseDir, baseDir);
    
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const totalLines = files.reduce((acc, f) => acc + f.lines, 0);

    res.json({
      success: true,
      baseDir,
      totalFiles: files.length,
      totalBytes,
      formattedTotalSize: formatBytes(totalBytes),
      totalLines,
      files
    });
  } catch (error) {
    console.error('[API /files] Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. High-Speed Query & Payload Extraction Endpoint
 */
app.post('/api/search', async (req, res) => {
  try {
    const {
      query = '',
      targetFiles = [], // Array of relative file paths (empty = global search across all files)
      isRegex = false,
      caseSensitive = false,
      invertMatch = false,
      targetField = 'ALL',
      customRules = [],
      maxResults = 50000
    } = req.body;

    const baseDir = getBaseLogDir();
    let safeTargetPaths = [];

    if (targetFiles && targetFiles.length > 0) {
      // Validate each selected file
      for (const relFile of targetFiles) {
        const safePath = validateSafePath(relFile);
        if (fs.existsSync(safePath)) {
          safeTargetPaths.push(safePath);
        }
      }
    } else {
      // Global search across all available .txt and .log files
      const allFiles = await scanDirectory(baseDir, baseDir);
      safeTargetPaths = allFiles.map(f => f.absolutePath);
    }

    const searchResult = await executeSearch({
      query,
      targetFiles: safeTargetPaths,
      baseDir,
      isRegex,
      caseSensitive,
      invertMatch,
      targetField,
      customRules,
      maxResults
    });

    res.json({
      success: true,
      query,
      scope: targetFiles.length > 0 ? 'SELECTED' : 'GLOBAL',
      ...searchResult
    });
  } catch (error) {
    console.error('[API /search] Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * 2b. Live Streaming Search via Server-Sent Events (SSE)
 */
app.get('/api/search/stream', async (req, res) => {
  try {
    const {
      query = '',
      targetFiles = '[]',
      isRegex = 'false',
      caseSensitive = 'false',
      invertMatch = 'false',
      targetField = 'ALL',
      customRules = '[]',
      maxResults = '50000'
    } = req.query;

    let parsedFiles = [];
    try {
      parsedFiles = typeof targetFiles === 'string' ? JSON.parse(targetFiles) : targetFiles;
    } catch {}

    let parsedCustomRules = [];
    try {
      parsedCustomRules = typeof customRules === 'string' ? JSON.parse(customRules) : customRules;
    } catch {}

    const baseDir = getBaseLogDir();
    let safeTargetPaths = [];

    if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
      for (const relFile of parsedFiles) {
        const safePath = validateSafePath(relFile);
        if (fs.existsSync(safePath)) safeTargetPaths.push(safePath);
      }
    } else {
      const allFiles = await scanDirectory(baseDir, baseDir);
      safeTargetPaths = allFiles.map(f => f.absolutePath);
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`event: init\ndata: ${JSON.stringify({ query, fileCount: safeTargetPaths.length })}\n\n`);

    const abortController = new AbortController();

    req.on('close', () => {
      abortController.abort();
    });

    streamSearch({
      query,
      targetFiles: safeTargetPaths,
      baseDir,
      isRegex: isRegex === 'true' || isRegex === true,
      caseSensitive: caseSensitive === 'true' || caseSensitive === true,
      invertMatch: invertMatch === 'true' || invertMatch === true,
      targetField,
      customRules: parsedCustomRules,
      maxResults: parseInt(maxResults, 10) || 50000,
      abortSignal: abortController.signal,
      onChunk: (chunk) => {
        if (!res.writableEnded) {
          res.write(`event: chunk\ndata: ${JSON.stringify(chunk)}\n\n`);
        }
      },
      onDone: (summary) => {
        if (!res.writableEnded) {
          res.write(`event: done\ndata: ${JSON.stringify(summary)}\n\n`);
          res.end();
        }
      },
      onError: (err) => {
        if (!res.writableEnded) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
        }
      }
    });

  } catch (error) {
    console.error('[API /search/stream] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.end();
    }
  }
});

/**
 * 2c. Custom Parsing Rule Tester Endpoint
 */
app.post('/api/rules/test', (req, res) => {
  try {
    const { rule, sampleLine } = req.body;
    const testResult = testParserRule(rule, sampleLine);
    res.json(testResult);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 3. File Context Inspection Endpoint (+/- N surrounding lines around match)
 */
app.get('/api/file/context', async (req, res) => {
  try {
    const { filePath, lineNumber, radius = 5 } = req.query;
    if (!filePath || !lineNumber) {
      return res.status(400).json({ success: false, error: 'filePath and lineNumber are required' });
    }

    const safePath = validateSafePath(filePath);
    const lineNum = parseInt(lineNumber, 10);
    const rad = parseInt(radius, 10) || 5;

    const contextData = await getContextLines(safePath, lineNum, rad);
    res.json({
      success: true,
      ...contextData
    });
  } catch (error) {
    console.error('[API /file/context] Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * 4. Raw File Content Preview / Slice Endpoint
 */
app.get('/api/file/raw', async (req, res) => {
  try {
    const { filePath, startLine = 1, endLine = 500 } = req.query;
    if (!filePath) {
      return res.status(400).json({ success: false, error: 'filePath is required' });
    }

    const safePath = validateSafePath(filePath);
    const start = Math.max(1, parseInt(startLine, 10));
    const end = Math.max(start, parseInt(endLine, 10));

    const fileStream = fs.createReadStream(safePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let current = 0;
    const lines = [];

    for await (const line of rl) {
      current++;
      if (current >= start && current <= end) {
        lines.push({ lineNumber: current, content: line });
      }
      if (current > end) {
        rl.close();
        fileStream.destroy();
        break;
      }
    }

    res.json({
      success: true,
      filePath,
      startLine: start,
      endLine: Math.min(current, end),
      totalReturned: lines.length,
      lines
    });
  } catch (error) {
    console.error('[API /file/raw] Error:', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * 5. Update Base Logs Directory Configuration (with strict validation)
 */
app.post('/api/config/dir', (req, res) => {
  try {
    const { newDir } = req.body;
    if (!newDir) {
      return res.status(400).json({ success: false, error: 'newDir is required' });
    }

    const updated = setBaseLogDir(newDir);
    res.json({ success: true, baseDir: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. Single-Command Unified Server: Serve React SPA if dist exists
const clientDistPath = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[CipherLog Server] Running on http://localhost:${PORT}`);
  console.log(`[CipherLog Server] Active Logs Directory: ${getBaseLogDir()}`);
});
