/** Logging utility for memsearch-ts */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export interface LoggerOptions { level?: LogLevel; prefix?: string; timestamp?: boolean; }

const LOG_LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 };

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private timestamp: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.prefix = options.prefix ?? '[memsearch]';
    this.timestamp = options.timestamp ?? false;
  }

  private shouldLog(level: LogLevel): boolean { return LOG_LEVELS[level] >= LOG_LEVELS[this.level]; }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): string {
    const ts = this.timestamp ? `${new Date().toISOString()} ` : '';
    return `${ts}${this.prefix}[${level.toUpperCase()}] ${message} ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`.trim();
  }

  debug(message: string, ...args: unknown[]) { if (this.shouldLog('debug')) console.debug(this.formatMessage('debug', message, ...args)); }
  info(message: string, ...args: unknown[]) { if (this.shouldLog('info')) console.info(this.formatMessage('info', message, ...args)); }
  warn(message: string, ...args: unknown[]) { if (this.shouldLog('warn')) console.warn(this.formatMessage('warn', message, ...args)); }
  error(message: string, ...args: unknown[]) { if (this.shouldLog('error')) console.error(this.formatMessage('error', message, ...args)); }

  child(prefix: string): Logger { return new Logger({ level: this.level, prefix: `${this.prefix}${prefix}`, timestamp: this.timestamp }); }
  setLevel(level: LogLevel): void { this.level = level; }
}

export const defaultLogger = new Logger({ prefix: '[memsearch]' });
export function createLogger(module: string, options?: Omit<LoggerOptions, 'prefix'>): Logger {
  return new Logger({ ...options, prefix: `[memsearch:${module}]` });
}

/** Wrap sync function with error context */
export function withErrorContext<T>(fn: () => T, errorMessage: string, ErrorClass: new (msg: string, code?: string, cause?: unknown) => MemSearchError, errorCode?: string): T {
  try { return fn(); } catch (error) { throw new ErrorClass(errorMessage, errorCode, error); }
}

/** Wrap async function with error context */
export async function withErrorContextAsync<T>(fn: () => Promise<T>, errorMessage: string, ErrorClass: new (msg: string, code?: string, cause?: unknown) => MemSearchError, errorCode?: string): Promise<T> {
  try { return await fn(); } catch (error) { throw new ErrorClass(errorMessage, errorCode, error); }
}

import { MemSearchError } from '../types/errors.js';
