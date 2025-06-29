export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
  publishedAt?: Date;
  url: string;
}

export interface PodcastMetadata {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
  publishedAt?: Date;
  url: string;
  episodeNumber?: number;
  showName?: string;
}

export type Metadata = VideoMetadata | PodcastMetadata;

export interface TrackMetadata extends VideoMetadata {
  trackId?: string;
  segments?: any[];
}

export interface ConversationMetadata {
  id: string;
  title: string;
  participants?: string[];
  createdAt?: Date;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'podcast' | 'track';
  metadata?: Metadata;
}