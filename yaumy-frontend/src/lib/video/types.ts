/**
 * Core types for the MSE-based video player
 */

export interface TimeRange {
  start: number;
  end: number;
}

export interface VideoChunk {
  id: string;
  timeRange: TimeRange;
  duration: number;
  videoUrl: string;
  quality?: string;
}

export interface VideoSegment {
  id: string;
  data: ArrayBuffer;
  timeRange: TimeRange;
  mimeType: string;
  size: number;
  loadedAt: number;
}

export interface LoaderConfig {
  maxConcurrentRequests: number;
  segmentBufferSize: number;
  retryAttempts: number;
  timeoutMs: number;
}

export interface CacheConfig {
  maxMemoryMB: number;
  maxSegments: number;
  ttlMs: number;
}

export interface PlayerConfig {
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  preloadNext?: boolean;
  adaptiveQuality?: boolean;
  bufferAhead?: number;
}

export interface PlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  buffered: TimeRanges;
  error: string | null;
  currentChunk: VideoChunk | null;
  quality: string;
}

export interface LoadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface PerformanceMetrics {
  loadTime: number;
  switchTime: number;
  cacheHitRate: number;
  bandwidthUsage: number;
  errorCount: number;
}

export type PlayerEventType = 
  | 'loadstart'
  | 'loadend'
  | 'progress'
  | 'canplay'
  | 'playing'
  | 'pause'
  | 'ended'
  | 'error'
  | 'chunkchange'
  | 'qualitychange';

export interface PlayerEvent<T = unknown> {
  type: PlayerEventType;
  data?: T;
  timestamp: number;
}

export type PlayerEventHandler<T = unknown> = (event: PlayerEvent<T>) => void;