import { beforeAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { enableMapSet } from 'immer';

// Enable Immer MapSet plugin
enableMapSet();

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

// Mock Next.js server components
vi.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      return new Request(input, init);
    }
  },
  NextResponse: class NextResponse extends Response {
    static json(body: any, init?: ResponseInit) {
      return new Response(JSON.stringify(body), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
  },
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Global test setup
beforeAll(() => {
  // Mock window.fetch
  global.fetch = vi.fn();
  
  // Mock environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
});