/**
 * Simple Video Cache
 * Basic video element caching with LRU eviction
 */

interface CacheEntry {
  element: HTMLVideoElement;
  url: string;
  lastAccessed: number;
}

class VideoCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxEntries = 5; // Keep it simple

  constructor() {
    // Clean up expired entries periodically
    setInterval(() => this.cleanup(), 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Get a cached video element
   */
  get(url: string): HTMLVideoElement | null {
    const entry = this.cache.get(url);
    
    if (!entry) {
      return null;
    }

    // Update access time (LRU)
    entry.lastAccessed = Date.now();
    
    // Move to end to maintain LRU order
    this.cache.delete(url);
    this.cache.set(url, entry);

    return entry.element;
  }

  /**
   * Add video element to cache
   */
  set(url: string, element: HTMLVideoElement): void {
    // Remove existing entry if it exists
    if (this.cache.has(url)) {
      this.remove(url);
    }

    // Make space if needed
    this.makeSpace();

    const entry: CacheEntry = {
      element,
      url,
      lastAccessed: Date.now()
    };

    this.cache.set(url, entry);
  }

  /**
   * Remove an entry from cache
   */
  remove(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry) {
      return false;
    }

    try {
      // Simple cleanup
      entry.element.pause();
      entry.element.src = '';
    } catch {
      // Ignore cleanup errors
    }
    
    return this.cache.delete(url);
  }

  /**
   * Clear all cached videos
   */
  clear(): void {
    for (const [url] of this.cache) {
      this.remove(url);
    }
    this.cache.clear();
  }

  /**
   * Check if a URL is cached
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  private makeSpace(): void {
    // Simple LRU eviction when we hit max
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
  }

  private evictOldest(): void {
    let oldestUrl: string | null = null;
    let oldestTime = Date.now();

    for (const [url, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.remove(oldestUrl);
    }
  }

  private cleanup(): void {
    // Remove entries older than 30 minutes
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    const expiredUrls: string[] = [];

    for (const [url, entry] of this.cache) {
      if (entry.lastAccessed < thirtyMinutesAgo) {
        expiredUrls.push(url);
      }
    }

    expiredUrls.forEach(url => this.remove(url));
  }
}

// Export singleton instance
export const videoCache = new VideoCache();

// Utility functions
export const getCachedVideo = (url: string): HTMLVideoElement | null => {
  return videoCache.get(url);
};

export const cacheVideo = (url: string, element: HTMLVideoElement): void => {
  videoCache.set(url, element);
};

export const removeCachedVideo = (url: string): boolean => {
  return videoCache.remove(url);
};