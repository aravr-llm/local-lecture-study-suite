export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

// Patterns to redact
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'token',
  'session_id',
  'sessionSecret',
  'cookie',
  'authorization',
  'transcript',
  'full_text',
  'secret',
  'key',
  'bearer',
];

export function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

class StructuredLogger {
  private minLevel: LogLevel = LogLevel.INFO;

  constructor() {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      this.minLevel = LogLevel.DEBUG;
    }
  }

  private formatLog(level: LogLevel, component: string, message: string, context?: Record<string, unknown>): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      component,
      message,
      ...(context ? { context: redactSensitiveData(context) } : {}),
    };
    return JSON.stringify(entry);
  }

  public debug(component: string, message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.DEBUG) {
      console.debug(this.formatLog(LogLevel.DEBUG, component, message, context));
    }
  }

  public info(component: string, message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.INFO) {
      console.info(this.formatLog(LogLevel.INFO, component, message, context));
    }
  }

  public warn(component: string, message: string, context?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.WARN) {
      console.warn(this.formatLog(LogLevel.WARN, component, message, context));
    }
  }

  public error(component: string, message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.minLevel <= LogLevel.ERROR) {
      const errorDetails = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message }
        : { rawError: String(error) };

      console.error(
        this.formatLog(LogLevel.ERROR, component, message, {
          ...context,
          ...errorDetails,
        })
      );
    }
  }
}

export const logger = new StructuredLogger();
