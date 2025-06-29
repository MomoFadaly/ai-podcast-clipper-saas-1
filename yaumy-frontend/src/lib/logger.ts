/**
 * Production Logging System
 * 
 * Structured logging with different levels and targets
 */

import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

// Request context storage
const requestContext = new AsyncLocalStorage<{
  requestId: string;
  userId?: string;
  sessionId?: string;
}>();

// Create logger based on environment
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  
  // Pretty print in development
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
  
  // Base configuration
  base: {
    env: process.env.NODE_ENV,
    revision: process.env.VERCEL_GIT_COMMIT_SHA,
  },
  
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'api_key',
      'secret',
      '*.password',
      '*.token',
      '*.apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
  
  // Custom serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      duration: res.duration,
    }),
    error: pino.stdSerializers.err,
  },
});

// Add request context to logs
export const log = new Proxy(logger, {
  get(target, property, receiver) {
    const ctx = requestContext.getStore();
    
    if (ctx && typeof target[property as keyof typeof target] === 'function') {
      return new Proxy(target[property as keyof typeof target], {
        apply(fn, thisArg, args) {
          // Add context to first argument if it's an object
          if (args[0] && typeof args[0] === 'object') {
            args[0] = { ...ctx, ...args[0] };
          } else {
            // Otherwise prepend context as first argument
            args.unshift(ctx);
          }
          return fn.apply(thisArg, args);
        },
      });
    }
    
    return Reflect.get(target, property, receiver);
  },
});

// Log levels
export const LogLevel = {
  TRACE: 'trace',
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
} as const;

// Structured logging helpers
export const loggers = {
  // API logging
  api: {
    request: (method: string, path: string, data?: any) => {
      log.info({ method, path, data }, 'API request');
    },
    response: (method: string, path: string, status: number, duration: number) => {
      log.info({ method, path, status, duration }, 'API response');
    },
    error: (method: string, path: string, error: Error) => {
      log.error({ method, path, error }, 'API error');
    },
  },
  
  // Database logging
  db: {
    query: (query: string, params?: any[], duration?: number) => {
      log.debug({ query, params, duration }, 'Database query');
    },
    error: (query: string, error: Error) => {
      log.error({ query, error }, 'Database error');
    },
  },
  
  // Authentication logging
  auth: {
    login: (userId: string, method: string) => {
      log.info({ userId, method }, 'User login');
    },
    logout: (userId: string) => {
      log.info({ userId }, 'User logout');
    },
    failed: (email: string, reason: string) => {
      log.warn({ email, reason }, 'Authentication failed');
    },
  },
  
  // Business events
  business: {
    projectCreated: (projectId: string, userId: string, type: string) => {
      log.info({ projectId, userId, type }, 'Project created');
    },
    subscriptionChanged: (userId: string, plan: string, action: string) => {
      log.info({ userId, plan, action }, 'Subscription changed');
    },
    paymentProcessed: (userId: string, amount: number, currency: string) => {
      log.info({ userId, amount, currency }, 'Payment processed');
    },
  },
  
  // Performance logging
  perf: {
    slow: (operation: string, duration: number, threshold: number) => {
      log.warn({ operation, duration, threshold }, 'Slow operation detected');
    },
    measure: async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
      const start = Date.now();
      try {
        const result = await fn();
        const duration = Date.now() - start;
        log.debug({ operation, duration }, 'Operation completed');
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        log.error({ operation, duration, error }, 'Operation failed');
        throw error;
      }
    },
  },
  
  // Security logging
  security: {
    suspicious: (type: string, details: any) => {
      log.warn({ type, details }, 'Suspicious activity detected');
    },
    blocked: (reason: string, clientId: string) => {
      log.warn({ reason, clientId }, 'Request blocked');
    },
  },
};

// Request context middleware
export function withRequestContext<T>(
  requestId: string,
  userId?: string,
  sessionId?: string,
  fn: () => T
): T {
  return requestContext.run({ requestId, userId, sessionId }, fn);
}

// Error logging with context
export function logError(error: Error, context?: Record<string, any>) {
  log.error({ error, ...context }, error.message);
}

// Audit logging
export function auditLog(
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: Record<string, any>
) {
  log.info(
    {
      audit: true,
      action,
      resourceType,
      resourceId,
      changes,
      timestamp: new Date().toISOString(),
    },
    'Audit log'
  );
}

// Export logger instance for direct use
export { logger };