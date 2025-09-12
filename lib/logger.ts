// Production-ready logging utility

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, any>;
  error?: Error;
  userId?: string;
  requestId?: string;
  ip?: string;
}

class Logger {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = this.getLogLevel();
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    switch (level) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const colorCodes = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow
        INFO: '\x1b[36m',  // Cyan
        DEBUG: '\x1b[90m', // Gray
      };
      const resetColor = '\x1b[0m';
      const color = colorCodes[entry.level as keyof typeof colorCodes] || '';
      
      let output = `${color}[${entry.timestamp}] ${entry.level}:${resetColor} ${entry.message}`;
      
      if (entry.meta && Object.keys(entry.meta).length > 0) {
        output += `\n  Meta: ${JSON.stringify(entry.meta, null, 2)}`;
      }
      
      if (entry.error) {
        output += `\n  Error: ${entry.error.message}`;
        if (entry.error.stack) {
          output += `\n  Stack: ${entry.error.stack}`;
        }
      }
      
      return output;
    } else {
      // JSON format for production (easier for log aggregation)
      return JSON.stringify(entry);
    }
  }

  private writeLog(entry: LogEntry): void {
    const formattedEntry = this.formatLogEntry(entry);
    
    if (entry.level === 'ERROR') {
      console.error(formattedEntry);
    } else if (entry.level === 'WARN') {
      console.warn(formattedEntry);
    } else {
      console.log(formattedEntry);
    }

    // In production, you might want to send logs to external service
    if (!this.isDevelopment && process.env.SENTRY_DSN) {
      // Send to Sentry or other error tracking service
      this.sendToExternalService(entry);
    }
  }

  private sendToExternalService(entry: LogEntry): void {
    // Implement external logging service integration
    // Example: Sentry, DataDog, CloudWatch, etc.
    try {
      // This is where you'd integrate with your logging service
      // For now, we'll just prepare the data structure
      const externalLogData = {
        timestamp: entry.timestamp,
        level: entry.level,
        message: entry.message,
        extra: entry.meta,
        user: entry.userId ? { id: entry.userId } : undefined,
        request: entry.requestId ? { id: entry.requestId } : undefined,
        tags: {
          environment: process.env.NODE_ENV,
          service: 'bodies-api',
        },
      };
      
      // Send to external service (implement based on your chosen service)
      // await externalLoggingService.send(externalLogData);
    } catch (error) {
      // Don't let logging errors crash the application
      console.error('Failed to send log to external service:', error);
    }
  }

  private createLogEntry(
    level: string,
    message: string,
    meta?: Record<string, any>,
    error?: Error,
    context?: { userId?: string; requestId?: string; ip?: string }
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta,
      error,
      userId: context?.userId,
      requestId: context?.requestId,
      ip: context?.ip,
    };
  }

  error(
    message: string,
    error?: Error,
    meta?: Record<string, any>,
    context?: { userId?: string; requestId?: string; ip?: string }
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.createLogEntry('ERROR', message, meta, error, context);
    this.writeLog(entry);
  }

  warn(
    message: string,
    meta?: Record<string, any>,
    context?: { userId?: string; requestId?: string; ip?: string }
  ): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.createLogEntry('WARN', message, meta, undefined, context);
    this.writeLog(entry);
  }

  info(
    message: string,
    meta?: Record<string, any>,
    context?: { userId?: string; requestId?: string; ip?: string }
  ): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.createLogEntry('INFO', message, meta, undefined, context);
    this.writeLog(entry);
  }

  debug(
    message: string,
    meta?: Record<string, any>,
    context?: { userId?: string; requestId?: string; ip?: string }
  ): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.createLogEntry('DEBUG', message, meta, undefined, context);
    this.writeLog(entry);
  }

  // API-specific logging methods
  apiRequest(
    method: string,
    path: string,
    userId?: string,
    ip?: string,
    requestId?: string
  ): void {
    this.info('API Request', {
      method,
      path,
      timestamp: Date.now(),
    }, { userId, ip, requestId });
  }

  apiResponse(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    userId?: string,
    ip?: string,
    requestId?: string
  ): void {
    const level = statusCode >= 400 ? 'WARN' : 'INFO';
    const message = `API Response - ${statusCode}`;
    
    const entry = this.createLogEntry(level, message, {
      method,
      path,
      statusCode,
      responseTime,
    }, undefined, { userId, ip, requestId });
    
    this.writeLog(entry);
  }

  databaseQuery(
    operation: string,
    collection: string,
    duration: number,
    error?: Error
  ): void {
    if (error) {
      this.error(`Database ${operation} failed on ${collection}`, error, {
        operation,
        collection,
        duration,
      });
    } else {
      this.debug(`Database ${operation} on ${collection}`, {
        operation,
        collection,
        duration,
      });
    }
  }

  securityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: Record<string, any>,
    userId?: string,
    ip?: string
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'ERROR' : 'WARN';
    
    this.writeLog(this.createLogEntry(level, `Security Event: ${event}`, {
      severity,
      ...details,
    }, undefined, { userId, ip }));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other modules
export type { LogEntry };

// Utility function to create request context
export function createRequestContext(request: Request): {
  requestId: string;
  ip: string;
  userAgent: string;
} {
  return {
    requestId: crypto.randomUUID(),
    ip: request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };
}

// Performance monitoring utility
export class PerformanceMonitor {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = performance.now();
  }

  end(success = true, meta?: Record<string, any>): number {
    const duration = performance.now() - this.startTime;
    
    if (success) {
      logger.debug(`${this.operation} completed`, {
        duration: `${duration.toFixed(2)}ms`,
        ...meta,
      });
    } else {
      logger.warn(`${this.operation} failed`, {
        duration: `${duration.toFixed(2)}ms`,
        ...meta,
      });
    }
    
    return duration;
  }
}

// Usage example:
// const monitor = new PerformanceMonitor('Database Query');
// try {
//   const result = await db.collection.find({});
//   monitor.end(true, { resultCount: result.length });
// } catch (error) {
//   monitor.end(false, { error: error.message });
// }