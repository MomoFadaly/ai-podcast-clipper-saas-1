/**
 * YouTube Duration Fetcher
 * Uses multiple methods to reliably get video duration
 */

import { getYouTubeDurationViaProxy } from './youtube-proxy-fetcher';
import { getYouTubeDurationViaAPI, getYouTubeMetadataViaAPI } from './youtube-api-fetcher';

export interface YouTubeVideoInfo {
  duration: number; // Duration in seconds
  title?: string;
  thumbnail?: string;
  author?: string;
  views?: number;
}

export class YouTubeDurationFetcher {
  /**
   * Extract video ID from YouTube URL
   */
  public static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    
    return null;
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  private static parseISO8601Duration(duration: string): number {
    const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Method 1: Try to get duration from noembed.com (no API key needed)
   */
  private static async fetchFromNoembed(videoId: string): Promise<number | null> {
    try {
      const url = `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`;
      const response = await fetch(url);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      // noembed sometimes includes duration in the response
      if (data.duration) {
        return parseInt(data.duration);
      }
      
      return null;
    } catch (error) {
      console.error('Noembed fetch failed:', error);
      return null;
    }
  }

  /**
   * Method 2: Scrape from YouTube page directly
   * This is more reliable but requires server-side execution
   */
  private static async scrapeFromYouTube(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      
      // When running on the server, we need to use absolute URLs
      const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/scrape-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('YouTube scrape failed:', error);
      return null;
    }
  }

  /**
   * Method 3: Use YouTube's public info endpoint (undocumented but works)
   */
  private static async fetchFromYouTubeInfo(videoId: string): Promise<number | null> {
    try {
      // This endpoint is used by YouTube's player
      const url = `https://www.youtube.com/get_video_info?video_id=${videoId}&el=embedded&ps=default&eurl=&gl=US&hl=en`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      const params = new URLSearchParams(text);
      
      // Check if video exists
      const status = params.get('status');
      if (status === 'fail') {
        const reason = params.get('reason') || 'Unknown error';
        throw new Error(`Video unavailable: ${reason}`);
      }
      
      // Try to get duration from the response
      const playerResponse = params.get('player_response');
      if (playerResponse) {
        const data = JSON.parse(playerResponse);
        const duration = data?.videoDetails?.lengthSeconds;
        if (duration) {
          return parseInt(duration);
        }
        
        // Try other locations
        const microformat = data?.microformat?.playerMicroformatRenderer?.lengthSeconds;
        if (microformat) {
          return parseInt(microformat);
        }
      }
      
      return null;
    } catch (error) {
      console.error('YouTube info fetch failed:', error);
      throw error;
    }
  }

  /**
   * Main function to get video duration using multiple methods
   */
  public static async getVideoDuration(url: string): Promise<number> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    const errors: string[] = [];
    
    // Method 1: Try YouTube API if available (most reliable and official)
    if (process.env.YOUTUBE_API_KEY) {
      try {
        const apiDuration = await getYouTubeDurationViaAPI(url);
        if (apiDuration > 0) return apiDuration;
        errors.push('YouTube API: No duration found');
      } catch (error) {
        errors.push(`YouTube API: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Method 2: Try proxy service (reliable but requires subscription)
    try {
      const proxyDuration = await getYouTubeDurationViaProxy(url);
      if (proxyDuration > 0) return proxyDuration;
      errors.push('Proxy service: No duration found');
    } catch (error) {
      errors.push(`Proxy service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Method 2: Try noembed (fast but limited)
    try {
      const noembedDuration = await this.fetchFromNoembed(videoId);
      if (noembedDuration) return noembedDuration;
      errors.push('Noembed: No duration in response');
    } catch (error) {
      errors.push(`Noembed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Method 3: Try our scraping endpoint (may get blocked)
    try {
      const scrapedInfo = await this.scrapeFromYouTube(videoId);
      if (scrapedInfo?.duration && scrapedInfo.duration > 0) return scrapedInfo.duration;
      errors.push('Direct scraping: No duration found in page');
    } catch (error) {
      errors.push(`Direct scraping: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // If all methods fail, throw detailed error
    throw new Error(`Failed to fetch YouTube video duration for ${videoId}. Tried:\n${errors.join('\n')}`);
  }

  /**
   * Get full video information including duration
   */
  public static async getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    // Try to get full info from scraping first
    try {
      const scrapedInfo = await this.scrapeFromYouTube(videoId);
      if (scrapedInfo && scrapedInfo.duration > 0) {
        return scrapedInfo;
      }
    } catch (error) {
      // If scraping fails, we'll try to get just the duration
    }
    
    // Get duration (will throw if it fails)
    const duration = await this.getVideoDuration(url);
    
    return {
      duration,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    };
  }
}

// Export convenience functions
export async function getYouTubeDuration(url: string): Promise<number> {
  return YouTubeDurationFetcher.getVideoDuration(url);
}

/**
 * Get all YouTube metadata in one API call - super fast!
 * Returns full metadata including duration, title, thumbnail, views, etc.
 */
export async function getYouTubeMetadata(url: string) {
  const videoId = YouTubeDurationFetcher.extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL - could not extract video ID');
  }

  // If YouTube API is available, use it - it's the fastest and most reliable
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const metadata = await getYouTubeMetadataViaAPI(url);
      return {
        ...metadata,
        videoId,
        url,
        source: 'youtube',
        contentType: 'video' as const,
      };
    } catch (error) {
      console.error('YouTube API metadata fetch failed:', error);
      // Fall through to other methods
    }
  }

  // Fallback to duration-only fetch if API fails
  const duration = await getYouTubeDuration(url);
  return {
    duration,
    videoId,
    url,
    title: url,
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    source: 'youtube',
    contentType: 'video' as const,
  };
}