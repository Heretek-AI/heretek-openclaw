/**
 * Logger - Logging utilities for the installer
 */

import chalk from 'chalk';
import ora from 'ora';

const VERBOSE = process.env.HERETEK_VERBOSE === 'true' || false;

// Log levels
const levels = {
  info: chalk.blue('[INFO]'),
  warn: chalk.yellow('[WARN]'),
  error: chalk.red('[ERROR]'),
  success: chalk.green('[OK]'),
  debug: chalk.gray('[DEBUG]')
};

// Spinner management
let currentSpinner = null;

export function startSpinner(text) {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  currentSpinner = ora({
    text,
    color: 'cyan'
  }).start();
  return currentSpinner;
}

export function stopSpinner(success = true, text = '') {
  if (currentSpinner) {
    if (success) {
      currentSpinner.succeed(text);
    } else {
      currentSpinner.fail(text);
    }
    currentSpinner = null;
  }
}

export function info(message, ...args) {
  if (!VERBOSE && args.includes('--quiet')) return;
  console.log(`${levels.info} ${message}`, ...args);
}

export function warn(message, ...args) {
  console.log(`${levels.warn} ${message}`, ...args);
}

export function error(message, ...args) {
  console.error(`${levels.error} ${message}`, ...args);
}

export function success(message, ...args) {
  console.log(`${levels.success} ${message}`, ...args);
}

export function debug(message, ...args) {
  if (VERBOSE) {
    console.log(`${levels.debug} ${message}`, ...args);
  }
}

export function header(text) {
  console.log(chalk.cyan(`\n═══ ${text} ═══`));
}

export function section(text) {
  console.log(chalk.gray(`\n${text}\n`));
}

export function step(current, total, text) {
  console.log(chalk.gray(`[${current}/${total}] ${text}`));
}

// Progress bar for long operations
export function progress(current, total, text = '') {
  const percent = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 5)) + '░'.repeat(20 - Math.floor(percent / 5));
  process.stdout.write(`\r  ${bar} ${percent}% ${text}`);
  if (current === total) {
    console.log('');
  }
}

// Table output
export function table(rows) {
  const colWidths = [];
  
  // Calculate column widths
  rows.forEach((row, i) => {
    row.forEach((cell, j) => {
      colWidths[j] = Math.max(colWidths[j] || 0, String(cell).length);
    });
  });
  
  // Print rows
  rows.forEach((row, i) => {
    const line = row.map((cell, j) => String(cell).padEnd(colWidths[j])).join('  ');
    console.log(i === 0 ? chalk.cyan(line) : line);
  });
}

// Exit with error code
export function fatal(message, code = 1) {
  error(message);
  process.exit(code);
}

// Error codes for installer
export const ERROR_CODES = {
  E001: 'Insufficient permissions (not root)',
  E002: 'Unsupported operating system',
  E003: 'Missing dependencies',
  E004: 'Network error (npm registry unreachable)',
  E005: 'Patch application failed',
  E006: 'Configuration validation failed',
  E007: 'Agent creation failed',
  E008: 'Skills installation failed',
  E009: 'Service setup failed',
  E010: 'Update check failed'
};

export function errorCode(code) {
  const desc = ERROR_CODES[code] || 'Unknown error';
  return `${code}: ${desc}`;
}

export default {
  info,
  warn,
  error,
  success,
  debug,
  header,
  section,
  step,
  progress,
  table,
  fatal,
  errorCode,
  startSpinner,
  stopSpinner
};