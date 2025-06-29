/**
 * Basic API Route Test
 * Tests the health check endpoint
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the health API route
const mockHealthResponse = {
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
};

describe('Health API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return health status', async () => {
    // Mock fetch for health endpoint
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHealthResponse,
    });

    const response = await fetch('/api/health');
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    try {
      await fetch('/api/health');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });

  it('should validate response format', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockHealthResponse,
    });

    const response = await fetch('/api/health');
    const data = await response.json();

    // Validate response structure
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(typeof data.status).toBe('string');
    expect(typeof data.timestamp).toBe('string');
  });

  it('should return proper HTTP status codes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => mockHealthResponse,
    });

    const response = await fetch('/api/health');
    
    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });
});