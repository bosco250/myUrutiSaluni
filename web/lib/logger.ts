/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabledInProduction: boolean;
}

class Logger {
  private config: LoggerConfig;
  private isProduction: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.config = {
      level: this.isProduction ? 'warn' : 'debug',
      enabledInProduction: false,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction && !this.config.enabledInProduction) {
      return level === 'error' || level === 'warn';
    }
    return true;
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message), data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message), data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), data || '');
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), error || '');
      if (error?.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }

  // API error logging
  logAPIError(endpoint: string, error: any): void {
    this.error(`API Error: ${endpoint}`, {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      message: error?.message,
    });
  }

  // Component error logging
  logComponentError(componentName: string, error: Error, errorInfo?: any): void {
    this.error(`Component Error: ${componentName}`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
    });
  }
}

export const logger = new Logger();
