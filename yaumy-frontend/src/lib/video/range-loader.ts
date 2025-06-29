/**
 * Intelligent range request loader for video segments
 * Optimized for virtual chunking with minimal bandwidth usage
 */

import type { VideoSegment, TimeRange, LoaderConfig, LoadProgress } from './types';

/**
 * Custom error classes for better error handling
 */
export class AbortError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AbortError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class SegmentLoadError extends Error {
  constructor(message: string, public readonly segmentId: string) {
    super(message);
    this.name = 'SegmentLoadError';
  }
}

export class RangeLoader {
  private config: Required<LoaderConfig>;
  private activeRequests = new Map<string, AbortController>();
  private bitrateCache = new Map<string, number>();
  private pendingCancellations = new Map<string, ReturnType<typeof setTimeout>>();
  
  constructor(config: Partial<LoaderConfig> = {}) {
    this.config = {
      maxConcurrentRequests: 3,
      segmentBufferSize: 1024 * 1024 * 5, // 5MB default
      retryAttempts: 3,
      timeoutMs: 10000,
      ...config
    };
  }

  /**
   * Load video segment using HTTP range requests
   */
  async loadSegment(
    url: string, 
    timeRange: TimeRange,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<VideoSegment> {
    const segmentId = this.generateSegmentId(url, timeRange);
    
    // Check if there's already an active request for this exact segment
    const existingController = this.activeRequests.get(segmentId);
    if (existingController && !existingController.signal.aborted) {
      // If the same segment is already loading, don't start a new request
      throw new SegmentLoadError('Segment already loading', segmentId);
    }
    
    // Clear any pending cancellation for this segment
    const pendingTimeout = this.pendingCancellations.get(segmentId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.pendingCancellations.delete(segmentId);
    }
    
    const controller = new AbortController();
    this.activeRequests.set(segmentId, controller);

    try {
      const byteRange = await this.calculateByteRange(url, timeRange);
      const response = await this.fetchWithRange(url, byteRange, controller.signal);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await this.readResponseWithProgress(response, onProgress);
      const mimeType = response.headers.get('content-type') ?? 'video/mp4';

      // Update bitrate estimation for future calculations
      this.updateBitrateEstimate(url, timeRange, data.byteLength);

      return {
        id: segmentId,
        data,
        timeRange,
        mimeType,
        size: data.byteLength,
        loadedAt: Date.now()
      };
    } finally {
      this.activeRequests.delete(segmentId);
    }
  }

  /**
   * Load multiple segments concurrently with intelligent queuing
   */
  async loadSegments(
    requests: Array<{ url: string; timeRange: TimeRange }>,
    onProgress?: (segmentId: string, progress: LoadProgress) => void
  ): Promise<VideoSegment[]> {
    const semaphore = new Semaphore(this.config.maxConcurrentRequests);
    
    const loadPromises = requests.map(async ({ url, timeRange }) => {
      await semaphore.acquire();
      
      try {
        const segmentId = this.generateSegmentId(url, timeRange);
        return await this.loadSegment(url, timeRange, (progress) => {
          onProgress?.(segmentId, progress);
        });
      } finally {
        semaphore.release();
      }
    });

    return Promise.all(loadPromises);
  }

  /**
   * Cancel specific segment request with debouncing
   */
  cancelRequest(segmentId: string, immediate = false): void {
    // Clear any existing pending cancellation
    const pendingTimeout = this.pendingCancellations.get(segmentId);
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      this.pendingCancellations.delete(segmentId);
    }

    if (immediate) {
      this.performCancellation(segmentId);
    } else {
      // Debounce cancellation by 100ms to avoid cancelling requests that might be reused
      const timeout = setTimeout(() => {
        this.performCancellation(segmentId);
        this.pendingCancellations.delete(segmentId);
      }, 100);
      
      this.pendingCancellations.set(segmentId, timeout);
    }
  }

  /**
   * Actually perform the cancellation
   */
  private performCancellation(segmentId: string): void {
    const controller = this.activeRequests.get(segmentId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(segmentId);
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    // Clear all pending cancellations
    for (const timeout of this.pendingCancellations.values()) {
      clearTimeout(timeout);
    }
    this.pendingCancellations.clear();

    // Cancel all active requests immediately
    for (const controller of this.activeRequests.values()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Calculate byte range for time range using bitrate estimation
   */
  private async calculateByteRange(url: string, timeRange: TimeRange): Promise<{ start: number; end: number }> {
    const bitrate = await this.getBitrateEstimate(url);
    const bytesPerSecond = bitrate / 8;
    
    // Add 10% buffer for variable bitrate content
    const bufferMultiplier = 1.1;
    const startByte = Math.floor(timeRange.start * bytesPerSecond * 0.9);
    const endByte = Math.floor(timeRange.end * bytesPerSecond * bufferMultiplier);
    
    return { start: startByte, end: endByte };
  }

  /**
   * Get bitrate estimate for URL (cached or calculated)
   */
  private async getBitrateEstimate(url: string): Promise<number> {
    const cached = this.bitrateCache.get(url);
    if (cached) {
      return cached;
    }

    // Probe small segment to estimate bitrate
    const probeSize = 1024 * 100; // 100KB probe
    const probeStart = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: { 'Range': `bytes=0-${probeSize}` },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.arrayBuffer();
        const downloadTime = (Date.now() - probeStart) / 1000;
        const estimatedBitrate = (data.byteLength * 8) / downloadTime;
        
        // Reasonable bounds for video bitrate (0.5-50 Mbps)
        const clampedBitrate = Math.min(Math.max(estimatedBitrate, 500_000), 50_000_000);
        this.bitrateCache.set(url, clampedBitrate);
        
        return clampedBitrate;
      }
    } catch {
      // Fallback to conservative estimate
    }

    // Default to 2 Mbps if estimation fails
    const defaultBitrate = 2_000_000;
    this.bitrateCache.set(url, defaultBitrate);
    return defaultBitrate;
  }

  /**
   * Fetch with range headers and proper error handling
   */
  private async fetchWithRange(
    url: string, 
    byteRange: { start: number; end: number },
    signal: AbortSignal
  ): Promise<Response> {
    const headers: Record<string, string> = {
      'Range': `bytes=${byteRange.start}-${byteRange.end}`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'max-age=3600'
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers,
          signal,
          cache: 'force-cache'
        });

        if (response.ok || response.status === 206) {
          return response;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if request was deliberately aborted
        if (signal.aborted) {
          throw new AbortError('Request was cancelled');
        }

        // Don't retry on network errors that won't resolve with retries
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new NetworkError('Network connection failed');
        }

        if (attempt < this.config.retryAttempts) {
          // Exponential backoff with jitter
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await this.delay(delay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Read response with progress tracking
   */
  private async readResponseWithProgress(
    response: Response,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<ArrayBuffer> {
    const contentLength = parseInt(response.headers.get('content-length') ?? '0');
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const chunks: Uint8Array[] = [];
    let loaded = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        onProgress?.({
          loaded,
          total: contentLength,
          percentage: contentLength > 0 ? (loaded / contentLength) * 100 : 0
        });
      }
    } finally {
      reader.releaseLock();
    }

    // Combine chunks into single ArrayBuffer
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result.buffer;
  }

  /**
   * Update bitrate estimate based on actual download
   */
  private updateBitrateEstimate(url: string, timeRange: TimeRange, bytes: number): void {
    const duration = timeRange.end - timeRange.start;
    if (duration > 0) {
      const measuredBitrate = (bytes * 8) / duration;
      
      // Weighted average with previous estimate
      const currentEstimate = this.bitrateCache.get(url) ?? measuredBitrate;
      const newEstimate = (currentEstimate * 0.7) + (measuredBitrate * 0.3);
      
      this.bitrateCache.set(url, newEstimate);
    }
  }

  /**
   * Generate unique segment ID
   */
  private generateSegmentId(url: string, timeRange: TimeRange): string {
    const urlHash = this.simpleHash(url);
    return `${urlHash}_${timeRange.start}_${timeRange.end}`;
  }

  /**
   * Simple hash function for URLs
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Simple semaphore for controlling concurrent requests
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    const next = this.waitQueue.shift();
    if (next) {
      this.permits--;
      next();
    }
  }
}