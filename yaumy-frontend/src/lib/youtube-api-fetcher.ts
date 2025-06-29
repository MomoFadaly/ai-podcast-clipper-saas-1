/**
 * YouTube Duration Fetcher using YouTube Data API v3
 * This is the most reliable method but requires an API key
 */

interface YouTubeAPIResponse {
  items: Array<{
    contentDetails: {
      duration: string; // ISO 8601 duration like "PT4M13S"
    };
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      channelId: string;
      publishedAt: string;
      thumbnails: {
        maxres?: { url: string; width: number; height: number };
        high?: { url: string; width: number; height: number };
        medium?: { url: string; width: number; height: number };
        default?: { url: string; width: number; height: number };
      };
      tags?: string[];
      categoryId: string;
    };
    statistics?: {
      viewCount: string;
      likeCount: string;
      commentCount: string;
    };
  }>;
}

export class YouTubeAPIFetcher {
  private static get apiKey(): string | undefined {
    return process.env.YOUTUBE_API_KEY;
  }

  /**
   * Extract video ID from YouTube URL
   */
  private static extractVideoId(url: string): string | null {
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
   * Fetch video details from YouTube Data API v3
   */
  public static async getVideoDuration(url: string): Promise<number> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet,statistics&key=${this.apiKey}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
      }

      const data: YouTubeAPIResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = data.items[0];
      if (!video) {
        throw new Error('Video not found in response');
      }
      const duration = this.parseISO8601Duration(video.contentDetails.duration);

      if (duration === 0) {
        throw new Error('Video duration is 0 - might be a live stream or premiere');
      }

      return duration;
    } catch (error) {
      throw new Error(`YouTube API fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get full video information with all metadata in one API call
   */
  public static async getVideoInfo(url: string): Promise<{
    duration: number;
    title: string;
    description: string;
    author: string;
    channelId: string;
    thumbnail: string;
    thumbnailHigh?: string;
    thumbnailMedium?: string;
    publishedAt: string;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    tags?: string[];
    categoryId: string;
  }> {
    if (!this.apiKey) {
      throw new Error('YouTube API key not configured. Please set YOUTUBE_API_KEY environment variable.');
    }

    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL - could not extract video ID');
    }

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails,snippet,statistics&key=${this.apiKey}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error?.message || response.statusText}`);
      }

      const data: YouTubeAPIResponse = await response.json();

      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = data.items[0];
      if (!video) {
        throw new Error('Video not found in response');
      }
      const duration = this.parseISO8601Duration(video.contentDetails.duration);

      return {
        duration,
        title: video.snippet.title,
        description: video.snippet.description,
        author: video.snippet.channelTitle,
        channelId: video.snippet.channelId,
        thumbnail: video.snippet.thumbnails.maxres?.url || 
                   video.snippet.thumbnails.high?.url || 
                   video.snippet.thumbnails.medium?.url ||
                   `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        thumbnailHigh: video.snippet.thumbnails.high?.url,
        thumbnailMedium: video.snippet.thumbnails.medium?.url,
        publishedAt: video.snippet.publishedAt,
        viewCount: video.statistics ? parseInt(video.statistics.viewCount) : undefined,
        likeCount: video.statistics ? parseInt(video.statistics.likeCount) : undefined,
        commentCount: video.statistics ? parseInt(video.statistics.commentCount) : undefined,
        tags: video.snippet.tags,
        categoryId: video.snippet.categoryId,
      };
    } catch (error) {
      throw new Error(`YouTube API fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export convenience functions
export async function getYouTubeDurationViaAPI(url: string): Promise<number> {
  return YouTubeAPIFetcher.getVideoDuration(url);
}

export async function getYouTubeMetadataViaAPI(url: string) {
  return YouTubeAPIFetcher.getVideoInfo(url);
}