/**
 * Rate Limiting and Security
 * 
 * Protect API endpoints from abuse
 */

import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Rate limiter instances
const rateLimiters = new Map<string, LRUCache<string, number>>();

export interface RateLimitConfig {
  interval: number; // Time window in ms
  uniqueTokenPerInterval: number; // Max requests per interval
}

// Default configurations
export const RATE_LIMIT_CONFIGS = {
  api: { interval: 60000, uniqueTokenPerInterval: 100 }, // 100 req/min
  auth: { interval: 60000, uniqueTokenPerInterval: 5 }, // 5 req/min
  upload: { interval: 3600000, uniqueTokenPerInterval: 50 }, // 50 req/hour
  stripe: { interval: 60000, uniqueTokenPerInterval: 10 }, // 10 req/min
} as const;

// Get or create rate limiter
function getRateLimiter(key: string, config: RateLimitConfig) {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, new LRUCache<string, number>({
      max: config.uniqueTokenPerInterval,
      ttl: config.interval,
    }));
  }
  return rateLimiters.get(key)!;
}

// Get client identifier
export async function getClientId(request: NextRequest): Promise<string> {
  const headersList = headers();
  
  // Try to get from various sources
  const forwarded = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  
  // Use the most reliable IP
  const ip = cfConnectingIp || realIp || forwarded?.split(',')[0] || 'anonymous';
  
  // For authenticated requests, use user ID
  const authHeader = headersList.get('authorization');
  if (authHeader) {
    // Extract user ID from JWT or session
    // This is a simplified version - implement proper JWT verification
    return `user:${authHeader}`;
  }
  
  return `ip:${ip}`;
}

// Rate limit middleware
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_CONFIGS.api
): Promise<NextResponse | null> {
  const clientId = await getClientId(request);
  const key = `${request.nextUrl.pathname}:${request.method}`;
  const limiter = getRateLimiter(key, config);
  
  const tokenCount = limiter.get(clientId) || 0;
  
  if (tokenCount >= config.uniqueTokenPerInterval) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: Math.ceil(config.interval / 1000),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(config.uniqueTokenPerInterval),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + config.interval).toISOString(),
          'Retry-After': String(Math.ceil(config.interval / 1000)),
        },
      }
    );
  }
  
  limiter.set(clientId, tokenCount + 1);
  
  return null; // Continue with request
}

// Security headers middleware
export function securityHeaders(response: NextResponse): NextResponse {
  // HSTS
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection (legacy but still useful)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://o4504426019373056.ingest.sentry.io",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

// CORS configuration
export function corsHeaders(
  request: NextRequest,
  response: NextResponse,
  allowedOrigins: string[] = []
): NextResponse {
  const origin = request.headers.get('origin');
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    response.headers.set('Access-Control-Max-Age', '86400');
  }
  
  return response;
}

// Validate request body size
export function validateBodySize(
  request: NextRequest,
  maxSizeBytes: number = 10 * 1024 * 1024 // 10MB default
): boolean {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return false;
  }
  
  return true;
}

// API key validation
export async function validateApiKey(
  request: NextRequest,
  validKeys: Set<string>
): Promise<boolean> {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey || !validKeys.has(apiKey)) {
    return false;
  }
  
  // Log API key usage
  console.log(`API key used: ${apiKey.substring(0, 8)}...`);
  
  return true;
}