/**
 * Intelligent Log & Credential Payload Parser
 * Automatically identifies, extracts, and standardizes credentials across all delimiter formats,
 * multi-line stealer blocks, country-tagged combos, key-value logs, JSON dumps, and token payloads.
 */

const COMMON_WEAK_PASSWORDS = new Set(['123456', 'password', '12345678', 'qwerty', '123456789', 'admin', 'pass123', 'root']);

/**
 * Calculate approximate Shannon entropy for password strength evaluation (High performance)
 */
export function calculateEntropy(password) {
  if (!password || typeof password !== 'string') return 0;
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
 * Extract clean domain name from URL or host string
 */
export function extractDomain(urlOrHost) {
  if (!urlOrHost || typeof urlOrHost !== 'string') return 'Unknown';
  let host = urlOrHost.trim();
  if (!host || host === 'N/A' || host === 'Log Entry' || host === 'Generic Auth' || host === 'Local/Direct Auth') {
    return host || 'Unknown';
  }

  // Strip leading tags/country codes like "FR ", "[US] ", "192.168.1.1 " if present
  host = host.replace(/^(?:[A-Z]{2,3}|\[[^\]]+\])\s+/i, '');

  // Strip protocols
  const protoIdx = host.indexOf('://');
  if (protoIdx !== -1) {
    host = host.slice(protoIdx + 3);
  } else if (host.startsWith('//')) {
    host = host.slice(2);
  }

  // Strip path
  const slashIdx = host.indexOf('/');
  if (slashIdx !== -1) {
    host = host.slice(0, slashIdx);
  }

  // Strip query & hash
  const qIdx = host.indexOf('?');
  if (qIdx !== -1) host = host.slice(0, qIdx);
  const hashIdx = host.indexOf('#');
  if (hashIdx !== -1) host = host.slice(0, hashIdx);

  // Strip port
  const colonIdx = host.indexOf(':');
  if (colonIdx !== -1) {
    host = host.slice(0, colonIdx);
  }

  // Strip www.
  if (host.toLowerCase().startsWith('www.')) {
    host = host.slice(4);
  }

  return host || 'Unknown';
}

/**
 * Checks if a string is a valid email
 */
export function isEmail(str) {
  if (!str || typeof str !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str.trim());
}

/**
 * Helper to test if a string looks like a web URL or domain
 */
function isUrlOrHost(str) {
  if (!str || typeof str !== 'string') return false;
  let s = str.trim().replace(/^(?:[A-Z]{2,3}|\[[^\]]+\])\s+/i, '');
  if (s.startsWith('//')) s = s.slice(2);
  if (/^https?:\/\//i.test(s)) return true;
  return /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}(?::\d+)?(?:\/.*)?$/i.test(s);
}

/**
 * Detect server access logs, syslogs, and raw operational noise
 */
function isServerLogOrNoise(line) {
  if (!line || typeof line !== 'string') return true;
  const s = line.trim();
  if (/\b(?:GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\s+\/[^\s]*\s+HTTP\/\d\.\d/i.test(s)) return true;
  if (/^\[\d{2}\/[A-Za-z]{3}\/\d{4}:\d{2}:\d{2}:\d{2}/.test(s) || /\s+-\s+-\s+\[\d{2}\/[A-Za-z]{3}\/\d{4}/.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:\s*\[(INFO|DEBUG|WARN|ERROR|FATAL|TRACE)\])?/i.test(s)) return true;
  if (/^[A-Za-z]{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+[^\s]+\s+[^\s:]+\[\d+\]:/i.test(s)) return true;
  return false;
}

/**
 * Extract leading country code or metadata tag (e.g. "FR ", "IN ", "[US] ", "DE ")
 */
function extractLeadingTag(str) {
  const match = str.match(/^(?:([A-Z]{2,3})|\[([A-Za-z0-9_-]+)\])\s+/);
  if (match) {
    return {
      tag: (match[1] || match[2]).toUpperCase(),
      remainder: str.slice(match[0].length).trim()
    };
  }
  return { tag: '', remainder: str.trim() };
}

/**
 * Parse a raw log line or snippet into a structured payload using smart multi-format auto-detection
 */
export function parseLogLine(rawLine, lineNumber = 1, filePath = '') {
  if (!rawLine || typeof rawLine !== 'string') {
    return null;
  }

  const trimmed = rawLine.trim();
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || /^={3,}/.test(trimmed) || /^-{3,}/.test(trimmed)) {
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
          username: username || (isEmail(obj.email) ? obj.email : '—'),
          password: password || '',
          country: '',
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
      country: '',
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
      country: '',
      token: apiKeyMatch[1],
      isEmail: false,
      strength: { level: 'API Key', score: 3, color: 'cyan', entropy: calculateEntropy(apiKeyMatch[1]) },
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'API Key' }
    };
  }

  // 3. Early check for pure server access logs / syslog noise
  if (isServerLogOrNoise(trimmed)) {
    return {
      type: 'RAW_LOG_ENTRY',
      url: 'Log Entry',
      domain: 'Server / System',
      username: '—',
      password: '',
      country: '',
      token: '',
      isEmail: false,
      strength: { level: 'None', score: 0, color: 'gray' },
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'System / Access Log' }
    };
  }

  // 4. Key=Value / Stealer Multi-Key inline formats (e.g. "URL: ... USER: ... PASS: ...")
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
      country: '',
      token: '',
      isEmail: isEmail(user),
      strength: evaluatePasswordStrength(pass),
      raw: rawLine,
      lineNumber,
      filePath,
      metadata: { format: 'Stealer Key-Value' }
    };
  }

  // 5. Primary URL-Protocol Match with Optional Country/Region Tag
  // Handles: "FR https://www.site.com/path:user@email.com:pass"
  // Handles: "https://site.com:8080/path:user:pass:with:colons"
  // Handles: "[US] https://site.com|user|pass"
  const urlProtocolMatch = trimmed.match(/^(?:([A-Z]{2,3}|\[[^\]]+\])\s+)?(https?:\/\/[^\s|;,\t:]+(?::\d+)?(?:\/[^\s|;,\t]*)?)([\s:|;,\t]+)(.+)$/i);
  if (urlProtocolMatch) {
    const rawTag = urlProtocolMatch[1] ? urlProtocolMatch[1].replace(/[\[\]]/g, '').trim().toUpperCase() : '';
    const url = urlProtocolMatch[2].trim();
    const rest = urlProtocolMatch[4].trim();

    let user = '';
    let pass = '';

    // Check if rest contains an email address to use as exact anchor
    const emailMatch = rest.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      const email = emailMatch[1];
      const emailStart = rest.indexOf(email);
      if (emailStart === 0) {
        user = email;
        pass = rest.slice(email.length).replace(/^[:|;,\t\s]+/, '').trim();
      } else {
        user = email;
        pass = rest.slice(emailStart + email.length).replace(/^[:|;,\t\s]+/, '').trim();
      }
    } else {
      // Split on first delimiter in rest
      const delimMatch = rest.match(/[:|;,\t]+/);
      if (delimMatch) {
        const delim = delimMatch[0];
        const delimIdx = rest.indexOf(delim);
        user = rest.slice(0, delimIdx).trim();
        pass = rest.slice(delimIdx + delim.length).trim();
      } else if (rest.includes(' ')) {
        const spaceParts = rest.split(/\s+/);
        user = spaceParts[0];
        pass = spaceParts.slice(1).join(' ');
      } else {
        user = rest;
        pass = '';
      }
    }

    if (user || pass) {
      return {
        type: 'URL_USER_PASS',
        url,
        domain: extractDomain(url),
        username: user || '—',
        password: pass || '',
        country: rawTag,
        token: '',
        isEmail: isEmail(user),
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { 
          format: rawTag ? `Tagged (${rawTag}) URL:User:Pass` : 'URL:User:Pass',
          country: rawTag
        }
      };
    }
  }

  // 6. Email-Anchored Combo Dumps (when there is no explicit https:// protocol)
  // Handles: "FR domain.com:user@gmail.com:password"
  // Handles: "resume-now.com:user@gmail.com:password"
  // Handles: "user@gmail.com:password:https://site.com"
  // Handles: "user@gmail.com:password"
  const emailMatch = trimmed.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    const email = emailMatch[1];
    const emailIdx = trimmed.indexOf(email);
    const beforeRaw = trimmed.slice(0, emailIdx).replace(/[:|;,\t\s]+$/, '').trim();
    const afterRaw = trimmed.slice(emailIdx + email.length).replace(/^[:|;,\t\s]+/, '').trim();

    const { tag, remainder: before } = extractLeadingTag(beforeRaw);

    let url = '';
    let user = email;
    let pass = '';

    if (before && isUrlOrHost(before)) {
      // Format: [Tag] Domain.com : User@email.com : Password
      url = before.startsWith('http') ? before : `https://${before}`;
      pass = afterRaw;
    } else if (afterRaw) {
      // Check if afterRaw has a trailing URL/domain: "password:https://site.com" or "password:site.com"
      const trailingUrlMatch = afterRaw.match(/^(.*?)(?:[:|;,\t\s]+)(https?:\/\/[^\s|;,\t:]+(?::\d+)?(?:\/[^\s|;,\t]*)?|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}(?::\d+)?(?:\/[^\s|;,\t]*)?)$/i);
      if (trailingUrlMatch) {
        pass = trailingUrlMatch[1].trim();
        const trailingHost = trailingUrlMatch[2].trim();
        url = trailingHost.startsWith('http') ? trailingHost : `https://${trailingHost}`;
      } else {
        // Format: User@email.com : Password
        url = `https://${email.split('@')[1]}`;
        pass = afterRaw;
      }
    } else if (before) {
      pass = before;
      url = `https://${email.split('@')[1]}`;
    }

    if (user && (pass || url)) {
      return {
        type: 'EMAIL_ANCHORED_COMBO',
        url: url || `https://${email.split('@')[1]}`,
        domain: url ? extractDomain(url) : email.split('@')[1],
        username: user,
        password: pass || '',
        country: tag,
        token: '',
        isEmail: true,
        strength: evaluatePasswordStrength(pass),
        raw: rawLine,
        lineNumber,
        filePath,
        metadata: { 
          format: tag ? `Tagged (${tag}) Email Combo` : 'Email:Pass Combo',
          country: tag
        }
      };
    }
  }

  // 7. Universal Smart Delimiter Detector (Handles Pipe '|', Semicolon ';', Tab '\t', Comma ',', Colon ':')
  const { tag: leadingTag, remainder: cleanLine } = extractLeadingTag(trimmed);
  const delimiters = [':::', '::', '|', ';', '\t', ',', ':'];

  for (const delim of delimiters) {
    if (!cleanLine.includes(delim)) continue;

    const parts = cleanLine.split(delim).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    let detectedUrl = '';
    let detectedUser = '';
    let detectedPass = '';

    if (parts.length >= 3) {
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
        // Position Part 0: User/URL, Part 1: Pass/User, Part 2: Pass
        detectedUrl = isUrlOrHost(parts[0]) ? parts[0] : '';
        detectedUser = parts[detectedUrl ? 1 : 0];
        detectedPass = parts.slice(detectedUrl ? 2 : 1).join(delim);
      }

      if (detectedUser || detectedPass) {
        let domain = detectedUrl ? extractDomain(detectedUrl) : 'Delimited';
        if (domain === 'Unknown' || domain === 'Delimited') {
          if (isEmail(detectedUser)) domain = detectedUser.split('@')[1];
        }

        return {
          type: 'DELIMITED_COMBO',
          url: detectedUrl || (domain !== 'Delimited' && domain !== 'Unknown' ? `https://${domain}` : 'N/A'),
          domain,
          username: detectedUser || '—',
          password: detectedPass || '',
          country: leadingTag,
          token: '',
          isEmail: isEmail(detectedUser),
          strength: evaluatePasswordStrength(detectedPass),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: { 
            format: leadingTag ? `Tagged (${leadingTag}) Delimited (${delim === '\t' ? 'TAB' : delim})` : `Delimited (${delim === '\t' ? 'TAB' : delim})`,
            country: leadingTag
          }
        };
      }
    } else if (parts.length === 2 && delim !== ',') {
      // 2 Parts: user:pass, user|pass, user;pass
      const user = parts[0];
      const pass = parts[1];

      if (user && pass && !user.includes(' ') && user.length < 120) {
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
          country: leadingTag,
          token: '',
          isEmail: isEmail(user),
          strength: evaluatePasswordStrength(pass),
          raw: rawLine,
          lineNumber,
          filePath,
          metadata: { 
            format: leadingTag ? `Tagged (${leadingTag}) User${delim}Pass` : `User${delim}Pass`,
            country: leadingTag
          }
        };
      }
    }
  }

  // 8. Space-Separated Combos (e.g. "admin@gmail.com SuperPassword123" or "site.com admin@gmail.com pass")
  if (cleanLine.includes(' ')) {
    const spaceParts = cleanLine.split(/\s+/);
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
        country: leadingTag,
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
          url: url !== 'N/A' ? url : (domain !== 'Space Combo' ? `https://${domain}` : 'N/A'),
          domain,
          username: user || '—',
          password: pass || '',
          country: leadingTag,
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

  // 9. General Log Line fallback (e.g. Syslog, Access Log, keyword match)
  return {
    type: 'RAW_LOG_ENTRY',
    url: 'Log Entry',
    domain: 'Server / System',
    username: '—',
    password: '',
    country: '',
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
  const username = block.username || '—';
  const password = block.password || '';
  return {
    type: 'STEALER_MULTILINE',
    url,
    domain: extractDomain(url),
    username,
    password,
    country: '',
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
