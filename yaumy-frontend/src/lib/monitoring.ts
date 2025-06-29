/**
 * Production Monitoring Setup
 * 
 * Comprehensive error tracking and performance monitoring
 */

import * as Sentry from '@sentry/nextjs';
import { CaptureConsole } from '@sentry/integrations';

// Initialize Sentry
export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: 1.0,
      
      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      
      // Integrations
      integrations: [
        new CaptureConsole({ levels: ['error', 'warn'] }),
        new Sentry.BrowserTracing({
          routingInstrumentation: Sentry.nextRouterInstrumentation,
        }),
        new Sentry.Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      
      // Filtering
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        /extension\//i,
        /^chrome:\/\//i,
      ],
      
      beforeSend(event, hint) {
        // Filter out local development errors
        if (window.location.hostname === 'localhost') {
          return null;
        }
        
        // Add user context
        if (event.user) {
          event.user = {
            ...event.user,
            ip_address: undefined, // Don't capture IP
          };
        }
        
        return event;
      },
    });
  }
}

// Custom error boundary
export function logError(error: Error, errorInfo?: any) {
  console.error('Application error:', error);
  
  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      scope.setContext('errorInfo', errorInfo);
      Sentry.captureException(error);
    });
  }
}

// Performance tracking
export function trackPerformance(name: string, fn: () => Promise<any>) {
  const transaction = Sentry.startTransaction({ name });
  Sentry.getCurrentHub().getScope()?.setSpan(transaction);
  
  return fn()
    .then((result) => {
      transaction.setStatus('ok');
      return result;
    })
    .catch((error) => {
      transaction.setStatus('internal_error');
      throw error;
    })
    .finally(() => {
      transaction.finish();
    });
}

// User identification
export function identifyUser(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

// Feature tracking
export function trackFeature(feature: string, properties?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message: `Feature: ${feature}`,
    category: 'feature',
    level: 'info',
    data: properties,
  });
}

// API monitoring
export async function monitoredFetch(url: string, options?: RequestInit) {
  const span = Sentry.getCurrentHub().getScope()?.getSpan();
  const child = span?.startChild({
    op: 'http.client',
    description: `${options?.method || 'GET'} ${url}`,
  });
  
  try {
    const response = await fetch(url, options);
    child?.setStatus('ok');
    
    if (!response.ok) {
      Sentry.captureMessage(`API error: ${response.status} ${url}`, 'error');
    }
    
    return response;
  } catch (error) {
    child?.setStatus('internal_error');
    throw error;
  } finally {
    child?.finish();
  }
}