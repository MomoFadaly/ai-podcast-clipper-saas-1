/**
 * Chunk URL Cache
 * Caches clip URLs to avoid repeated API calls for the same chunks
 */

interface CachedUrl {
  url: string;
  timestamp: number;
  ttl: number;
}

class ChunkUrlCache {
  private static instance: ChunkUrlCache;
  private cache = new Map<string, CachedUrl>();
  private readonly defaultTtl = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    // Clean expired entries every 5 minutes
    setInterval(() => this.cleanExpired(), 5 * 60 * 1000);
  }

  static getInstance(): ChunkUrlCache {
    if (!ChunkUrlCache.instance) {
      ChunkUrlCache.instance = new ChunkUrlCache();
    }
    return ChunkUrlCache.instance;
  }

  /**
   * Get URL from cache if valid, otherwise return null
   */
  get(clipId: string): string | null {
    const cached = this.cache.get(clipId);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(clipId);
      return null;
    }

    return cached.url;
  }

  /**
   * Store URL in cache
   */
  set(clipId: string, url: string, ttl = this.defaultTtl): void {
    this.cache.set(clipId, {
      url,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Remove URL from cache
   */
  remove(clipId: string): void {
    this.cache.delete(clipId);
  }

  /**
   * Clear all cached URLs
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [clipId, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(clipId);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const cached of this.cache.values()) {
      if (now - cached.timestamp > cached.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries
    };
  }
}

// Export singleton instance
export const chunkUrlCache = ChunkUrlCache.getInstance();

/**
 * Fetch chunk URL with caching
 */
export async function fetchChunkUrl(clipId: string): Promise<string | null> {
  // Check cache first
  const cachedUrl = chunkUrlCache.get(clipId);
  if (cachedUrl) {
    return cachedUrl;
  }

  try {
    const response = await fetch(`/api/clips/${clipId}`);
    if (!response.ok) {
      console.warn(`Failed to fetch URL for chunk ${clipId}: ${response.status}`);
      return null;
    }

    const data = await response.json() as { videoUrl?: string };
    if (!data.videoUrl) {
      console.warn(`No videoUrl in response for chunk ${clipId}`);
      return null;
    }

    // Cache the URL
    chunkUrlCache.set(clipId, data.videoUrl);
    return data.videoUrl;

  } catch (error) {
    console.error(`Error fetching URL for chunk ${clipId}:`, error);
    return null;
  }
}

/**
 * Batch fetch multiple chunk URLs
 */
export async function fetchChunkUrls(clipIds: string[]): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const uncachedIds: string[] = [];

  // Check cache for each clipId
  for (const clipId of clipIds) {
    const cachedUrl = chunkUrlCache.get(clipId);
    if (cachedUrl) {
      urlMap.set(clipId, cachedUrl);
    } else {
      uncachedIds.push(clipId);
    }
  }

  // Fetch uncached URLs in parallel
  if (uncachedIds.length > 0) {
    const fetchPromises = uncachedIds.map(async (clipId) => {
      const url = await fetchChunkUrl(clipId);
      return { clipId, url };
    });

    const results = await Promise.allSettled(fetchPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.url) {
        urlMap.set(result.value.clipId, result.value.url);
      }
    }
  }

  return urlMap;
}