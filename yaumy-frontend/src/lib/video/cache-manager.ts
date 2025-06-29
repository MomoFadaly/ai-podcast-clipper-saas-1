/**
 * Smart cache management for video segments
 * Optimized for virtual chunking with LRU eviction and intelligent prefetching
 */

import type { VideoSegment, CacheConfig, TimeRange } from './types';

export class CacheManager {
  private config: Required<CacheConfig>;
  private segments = new Map<string, VideoSegment>();
  private accessTimes = new Map<string, number>();
  private totalMemoryUsage = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemoryMB: 100,
      maxSegments: 50,
      ttlMs: 30 * 60 * 1000, // 30 minutes
      ...config
    };
  }

  /**
   * Store segment in cache with intelligent eviction
   */
  set(segment: VideoSegment): void {
    const existingSegment = this.segments.get(segment.id);
    
    // Remove existing segment if present
    if (existingSegment) {
      this.totalMemoryUsage -= existingSegment.size;
    }

    // Add new segment
    this.segments.set(segment.id, segment);
    this.accessTimes.set(segment.id, Date.now());
    this.totalMemoryUsage += segment.size;

    // Evict if necessary
    this.enforceMemoryLimits();
  }

  /**
   * Retrieve segment from cache
   */
  get(segmentId: string): VideoSegment | null {
    const segment = this.segments.get(segmentId);
    
    if (!segment) {
      return null;
    }

    // Check if segment has expired
    if (this.isExpired(segment)) {
      this.delete(segmentId);
      return null;
    }

    // Update access time for LRU
    this.accessTimes.set(segmentId, Date.now());
    return segment;
  }

  /**
   * Check if segment exists and is valid
   */
  has(segmentId: string): boolean {
    const segment = this.segments.get(segmentId);
    return segment ? !this.isExpired(segment) : false;
  }

  /**
   * Remove specific segment from cache
   */
  delete(segmentId: string): boolean {
    const segment = this.segments.get(segmentId);
    
    if (segment) {
      this.segments.delete(segmentId);
      this.accessTimes.delete(segmentId);
      this.totalMemoryUsage -= segment.size;
      return true;
    }
    
    return false;
  }

  /**
   * Find cached segments that overlap with time range
   */
  findOverlapping(timeRange: TimeRange): VideoSegment[] {
    const overlapping: VideoSegment[] = [];
    
    for (const segment of this.segments.values()) {
      if (this.isExpired(segment)) {
        continue;
      }

      if (this.timeRangesOverlap(segment.timeRange, timeRange)) {
        overlapping.push(segment);
      }
    }

    return overlapping.sort((a, b) => a.timeRange.start - b.timeRange.start);
  }

  /**
   * Get segments for specific time ranges (bulk operation)
   */
  getSegments(segmentIds: string[]): Map<string, VideoSegment> {
    const result = new Map<string, VideoSegment>();
    
    for (const id of segmentIds) {
      const segment = this.get(id);
      if (segment) {
        result.set(id, segment);
      }
    }
    
    return result;
  }

  /**
   * Clear expired segments
   */
  cleanup(): number {
    let cleaned = 0;
    
    for (const [id, segment] of this.segments.entries()) {
      if (this.isExpired(segment)) {
        this.delete(id);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Clear all segments
   */
  clear(): void {
    this.segments.clear();
    this.accessTimes.clear();
    this.totalMemoryUsage = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    segmentCount: number;
    memoryUsageMB: number;
    memoryUsagePercent: number;
    oldestSegmentAge: number;
    newestSegmentAge: number;
  } {
    const now = Date.now();
    let oldest = 0;
    let newest = 0;

    if (this.accessTimes.size > 0) {
      const times = Array.from(this.accessTimes.values());
      oldest = now - Math.min(...times);
      newest = now - Math.max(...times);
    }

    return {
      segmentCount: this.segments.size,
      memoryUsageMB: this.totalMemoryUsage / (1024 * 1024),
      memoryUsagePercent: (this.totalMemoryUsage / (this.config.maxMemoryMB * 1024 * 1024)) * 100,
      oldestSegmentAge: oldest,
      newestSegmentAge: newest
    };
  }

  /**
   * Prefetch segments for anticipated access patterns
   */
  async prefetchForPattern(
    pattern: 'sequential' | 'random' | 'reverse',
    currentSegmentId: string,
    availableSegments: string[],
    loader: (segmentId: string) => Promise<VideoSegment>
  ): Promise<void> {
    const currentIndex = availableSegments.indexOf(currentSegmentId);
    if (currentIndex === -1) return;

    let segmentsToPrefetch: string[] = [];

    switch (pattern) {
      case 'sequential':
        // Prefetch next 2-3 segments
        segmentsToPrefetch = availableSegments.slice(currentIndex + 1, currentIndex + 4);
        break;
        
      case 'reverse':
        // Prefetch previous 2-3 segments
        segmentsToPrefetch = availableSegments.slice(Math.max(0, currentIndex - 3), currentIndex);
        break;
        
      case 'random':
        // Prefetch segments around current position
        const start = Math.max(0, currentIndex - 1);
        const end = Math.min(availableSegments.length, currentIndex + 2);
        segmentsToPrefetch = availableSegments.slice(start, end);
        break;
    }

    // Filter out already cached segments
    const uncachedSegments = segmentsToPrefetch.filter(id => !this.has(id));

    // Load segments in background
    const prefetchPromises = uncachedSegments.map(async (segmentId) => {
      try {
        const segment = await loader(segmentId);
        this.set(segment);
      } catch (error) {
        console.warn(`Failed to prefetch segment ${segmentId}:`, error);
      }
    });

    // Don't await - let prefetching happen in background
    Promise.all(prefetchPromises).catch(() => {
      // Silent fail for prefetching
    });
  }

  /**
   * Enforce memory and count limits with LRU eviction
   */
  private enforceMemoryLimits(): void {
    const maxMemoryBytes = this.config.maxMemoryMB * 1024 * 1024;
    
    // Check memory limit
    while (this.totalMemoryUsage > maxMemoryBytes || this.segments.size > this.config.maxSegments) {
      const lruSegmentId = this.getLRUSegment();
      if (!lruSegmentId) break;
      
      this.delete(lruSegmentId);
    }
  }

  /**
   * Get least recently used segment ID
   */
  private getLRUSegment(): string | null {
    let lruId: string | null = null;
    let oldestTime = Date.now();

    for (const [id, accessTime] of this.accessTimes.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        lruId = id;
      }
    }

    return lruId;
  }

  /**
   * Check if segment has expired
   */
  private isExpired(segment: VideoSegment): boolean {
    return Date.now() - segment.loadedAt > this.config.ttlMs;
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
    return range1.start < range2.end && range2.start < range1.end;
  }
}