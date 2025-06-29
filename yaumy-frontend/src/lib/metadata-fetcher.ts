import { parse } from 'node-html-parser';
import { getYouTubeMetadata } from './youtube-duration-fetcher';

export interface LinkMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
  duration?: number; // Duration in seconds
  author?: string;
  publishedDate?: string;
  type?: 'video' | 'article' | 'audio' | 'image';
}

export class MetadataFetcher {
  // YouTube API endpoint - uses YouTube Data API v3 for comprehensive metadata
  private static async fetchYouTubeMetadata(url: string): Promise<LinkMetadata | null> {
    try {
      // Use our enhanced YouTube metadata fetcher that gets everything in one API call
      const youtubeData = await getYouTubeMetadata(url);
      
      return {
        title: youtubeData.title,
        description: 'description' in youtubeData ? youtubeData.description : undefined,
        image: youtubeData.thumbnail,
        siteName: 'YouTube',
        author: 'author' in youtubeData ? youtubeData.author : undefined,
        type: 'video',
        duration: youtubeData.duration,
        publishedDate: 'publishedAt' in youtubeData ? youtubeData.publishedAt : undefined,
      };
    } catch (error) {
      console.error('YouTube metadata fetch failed:', error);
      return null;
    }
  }

  // Twitter/X oEmbed endpoint
  private static async fetchTwitterMetadata(url: string): Promise<LinkMetadata | null> {
    try {
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        title: data.author_name,
        description: data.html?.replace(/<[^>]*>/g, '').substring(0, 200),
        siteName: 'Twitter',
        author: data.author_name,
        type: 'article',
      };
    } catch (error) {
      console.error('Twitter metadata fetch failed:', error);
      return null;
    }
  }

  // Generic Open Graph scraper
  private static async fetchOpenGraphMetadata(url: string): Promise<LinkMetadata | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YaumyBot/1.0; +https://yau.my)',
        },
      });
      
      if (!response.ok) return null;
      
      const html = await response.text();
      const root = parse(html);
      
      // Extract Open Graph tags
      const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute('content');
      const ogDescription = root.querySelector('meta[property="og:description"]')?.getAttribute('content');
      const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute('content');
      const ogSiteName = root.querySelector('meta[property="og:site_name"]')?.getAttribute('content');
      const ogType = root.querySelector('meta[property="og:type"]')?.getAttribute('content');
      
      // Fallback to regular meta tags
      const title = ogTitle || 
                    root.querySelector('meta[name="title"]')?.getAttribute('content') ||
                    root.querySelector('title')?.text;
      
      const description = ogDescription || 
                         root.querySelector('meta[name="description"]')?.getAttribute('content');
      
      // Get favicon
      const favicon = root.querySelector('link[rel="icon"]')?.getAttribute('href') ||
                     root.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');
      
      // Resolve relative URLs
      const baseUrl = new URL(url);
      const resolveUrl = (path?: string) => {
        if (!path) return undefined;
        if (path.startsWith('http')) return path;
        if (path.startsWith('//')) return `${baseUrl.protocol}${path}`;
        if (path.startsWith('/')) return `${baseUrl.origin}${path}`;
        return `${baseUrl.origin}/${path}`;
      };
      
      return {
        title,
        description,
        image: resolveUrl(ogImage),
        siteName: ogSiteName || baseUrl.hostname,
        favicon: resolveUrl(favicon),
        type: ogType?.includes('video') ? 'video' : 
              ogType?.includes('audio') ? 'audio' : 'article',
      };
    } catch (error) {
      console.error('Open Graph metadata fetch failed:', error);
      return null;
    }
  }

  // Main function to fetch metadata
  public static async fetchMetadata(url: string): Promise<LinkMetadata> {
    try {
      const urlObj = new URL(url);
      
      // Try specialized fetchers first
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        const metadata = await this.fetchYouTubeMetadata(url);
        if (metadata) return metadata;
      }
      
      if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        const metadata = await this.fetchTwitterMetadata(url);
        if (metadata) return metadata;
      }
      
      // Fall back to Open Graph scraper
      const metadata = await this.fetchOpenGraphMetadata(url);
      if (metadata) return metadata;
      
      // Return minimal metadata if all else fails
      return {
        title: urlObj.hostname,
        siteName: urlObj.hostname,
        type: 'article',
      };
    } catch (error) {
      console.error('Metadata fetch failed:', error);
      return {
        title: url,
        type: 'article',
      };
    }
  }
}

// Helper function for server actions
export async function enrichLinkWithMetadata(url: string): Promise<{
  metadata: LinkMetadata;
  fileInfo: any;
}> {
  const metadata = await MetadataFetcher.fetchMetadata(url);
  
  // Convert to fileInfo format used by the database
  const fileInfo = {
    title: metadata.title,
    description: metadata.description,
    thumbnail: metadata.image,
    siteName: metadata.siteName,
    favicon: metadata.favicon,
    author: metadata.author,
    publishedDate: metadata.publishedDate,
    contentType: metadata.type,
    duration: metadata.duration, // Duration in seconds
  };
  
  return { metadata, fileInfo };
}