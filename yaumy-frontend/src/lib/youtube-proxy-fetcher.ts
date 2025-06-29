/**
 * YouTube Duration Fetcher using Proxy Services
 * This handles YouTube scraping through proxy services to avoid blocks
 */

export interface ProxyConfig {
  provider: 'brightdata' | 'scrapingbee' | 'scraperapi';
  apiKey: string;
  endpoint?: string;
}

export class YouTubeProxyFetcher {
  private static getProxyConfig(): ProxyConfig | null {
    // Check environment variables for proxy service configuration
    if (process.env.BRIGHTDATA_API_KEY) {
      return {
        provider: 'brightdata',
        apiKey: process.env.BRIGHTDATA_API_KEY,
        endpoint: process.env.BRIGHTDATA_ENDPOINT || 'https://api.brightdata.com/dca/trigger',
      };
    } else if (process.env.SCRAPINGBEE_API_KEY) {
      return {
        provider: 'scrapingbee',
        apiKey: process.env.SCRAPINGBEE_API_KEY,
      };
    } else if (process.env.SCRAPERAPI_API_KEY) {
      return {
        provider: 'scraperapi',
        apiKey: process.env.SCRAPERAPI_API_KEY,
      };
    }
    
    // Return null instead of throwing to allow fallback to other methods
    return null;
  }

  /**
   * Fetch YouTube page through Bright Data
   */
  private static async fetchWithBrightData(url: string, apiKey: string, endpoint: string): Promise<string> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        country: 'us',
        format: 'html',
      }),
    });

    if (!response.ok) {
      throw new Error(`Bright Data API error: ${response.status}`);
    }

    const data = await response.json();
    return data.html || data.content;
  }

  /**
   * Fetch YouTube page through ScrapingBee
   */
  private static async fetchWithScrapingBee(url: string, apiKey: string): Promise<string> {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'us',
    });

    const response = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`);

    if (!response.ok) {
      throw new Error(`ScrapingBee API error: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Fetch YouTube page through ScraperAPI
   */
  private static async fetchWithScraperAPI(url: string, apiKey: string): Promise<string> {
    const params = new URLSearchParams({
      api_key: apiKey,
      url: url,
      render: 'true',
      country_code: 'us',
    });

    const response = await fetch(`https://api.scraperapi.com/?${params}`);

    if (!response.ok) {
      throw new Error(`ScraperAPI error: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Extract duration from YouTube page HTML
   */
  private static extractDuration(html: string): number {
    // Method 1: Try to find duration in JSON-LD
    const jsonLdMatch = /<script type="application\/ld\+json">(.*?)<\/script>/s.exec(html);
    if (jsonLdMatch?.[1]) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.duration) {
          const match = jsonLd.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
          }
        }
      } catch (e) {
        // Continue to next method
      }
    }

    // Method 2: Try ytInitialData
    const patterns = [
      /var ytInitialData = ({.*?});/s,
      /window\["ytInitialData"\] = ({.*?});/s,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        try {
          const data = JSON.parse(match[1]);
          
          // Look for duration in various places
          const videoDetails = data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer;
          if (videoDetails?.lengthText?.simpleText) {
            return this.parseTimeString(videoDetails.lengthText.simpleText);
          }
          
          // Try player microformat
          const microformat = data?.playerConfig?.playerResponse?.microformat?.playerMicroformatRenderer;
          if (microformat?.lengthSeconds) {
            return parseInt(microformat.lengthSeconds);
          }
        } catch (e) {
          // Continue to next method
        }
      }
    }

    // Method 3: Direct regex patterns
    const durationPatterns = [
      /"lengthSeconds":"(\d+)"/,
      /"lengthSeconds":\s*"(\d+)"/,
      /lengthSeconds":"(\d+)"/,
      /"duration":\s*"PT([^"]+)"/,
      /\"approxDurationMs\":\"(\d+)\"/,
    ];
    
    for (const pattern of durationPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        if (pattern.source.includes('PT')) {
          // ISO 8601 format
          const durationMatch = /(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(match[1]);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1] || '0');
            const minutes = parseInt(durationMatch[2] || '0');
            const seconds = parseInt(durationMatch[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
          }
        } else if (pattern.source.includes('Ms')) {
          // Milliseconds
          return Math.floor(parseInt(match[1] || '0') / 1000);
        } else {
          // Seconds
          return parseInt(match[1] || '0');
        }
      }
    }

    // Method 4: Look for meta tags
    const metaMatch = /<meta\s+itemprop="duration"\s+content="([^"]+)"/.exec(html);
    if (metaMatch?.[1]) {
      const duration = metaMatch[1];
      if (duration.startsWith('PT')) {
        const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(duration);
        if (match) {
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          return hours * 3600 + minutes * 60 + seconds;
        }
      }
    }

    throw new Error('Could not extract duration from YouTube page');
  }

  /**
   * Parse time string like "5:23" or "1:45:23" to seconds
   */
  private static parseTimeString(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p));
    
    if (parts.length === 3) {
      return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
    } else if (parts.length === 2) {
      return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
    } else if (parts.length === 1) {
      return parts[0] ?? 0;
    }
    
    return 0;
  }

  /**
   * Main function to get YouTube video duration
   */
  public static async getVideoDuration(url: string): Promise<number> {
    const config = this.getProxyConfig();
    
    if (!config) {
      throw new Error('No proxy service configured');
    }
    
    let html: string;

    try {
      switch (config.provider) {
        case 'brightdata':
          html = await this.fetchWithBrightData(url, config.apiKey, config.endpoint!);
          break;
        case 'scrapingbee':
          html = await this.fetchWithScrapingBee(url, config.apiKey);
          break;
        case 'scraperapi':
          html = await this.fetchWithScraperAPI(url, config.apiKey);
          break;
        default:
          throw new Error(`Unknown proxy provider: ${config.provider as string}`);
      }

      const duration = this.extractDuration(html);
      if (duration > 0) {
        return duration;
      }
      
      throw new Error('Duration was 0 or invalid');
    } catch (error) {
      throw new Error(`Failed to get YouTube duration via ${config.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export convenience function
export async function getYouTubeDurationViaProxy(url: string): Promise<number> {
  return YouTubeProxyFetcher.getVideoDuration(url);
}