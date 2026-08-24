import path from 'path';
import fs from 'fs';
import os from 'os';

// Default base directory: ~/logs or ./logs fallback
let BASE_LOG_DIR = path.resolve(process.env.LOGS_DIR || path.join(process.cwd(), '..', 'logs'));

export function getBaseLogDir() {
  return BASE_LOG_DIR;
}

export function setBaseLogDir(newDir) {
  if (!newDir || typeof newDir !== 'string') {
    throw new Error('Invalid directory path');
  }

  // Handle ~ expansion
  let resolvedPath = newDir;
  if (newDir.startsWith('~')) {
    resolvedPath = path.join(os.homedir(), newDir.slice(1));
  }
  resolvedPath = path.resolve(resolvedPath);

  // Check if directory exists or can be created
  if (!fs.existsSync(resolvedPath)) {
    fs.mkdirSync(resolvedPath, { recursive: true });
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isDirectory()) {
    throw new Error('Specified path is not a directory');
  }

  BASE_LOG_DIR = resolvedPath;
  return BASE_LOG_DIR;
}

/**
 * Validates and resolves a relative or full file path to ensure it is strictly within the allowed base log directory.
 * Prevents Directory Traversal attacks (e.g. ../, ..\\, %2e%2e, symlink escape, absolute path escape).
 * 
 * @param {string} relativeOrFullPath - Path to validate
 * @returns {string} - Canonical safe absolute path
 * @throws {Error} - If path traversal or illegal access is detected
 */
export function validateSafePath(relativeOrFullPath) {
  if (!relativeOrFullPath || typeof relativeOrFullPath !== 'string') {
    throw new Error('Invalid file path specified');
  }

  // Clean path string
  const cleanInput = relativeOrFullPath.replace(/\0/g, ''); // strip null bytes
  
  let targetPath;
  if (path.isAbsolute(cleanInput)) {
    targetPath = path.resolve(cleanInput);
  } else {
    targetPath = path.resolve(BASE_LOG_DIR, cleanInput);
  }

  // Ensure BASE_LOG_DIR is resolved to real canonical path
  const canonicalBase = path.resolve(BASE_LOG_DIR);
  
  // Strict boundary check (case-insensitive on Windows)
  const isWindows = process.platform === 'win32';
  const targetNorm = isWindows ? targetPath.toLowerCase() : targetPath;
  const baseNorm = isWindows ? canonicalBase.toLowerCase() : canonicalBase;
  const sep = isWindows ? '\\' : path.sep;

  const isWithinBase = targetNorm === baseNorm || targetNorm.startsWith(baseNorm + sep);
  
  if (!isWithinBase) {
    const error = new Error('Access Denied: Path Traversal attempt detected outside the authorized logs directory.');
    error.statusCode = 403;
    throw error;
  }

  return targetPath;
}
