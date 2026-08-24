/**
 * Intelligent Log & Credential Payload Parser
 * Parses single-line combos, multi-line stealer blocks, key-value logs, JSON dumps, and token payloads.
 */

const COMMON_WEAK_PASSWORDS = new Set(['123456', 'password', '12345678', 'qwerty', '123456789', 'admin', 'pass123', 'root']);

/**
 * Calculate approximate Shannon entropy for password strength evaluation (High performance)
 */
export function calculateEntropy(password) {
  if (!password) return 0;
  const len = password.length;
  if (len === 0) return 0;
  
  const freq = new Map();
  for (let i = 0; i < len; i++) {
    const char = password[i];
    freq.set(char, (freq.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return Math.round(entropy * len * 10) / 10;
}

/**
 * Evaluate password strength and categorize
 */
export function evaluatePasswordStrength(password) {
  if (!password) return { level: 'None', score: 0, color: 'gray' };
  
  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  
  const variety = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);

  // Fast O(1) common weak passwords check
  if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase()) || length < 5) {
    return { level: 'Weak', score: 1, entropy: calculateEntropy(password), color: 'rose' };
  }

  const entropy = calculateEntropy(password);

  if (length >= 12 && variety >= 3 && entropy > 45) {
    return { level: 'Very Strong', score: 4, entropy, color: 'emerald' };
  }
  if (length >= 8 && variety >= 2 && entropy > 28) {
    return { level: 'Strong', score: 3, entropy, color: 'cyan' };
  }
  if (length >= 6) {
    return { level: 'Medium', score: 2, entropy, color: 'amber' };
  }
  return { level: 'Weak', score: 1, entropy, color: 'rose' };
}

/**
 * Extract clean domain name from URL or host string with zero object allocation
 */
export function extractDomain(urlOrHost) {
  if (!urlOrHost) return 'Unknown';
  let host = urlOrHost.trim();
  const protoIdx = host.indexOf('://');
  if (protoIdx !== -1) {
    host = host.slice(protoIdx + 3);
  }
  const slashIdx = host.indexOf('/');
  if (slashIdx !== -1) {
    host = host.slice(0, slashIdx);
  }
  const colonIdx = host.indexOf(':');
  if (colonIdx !== -1) {
    host = host.slice(0, colonIdx);
  }
  if (host.startsWith('www.')) {
    host = host.slice(4);
  }
  return host || 'Unknown';
}

/**
 * Checks if a string is a valid email
 */
export function isEmail(str) {
  if (!str) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

/**
 * Parses a line using a user-defined custom rule (delimiter or regex)
 */
export function parseCustomRule(trimmed, rawLine, lineNumber = 1, filePath = '', rule) {
  if (!rule || !trimmed) return null;

  try {
    if (rule.type === 'regex' && rule.pattern) {
      const regex = new RegExp(rule.pattern);
      const match = trimmed.match(regex);
      if (match) {
        const groups = match.groups || {};
        const url = groups.url || groups.domain || groups.host || (match[1] && !groups.username ? match[1] : '') || 'N/A';
        const username = groups.username || groups.user || groups.email || groups.account || (match[2] && !groups.password ? match[2] : '') || 'N/A';
        const password = groups.password || groups.pass || groups.pwd || (match[3] ? match[3] : '') || '';
        const token = groups.token || groups.key || groups.secret || '';

        return {
          type: 'CUSTOM_RULE',
          url: url || 'N/A',
          domain: extractDomain(url),
          username: username || 'N/A',
          password,
          token,
          isEmail: isEmail(username),
          strength: evaluatePasswordStrength(password),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: {
            format: `Custom: ${rule.name || 'Regex'}`
          }
        };
      }
    } else if (rule.type === 'delimiter' && rule.delimiter) {
      const parts = trimmed.split(rule.delimiter);
      if (parts.length >= 2) {
        const columns = rule.columns || ['url', 'username', 'password'];
        let url = 'N/A';
        let username = 'N/A';
        let password = '';
        let token = '';

        columns.forEach((col, idx) => {
          if (idx < parts.length) {
            const val = parts[idx].trim();
            if (col === 'url' || col === 'domain' || col === 'host') url = val;
            else if (col === 'username' || col === 'user' || col === 'email' || col === 'account') username = val;
            else if (col === 'password' || col === 'pass' || col === 'pwd') password = val;
            else if (col === 'token' || col === 'key' || col === 'secret') token = val;
          }
        });

        // If extra parts exist and password was last column, combine rest as password
        const passIdx = columns.indexOf('password') !== -1 ? columns.indexOf('password') : columns.indexOf('pass');
        if (passIdx !== -1 && passIdx === columns.length - 1 && parts.length > columns.length) {
          password = parts.slice(passIdx).join(rule.delimiter).trim();
        }

        return {
          type: 'CUSTOM_RULE',
          url: url || 'N/A',
          domain: extractDomain(url),
          username: username || 'N/A',
          password,
          token,
          isEmail: isEmail(username),
          strength: evaluatePasswordStrength(password),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: {
            format: `Custom: ${rule.name || 'Delimiter'}`
          }
        };
      }
    }
  } catch (err) {
    // Return null if regex syntax or parsing failed
    return null;
  }
  return null;
}

/**
 * Test a custom rule against sample text
 */
export function testParserRule(rule, sampleLine) {
  if (!rule || !sampleLine) {
    return { success: false, error: 'Rule and sample line are required' };
  }
  const result = parseCustomRule(sampleLine.trim(), sampleLine, 1, 'test.txt', rule);
  if (result) {
    return { success: true, parsed: result };
  }
  return { success: false, error: 'Sample line did not match the rule specification' };
}

/**
 * Parse a raw log line or snippet into a structured payload
 */
export function parseLogLine(rawLine, lineNumber = 1, filePath = '', customRules = []) {
  if (!rawLine || typeof rawLine !== 'string') {
    return null;
  }

  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
  }

  // 0. Check custom rules first if supplied
  if (Array.isArray(customRules) && customRules.length > 0) {
    for (const rule of customRules) {
      if (rule && rule.enabled !== false) {
        const customParsed = parseCustomRule(trimmed, rawLine, lineNumber, filePath, rule);
        if (customParsed) return customParsed;
      }
    }
  }

  // 1. Check for JSON format
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const obj = JSON.parse(trimmed);
      const url = obj.url || obj.host || obj.domain || obj.site || obj.endpoint || '';
      const username = obj.username || obj.user || obj.email || obj.login || obj.account || '';
      const password = obj.password || obj.pass || obj.secret || obj.pwd || '';
      const token = obj.token || obj.apiKey || obj.access_token || obj.key || '';

      if (username || password || token || url) {
        return {
          type: token ? 'TOKEN_JSON' : 'CREDENTIAL_JSON',
          url: url || 'N/A',
          domain: extractDomain(url),
          username: username || (isEmail(obj.email) ? obj.email : 'N/A'),
          password: password || '',
          token: token || '',
          isEmail: isEmail(username),
          strength: evaluatePasswordStrength(password),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: { format: 'JSON' }
        };
      }
    } catch {
      // Not JSON, continue to other parsers
    }
  }

  // 2. Check for Token / API Key / Secret patterns
  const jwtMatch = trimmed.match(/(?:Bearer\s+|jwt=|token=)?(ey[A-Za-z0-9_-]{15,}\.ey[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,})/i);
  if (jwtMatch) {
    return {
      type: 'JWT_TOKEN',
      url: 'Token / Auth',
      domain: 'JWT Secret',
      username: 'Bearer Token',
      password: '',
      token: jwtMatch[1],
      isEmail: false,
      strength: { level: 'Cryptographic', score: 4, color: 'violet', entropy: calculateEntropy(jwtMatch[1]) },
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'JWT Token' }
    };
  }

  const apiKeyMatch = trimmed.match(/(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth_token|client_secret)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/i);
  if (apiKeyMatch) {
    return {
      type: 'API_KEY',
      url: 'API Service',
      domain: 'API Credential',
      username: apiKeyMatch[0].split(/[:=]/)[0].trim(),
      password: '',
      token: apiKeyMatch[1],
      isEmail: false,
      strength: { level: 'API Key', score: 3, color: 'cyan', entropy: calculateEntropy(apiKeyMatch[1]) },
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'API Key' }
    };
  }

  // 3. Check for Stealer multi-line key-value markers on a single line
  // e.g. "URL: https://... | USER: admin | PASS: 12345" or "URL: ... Username: ... Password: ..."
  const inlineStealerMatch = trimmed.match(/URL:\s*(https?:\/\/[^\s|]+).*?(?:USER|Username|Login):\s*([^\s|]+).*?(?:PASS|Password|Pwd):\s*([^\s|]+)/i);
  if (inlineStealerMatch) {
    const url = inlineStealerMatch[1].trim();
    const user = inlineStealerMatch[2].trim();
    const pass = inlineStealerMatch[3].trim();
    return {
      type: 'STEALER_INLINE',
      url,
      domain: extractDomain(url),
      username: user,
      password: pass,
      token: '',
      isEmail: isEmail(user),
      strength: evaluatePasswordStrength(pass),
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'Stealer Inline' }
    };
  }

  // 4. Standard Delimited Combos: url:user:pass or user:pass:url or domain:port:user:pass
  // Check if string contains standard URL prefix: http:// or https:// or android://
  if (/^https?:\/\//i.test(trimmed) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/?[^:]*:[^:]+:[^:]+/.test(trimmed)) {
    // Format: http://domain.com:user:pass OR http://domain.com:8080:user:pass
    // Let's split by colon carefully
    const urlMatch = trimmed.match(/^(https?:\/\/[^:]+(?::\d+)?(?:\/[^\s:]*)?):([^:]+):(.*)$/i);
    if (urlMatch) {
      const url = urlMatch[1].trim();
      const user = urlMatch[2].trim();
      const pass = urlMatch[3].trim();
      return {
        type: 'URL_USER_PASS',
        url,
        domain: extractDomain(url),
        username: user,
        password: pass,
        token: '',
        isEmail: isEmail(user),
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { format: 'URL:User:Pass' }
      };
    }

    // Host without http protocol: sub.example.com:80:user:pass or sub.example.com:user:pass
    const domainMatch = trimmed.match(/^([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/[^:]*)?):([^:]+):(.*)$/i);
    if (domainMatch) {
      const url = 'https://' + domainMatch[1].trim();
      const user = domainMatch[2].trim();
      const pass = domainMatch[3].trim();
      return {
        type: 'URL_USER_PASS',
        url,
        domain: extractDomain(url),
        username: user,
        password: pass,
        token: '',
        isEmail: isEmail(user),
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { format: 'Domain:User:Pass' }
      };
    }
  }

  // 5. Pipe or Semicolon Delimited: url|user|pass or user|pass|url
  if (trimmed.includes('|') || trimmed.includes(';')) {
    const sep = trimmed.includes('|') ? '|' : ';';
    const parts = trimmed.split(sep).map(p => p.trim());
    if (parts.length >= 3) {
      // Find which part is URL, email/user, password
      let url = '';
      let user = '';
      let pass = '';

      for (const part of parts) {
        if (/^https?:\/\//i.test(part) || /\.[a-z]{2,}/i.test(part)) {
          if (!url) url = part;
        } else if (isEmail(part) || (!user && part.length < 50)) {
          user = part;
        } else if (!pass) {
          pass = part;
        }
      }

      if (!url && parts[0]) url = parts[0];
      if (!user && parts[1]) user = parts[1];
      if (!pass && parts[2]) pass = parts[2];

      return {
        type: 'DELIMITED_COMBO',
        url: url || 'N/A',
        domain: extractDomain(url),
        username: user || 'N/A',
        password: pass || '',
        token: '',
        isEmail: isEmail(user),
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { format: `Delimited (${sep})` }
      };
    }
  }

  // 6. Two-part Colon Combo: user:pass or email:password
  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0 && colonIndex < trimmed.length - 1) {
    const user = trimmed.slice(0, colonIndex).trim();
    const pass = trimmed.slice(colonIndex + 1).trim();

    // Check if looks like valid user:pass pair
    if (!user.includes(' ') && pass.length > 0 && user.length < 100) {
      let domain = 'Generic Auth';
      if (isEmail(user)) {
        domain = user.split('@')[1];
      }
      return {
        type: 'USER_PASS',
        url: domain !== 'Generic Auth' ? `https://${domain}` : 'Local/Direct Auth',
        domain,
        username: user,
        password: pass,
        token: '',
        isEmail: isEmail(user),
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { format: 'User:Pass' }
      };
    }
  }

  // 7. General Log Line fallback (e.g. Syslog, Access Log, keyword match)
  return {
    type: 'RAW_LOG_ENTRY',
    url: 'Log Entry',
    domain: 'Server / System',
    username: 'N/A',
    password: '',
    token: '',
    isEmail: false,
    strength: { level: 'None', score: 0, color: 'gray' },
    raw: rawLine,
    lineNumber,
    filePath,
    metadata: { format: 'Raw Log' }
  };
}

/**
 * Multi-line block extractor (e.g. Redline stealer dumps that span 3-5 lines)
 */
export function parseMultiLineStealerBlocks(rawText, filePath = '') {
  const results = [];
  const lines = rawText.split(/\r?\n/);
  
  let currentBlock = null;
  let blockStartLine = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lineNum = i + 1;

    // Check start of new block: URL: ... or Soft: ... or ==============
    const urlMatch = trimmed.match(/^(?:URL|Host|Site|Domain|Soft URL):\s*(.+)$/i);
    const userMatch = trimmed.match(/^(?:USER|Username|Login|Account|User Name|Email):\s*(.+)$/i);
    const passMatch = trimmed.match(/^(?:PASS|Password|Pwd|Passwd):\s*(.+)$/i);
    const appMatch = trimmed.match(/^(?:Application|Browser|Software|Profile):\s*(.+)$/i);

    if (urlMatch) {
      if (currentBlock && (currentBlock.username || currentBlock.password)) {
        // finalize previous block
        results.push(finalizeBlock(currentBlock, filePath));
      }
      blockStartLine = lineNum;
      currentBlock = {
        url: urlMatch[1].trim(),
        username: '',
        password: '',
        app: '',
        startLine: blockStartLine,
        lines: [line]
      };
    } else if (currentBlock) {
      currentBlock.lines.push(line);
      if (userMatch) {
        currentBlock.username = userMatch[1].trim();
      } else if (passMatch) {
        currentBlock.password = passMatch[1].trim();
      } else if (appMatch) {
        currentBlock.app = appMatch[1].trim();
      } else if (trimmed.startsWith('====') || trimmed.startsWith('----') || trimmed === '') {
        if (currentBlock.username || currentBlock.password) {
          results.push(finalizeBlock(currentBlock, filePath));
          currentBlock = null;
        }
      }
    }
  }

  if (currentBlock && (currentBlock.username || currentBlock.password)) {
    results.push(finalizeBlock(currentBlock, filePath));
  }

  return results;
}

function finalizeBlock(block, filePath) {
  const url = block.url || 'N/A';
  const username = block.username || 'N/A';
  const password = block.password || '';
  return {
    type: 'STEALER_MULTILINE',
    url,
    domain: extractDomain(url),
    username,
    password,
    token: '',
    isEmail: isEmail(username),
    strength: evaluatePasswordStrength(password),
    raw: block.lines.join('\n'),
    lineNumber: block.startLine,
    filePath,
    metadata: {
      format: 'Stealer Block',
      application: block.app || 'Unknown'
    }
  };
}
