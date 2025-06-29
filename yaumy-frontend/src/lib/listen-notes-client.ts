import { env } from "~/env.js";

// Listen Notes API types
export interface PodcastSearchOptions {
  q: string;
  type?: 'episode' | 'podcast' | 'curated';
  offset?: number;
  len_min?: number;
  len_max?: number;
  genre_ids?: string;
  published_before?: number;
  published_after?: number;
  only_in?: 'title' | 'description' | 'author' | 'audio';
  language?: string;
  safe_mode?: 0 | 1;
  unique_podcasts?: 0 | 1;
  page_size?: number;
  sort_by_date?: 0 | 1;
}

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  pub_date_ms: number;
  audio: string;
  audio_length_sec: number;
  image: string;
  thumbnail: string;
  podcast: {
    id: string;
    title: string;
    publisher: string;
    image: string;
    thumbnail: string;
    listen_score: number;
    genre_ids: number[];
  };
  transcript?: string;
  maybe_audio_invalid?: boolean;
  listennotes_url: string;
  explicit_content: boolean;
}

export interface Podcast {
  id: string;
  title: string;
  description: string;
  publisher: string;
  image: string;
  thumbnail: string;
  listen_score: number;
  listen_score_global_rank: string;
  genre_ids: number[];
  total_episodes: number;
  website?: string;
  rss?: string;
  explicit_content: boolean;
  language: string;
  country: string;
  listennotes_url: string;
}

export interface SearchResponse {
  results: PodcastEpisode[];
  count: number;
  total: number;
  next_offset: number;
}

export interface BestPodcastsResponse {
  podcasts: Podcast[];
  page_number: number;
  has_next: boolean;
  has_previous: boolean;
  next_page_number: number;
  previous_page_number: number;
}

export interface CuratedList {
  id: string;
  title: string;
  description: string;
  source_url: string;
  source_domain: string;
  pub_date_ms: number;
  podcasts: Podcast[];
}

export interface CuratedListsResponse {
  curated_lists: CuratedList[];
}

export interface GenreResponse {
  genres: Array<{
    id: number;
    name: string;
    parent_id: number;
  }>;
}

export class ListenNotesClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://listen-api.listennotes.com/api/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'X-ListenAPI-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Listen Notes API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Search podcasts and episodes
  async search(options: PodcastSearchOptions): Promise<SearchResponse> {
    return this.makeRequest<SearchResponse>('/search', options);
  }

  // Get episode details by ID
  async getEpisode(id: string): Promise<PodcastEpisode> {
    return this.makeRequest<PodcastEpisode>(`/episodes/${id}`);
  }

  // Get podcast details by ID
  async getPodcast(id: string): Promise<Podcast> {
    return this.makeRequest<Podcast>(`/podcasts/${id}`);
  }

  // Get best podcasts (curated recommendations)
  async getBestPodcasts(genre_id?: number, page?: number): Promise<BestPodcastsResponse> {
    const params: Record<string, any> = {};
    if (genre_id) params.genre_id = genre_id;
    if (page) params.page = page;
    
    return this.makeRequest<BestPodcastsResponse>('/best_podcasts', params);
  }

  // Get trending/hot podcasts
  async getTrendingPodcasts(): Promise<{ podcasts: Podcast[] }> {
    // Note: This might be a premium feature, using best_podcasts as fallback
    return this.makeRequest<{ podcasts: Podcast[] }>('/best_podcasts');
  }

  // Get curated podcast lists
  async getCuratedLists(page?: number): Promise<CuratedListsResponse> {
    const params: Record<string, any> = {};
    if (page) params.page = page;
    
    return this.makeRequest<CuratedListsResponse>('/curated_podcasts', params);
  }

  // Get similar podcasts
  async getSimilarPodcasts(id: string): Promise<{ podcasts: Podcast[] }> {
    return this.makeRequest<{ podcasts: Podcast[] }>(`/podcasts/${id}/recommendations`);
  }

  // Get available genres
  async getGenres(): Promise<GenreResponse> {
    return this.makeRequest<GenreResponse>('/genres');
  }

  // Search with transcript focus
  async searchTranscripts(query: string, options?: Omit<PodcastSearchOptions, 'only_in'>): Promise<SearchResponse> {
    return this.search({
      ...options,
      q: query,
      only_in: 'audio', // This searches in transcripts/audio content
    });
  }

  // Get typeahead suggestions
  async getTypeahead(q: string, show_podcasts?: boolean, show_genres?: boolean): Promise<{
    terms: string[];
    podcasts?: Podcast[];
    genres?: Array<{ id: number; name: string; parent_id: number }>;
  }> {
    const params: Record<string, any> = { q };
    if (show_podcasts !== undefined) params.show_podcasts = show_podcasts ? 1 : 0;
    if (show_genres !== undefined) params.show_genres = show_genres ? 1 : 0;
    
    return this.makeRequest('/typeahead', params);
  }
}

// Singleton instance
let listenNotesClient: ListenNotesClient | null = null;

export function getListenNotesClient(): ListenNotesClient {
  if (!listenNotesClient) {
    const apiKey = env.LISTEN_NOTES_API_KEY;
    if (!apiKey) {
      throw new Error('LISTEN_NOTES_API_KEY environment variable is not set. Please add your Listen Notes API key to .env.local');
    }
    listenNotesClient = new ListenNotesClient(apiKey);
  }
  return listenNotesClient;
}

// Helper function to format duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Helper function to format publish date
export function formatPublishDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Helper to extract genre names from IDs (you'll need to fetch genres first)
export function getGenreNames(genreIds: number[], allGenres: Array<{ id: number; name: string }>): string[] {
  return genreIds
    .map(id => allGenres.find(genre => genre.id === id)?.name)
    .filter(Boolean) as string[];
}