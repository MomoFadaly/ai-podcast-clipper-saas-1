// Project and Track types for the explore page

export interface ProjectSearchOptions {
  q?: string;
  type?: 'project' | 'track';
  category?: string;
  page_size?: number;
  sort_by?: 'created_at' | 'popularity' | 'duration';
  source_type?: 'file' | 'youtube' | 'podcast';
}

export interface PublicProject {
  id: string;
  displayName: string;
  thumbnailUrl: string | null;
  duration: number | null;
  createdAt: Date;
  sourceType: string;
  contentType: string | null;
  
  // Owner information
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  
  // Podcast-specific fields (if applicable)
  podcastTitle?: string | null;
  podcastPublisher?: string | null;
  episodeTitle?: string | null;
  episodeDescription?: string | null;
  podcastImageUrl?: string | null;
  podcastGenres?: string[];
  publishedAt?: Date | null;
  listenScore?: number | null;
  
  // Share information
  shareInfo: {
    shareToken: string;
    permissions: 'VIEW' | 'COPY' | 'COLLABORATE';
  };
}

export interface PublicTrack {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  
  // Owner information
  owner: {
    id: string;
    name: string | null;
    image: string | null;
  };
  
  // Project count in this track
  projectCount: number;
  
  // Share information
  shareInfo: {
    shareToken: string;
    permissions: 'VIEW' | 'COPY' | 'COLLABORATE';
  };
}

export interface SearchResults<T> {
  results: T[];
  total: number;
  hasMore: boolean;
}

export interface TrendingData {
  projects: PublicProject[];
  tracks: PublicTrack[];
}