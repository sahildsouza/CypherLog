/**
 * Intelligent Log & Credential Payload Parser
 * Automatically identifies, extracts, and standardizes credentials across all delimiter formats,
 * multi-line stealer blocks, key-value logs, JSON dumps, and token payloads without needing manual rules.
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
 * Helper to test if a string looks like a web URL or domain
 */
function isUrlOrHost(str) {
  if (!str) return false;
  const s = str.trim();
  return /^https?:\/\//i.test(s) || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$/i.test(s);
}

/**
 * Parse a raw log line or snippet into a structured payload using smart auto-detection
 */
export function parseLogLine(rawLine, lineNumber = 1, filePath = '') {
  if (!rawLine || typeof rawLine !== 'string') {
    return null;
  }

  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return null;
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
          domain: url ? extractDomain(url) : (isEmail(username) ? username.split('@')[1] : 'JSON Dump'),
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
      // Not valid JSON, continue to other parsers
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

  const apiKeyMatch = trimmed.match(/(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth_token|client_secret|private[_-]?key)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,})['"]?/i);
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

  // 3. Key=Value / Stealer Multi-Key inline formats (e.g. "URL: ... USER: ... PASS: ..." or "user=admin pass=123 url=site")
  const inlineStealerMatch = trimmed.match(/(?:URL|Host|Site|Domain):\s*([^\s|;]+).*?(?:USER|Username|Login|Email|Account):\s*([^\s|;]+).*?(?:PASS|Password|Pwd|Passwd):\s*([^\s|;]+)/i);
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
      metadata: { format: 'Stealer Key-Value' }
    };
  }

  // 4. Fast Path: Standard Colon Combo with Protocol (https://site.com:user:pass or http://site.com:8080:user:pass)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const protoEnd = trimmed.indexOf('://') + 3;
    const firstColon = trimmed.indexOf(':', protoEnd);
    if (firstColon !== -1) {
      const secondColon = trimmed.indexOf(':', firstColon + 1);
      if (secondColon !== -1) {
        const url = trimmed.slice(0, firstColon).trim();
        const user = trimmed.slice(firstColon + 1, secondColon).trim();
        const pass = trimmed.slice(secondColon + 1).trim();
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
    }
  }

  // 5. Universal Smart Delimiter Detector (Handles Pipe '|', Semicolon ';', Tab '\t', Comma ',', Colon ':')
  const delimiters = ['|', ';', '\t', ',', ':'];
  for (const delim of delimiters) {
    if (!trimmed.includes(delim)) continue;

    const parts = trimmed.split(delim).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    // Detect if this split represents valid credentials
    let detectedUrl = '';
    let detectedUser = '';
    let detectedPass = '';

    if (parts.length >= 3) {
      // 3+ Parts: Determine positions of URL, User, Pass
      if (isUrlOrHost(parts[0])) {
        // Format: URL <delim> User <delim> Pass
        detectedUrl = parts[0];
        detectedUser = parts[1];
        detectedPass = parts.slice(2).join(delim);
      } else if (isUrlOrHost(parts[parts.length - 1])) {
        // Format: User <delim> Pass <delim> URL
        detectedUser = parts[0];
        detectedPass = parts.slice(1, parts.length - 1).join(delim);
        detectedUrl = parts[parts.length - 1];
      } else {
        // Default position: Part0 = User/URL, Part1 = User/Pass, Part2 = Pass
        if (isEmail(parts[0]) || isEmail(parts[1])) {
          if (isEmail(parts[0])) {
            detectedUser = parts[0];
            detectedPass = parts[1];
            detectedUrl = parts.slice(2).join(delim);
          } else {
            detectedUrl = parts[0];
            detectedUser = parts[1];
            detectedPass = parts.slice(2).join(delim);
          }
        } else {
          detectedUrl = parts[0];
          detectedUser = parts[1];
          detectedPass = parts.slice(2).join(delim);
        }
      }

      if (detectedUser || detectedPass) {
        let domain = detectedUrl ? extractDomain(detectedUrl) : 'Delimited';
        if (domain === 'Unknown' || domain === 'Delimited') {
          if (isEmail(detectedUser)) domain = detectedUser.split('@')[1];
        }

        return {
          type: 'DELIMITED_COMBO',
          url: detectedUrl || 'N/A',
          domain,
          username: detectedUser || 'N/A',
          password: detectedPass || '',
          token: '',
          isEmail: isEmail(detectedUser),
          strength: evaluatePasswordStrength(detectedPass),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: { format: `Delimited (${delim === '\t' ? 'TAB' : delim})` }
        };
      }
    } else if (parts.length === 2 && delim !== ',') {
      // 2 Parts (e.g. user:pass, user|pass, user;pass, email:password)
      const user = parts[0];
      const pass = parts[1];

      if (user && pass && !user.includes(' ') && user.length < 100) {
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
          metadata: { format: `User${delim}Pass` }
        };
      }
    }
  }

  // 6. Space-Separated Combos (e.g. "admin@gmail.com SuperPassword123" or "admin@gmail.com pass https://target.com")
  if (trimmed.includes(' ')) {
    const spaceParts = trimmed.split(/\s+/);
    if (spaceParts.length === 2 && isEmail(spaceParts[0])) {
      const user = spaceParts[0];
      const pass = spaceParts[1];
      const domain = user.split('@')[1];
      return {
        type: 'SPACE_COMBO',
        url: `https://${domain}`,
        domain,
        username: user,
        password: pass,
        token: '',
        isEmail: true,
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { format: 'Space-Delimited' }
      };
    } else if (spaceParts.length >= 3 && (isEmail(spaceParts[0]) || isEmail(spaceParts[1]) || isUrlOrHost(spaceParts[0]) || isUrlOrHost(spaceParts[spaceParts.length - 1]))) {
      let url = 'N/A';
      let user = '';
      let pass = '';

      for (const p of spaceParts) {
        if (isUrlOrHost(p) && url === 'N/A') url = p;
        else if (isEmail(p) && !user) user = p;
        else if (!pass) pass = p;
      }

      if (user || pass) {
        const domain = url !== 'N/A' ? extractDomain(url) : (isEmail(user) ? user.split('@')[1] : 'Space Combo');
        return {
          type: 'SPACE_COMBO',
          url,
          domain,
          username: user || 'N/A',
          password: pass || '',
          token: '',
          isEmail: isEmail(user),
          strength: evaluatePasswordStrength(pass),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: { format: 'Space-Delimited' }
        };
      }
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
