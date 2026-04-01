/**
 * Logger Utility
 * 
 * Provides consistent logging with colors and formatting for the CLI.
 */

import chalk from 'chalk';

const symbols = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  debug: '●',
  arrow: '→',
  check: '☑',
  empty: '☐',
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

const levels = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
  success: 'success',
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || levels.info;
    this.prefix = options.prefix || '';
    this.showTimestamp = options.showTimestamp ?? false;
  }

  _getTimestamp() {
    if (!this.showTimestamp) return '';
    return chalk.dim(`[${new Date().toISOString().split('T')[1].split('.')[0]}] `);
  }

  _log(level, color, message, ...args) {
    const timestamp = this._getTimestamp();
    const prefix = this.prefix ? `${this.prefix} ` : '';
    
    switch (level) {
      case levels.error:
        console.error(`${timestamp}${prefix}${chalk.red(symbols.error)} ${color(message)}`, ...args);
        break;
      case levels.warn:
        console.warn(`${timestamp}${prefix}${chalk.yellow(symbols.warning)} ${color(message)}`, ...args);
        break;
      case levels.info:
        console.info(`${timestamp}${prefix}${chalk.blue(symbols.info)} ${color(message)}`, ...args);
        break;
      case levels.debug:
        if (this.level === levels.debug) {
          console.debug(`${timestamp}${prefix}${chalk.gray(symbols.debug)} ${color(message)}`, ...args);
        }
        break;
      case levels.success:
        console.log(`${timestamp}${prefix}${chalk.green(symbols.success)} ${color(message)}`, ...args);
        break;
    }
  }

  error(message, ...args) {
    this._log(levels.error, chalk.red, message, ...args);
  }

  warn(message, ...args) {
    this._log(levels.warn, chalk.yellow, message, ...args);
  }

  info(message, ...args) {
    this._log(levels.info, chalk.blue, message, ...args);
  }

  debug(message, ...args) {
    this._log(levels.debug, chalk.gray, message, ...args);
  }

  success(message, ...args) {
    this._log(levels.success, chalk.green, message, ...args);
  }

  /**
   * Print a section header
   */
  section(title) {
    console.log(`\n${chalk.cyan('═'.repeat(60))}`);
    console.log(`${chalk.cyan(symbols.arrow)} ${chalk.bold(title)}`);
    console.log(`${chalk.cyan('═'.repeat(60))}\n`);
  }

  /**
   * Print a sub-header
   */
  subheader(title) {
    console.log(`\n${chalk.yellow('─'.repeat(40))}`);
    console.log(`${chalk.yellow('→')} ${chalk.bold(title)}`);
    console.log(`${chalk.yellow('─'.repeat(40))}\n`);
  }

  /**
   * Print a list item
   */
  listItem(text, options = {}) {
    const { indent = 2, symbol = '•', color = chalk.white } = options;
    console.log(`${' '.repeat(indent)}${chalk.gray(symbol)} ${color(text)}`);
  }

  /**
   * Print a key-value pair
   */
  kv(key, value, options = {}) {
    const { indent = 2, keyColor = chalk.cyan, valueColor = chalk.white } = options;
    console.log(`${' '.repeat(indent)}${keyColor(`${key}:`)} ${valueColor(value)}`);
  }

  /**
   * Print a box with a message
   */
  box(message, options = {}) {
    const { title, padding = 1, borderColor = chalk.cyan } = options;
    const lines = message.split('\n');
    const maxWidth = Math.max(...lines.map(l => l.length), title ? title.length : 0);
    const innerWidth = maxWidth + padding * 2;
    const horizontal = '─'.repeat(innerWidth);
    
    console.log(borderColor('┌' + '─'.repeat(title ? innerWidth : innerWidth) + '┐'));
    if (title) {
      const titlePadding = ' '.repeat(Math.floor((innerWidth - title.length) / 2));
      console.log(borderColor('│') + titlePadding + chalk.bold(title) + titlePadding + borderColor('│'));
      console.log(borderColor('├' + horizontal + '┤'));
    }
    for (const line of lines) {
      const rightPadding = ' '.repeat(innerWidth - line.length - padding);
      const leftPadding = ' '.repeat(padding);
      console.log(borderColor('│') + leftPadding + line + rightPadding + borderColor('│'));
    }
    console.log(borderColor('└' + horizontal + '┘'));
  }

  /**
   * Create a progress bar
   */
  progress(current, total, options = {}) {
    const { width = 30, label = '' } = options;
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    console.log(`\r${label} [${bar}] ${percentage}% (${current}/${total})`);
  }
}

// Create default logger instance
const log = new Logger();

export { Logger, log, symbols, levels };
export default log;
