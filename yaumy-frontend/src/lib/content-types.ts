/**
 * Content Type Registry
 * 
 * Defines the characteristics and capabilities of different content types
 * supported by the Chunkwise platform.
 */

import { Video, Headphones, FileText, File } from 'lucide-react';
import type { ContentType, ContentTypeDefinition } from '~/components/panels/types';

// Content type constants
export const ContentTypes = {
  VIDEO: 'video' as ContentType,
  AUDIO: 'audio' as ContentType,
  TEXT: 'text' as ContentType,
  PDF: 'pdf' as ContentType,
} as const;

// Extended content type definition
interface ExtendedContentTypeDefinition extends ContentTypeDefinition {
  name: string;
  corePanels: string[];
  availablePanels: string[];
  defaultLayout: string;
  features: {
    hasTimeline: boolean;
    hasChapters: boolean;
    hasAnnotations: boolean;
    hasSearch: boolean;
    hasTranscript?: boolean;
  };
}

/**
 * Content type registry with comprehensive definitions
 */
export const CONTENT_TYPE_REGISTRY: Record<string, ExtendedContentTypeDefinition> = {
  video: {
    id: ContentTypes.VIDEO,
    label: 'Video',
    name: 'Video',
    icon: Video,
    corePanels: ['media-player'],
    availablePanels: ['media-player', 'transcript', 'notes', 'timeline', 'navigation', 'progress'],
    defaultLayout: 'video-focus',
    features: {
      hasTimeline: true,
      hasChapters: true,
      hasAnnotations: true,
      hasSearch: true,
      hasTranscript: true,
    },
  },

  audio: {
    id: ContentTypes.AUDIO,
    label: 'Audio',
    name: 'Audio',
    icon: Headphones,
    corePanels: ['media-player'],
    availablePanels: ['media-player', 'transcript', 'notes', 'timeline', 'navigation', 'progress'],
    defaultLayout: 'audio-study',
    features: {
      hasTimeline: true,
      hasChapters: true,
      hasAnnotations: true,
      hasSearch: true,
      hasTranscript: true,
    },
  },

  text: {
    id: ContentTypes.TEXT,
    label: 'Text',
    name: 'Text',
    icon: FileText,
    corePanels: ['text-reader'],
    availablePanels: ['text-reader', 'notes', 'navigation', 'progress'],
    defaultLayout: 'reading-mode',
    features: {
      hasTimeline: false,
      hasChapters: true,
      hasAnnotations: true,
      hasSearch: true,
      hasTranscript: false,
    },
  },

  pdf: {
    id: ContentTypes.PDF,
    label: 'PDF',
    name: 'PDF',
    icon: File,
    corePanels: ['pdf-viewer'],
    availablePanels: ['pdf-viewer', 'notes', 'navigation', 'progress'],
    defaultLayout: 'document-mode',
    features: {
      hasTimeline: false,
      hasChapters: true,
      hasAnnotations: true,
      hasSearch: true,
      hasTranscript: false,
    },
  },
};

/**
 * Utility functions for content type operations
 */

/**
 * Get content type definition by ID
 */
export function getContentTypeDefinition(contentType: ContentType): ExtendedContentTypeDefinition {
  const definition = CONTENT_TYPE_REGISTRY[contentType];
  if (!definition) {
    throw new Error(`Unknown content type: ${contentType}`);
  }
  return definition;
}

/**
 * Detect content type from file extension or MIME type
 */
export function detectContentType(
  filename: string, 
  mimeType?: string
): ContentType {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Video extensions
  const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'm4v'];
  if (videoExtensions.includes(extension) || mimeType?.startsWith('video/')) {
    return ContentTypes.VIDEO;
  }
  
  // Audio extensions
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'];
  if (audioExtensions.includes(extension) || mimeType?.startsWith('audio/')) {
    return ContentTypes.AUDIO;
  }
  
  // PDF
  if (extension === 'pdf' || mimeType === 'application/pdf') {
    return ContentTypes.PDF;
  }
  
  // Text extensions
  const textExtensions = ['txt', 'md', 'markdown', 'doc', 'docx', 'rtf'];
  if (textExtensions.includes(extension) || mimeType?.startsWith('text/')) {
    return ContentTypes.TEXT;
  }
  
  // Default fallback based on MIME type
  if (mimeType) {
    if (mimeType.startsWith('video/')) return ContentTypes.VIDEO;
    if (mimeType.startsWith('audio/')) return ContentTypes.AUDIO;
    if (mimeType.startsWith('text/') || mimeType.includes('document')) return ContentTypes.TEXT;
  }
  
  // Ultimate fallback - assume video for unknown types
  return ContentTypes.VIDEO;
}

/**
 * Check if a content type supports a specific feature
 */
export function contentTypeSupportsFeature(
  contentType: ContentType, 
  feature: keyof ExtendedContentTypeDefinition['features']
): boolean {
  return getContentTypeDefinition(contentType).features[feature] ?? false;
}

/**
 * Get all content types that support a specific feature
 */
export function getContentTypesByFeature(
  feature: keyof ExtendedContentTypeDefinition['features']
): ContentType[] {
  return Object.values(CONTENT_TYPE_REGISTRY)
    .filter(def => def.features[feature])
    .map(def => def.id);
}

/**
 * Get core panels for a content type
 */
export function getCorePanels(contentType: ContentType): string[] {
  return getContentTypeDefinition(contentType).corePanels;
}

/**
 * Get all available panels for a content type
 */
export function getAvailablePanels(contentType: ContentType): string[] {
  return getContentTypeDefinition(contentType).availablePanels;
}

/**
 * Get optional panels (non-core) for a content type
 */
export function getOptionalPanels(contentType: ContentType): string[] {
  const definition = getContentTypeDefinition(contentType);
  const coreSet = new Set(definition.corePanels);
  return definition.availablePanels.filter(panelId => !coreSet.has(panelId));
}

/**
 * Get default layout for a content type
 */
export function getDefaultLayout(contentType: ContentType): string {
  return getContentTypeDefinition(contentType).defaultLayout || 'default';
}

/**
 * Validate if a panel is supported by a content type
 */
export function isPanelSupportedByContentType(
  panelId: string, 
  contentType: ContentType
): boolean {
  return getAvailablePanels(contentType).includes(panelId);
}

/**
 * Get content type capabilities summary
 */
export function getContentTypeCapabilities(contentType: ContentType) {
  const definition = getContentTypeDefinition(contentType);
  return {
    name: definition.name,
    icon: definition.icon,
    corePanelCount: definition.corePanels.length,
    totalPanelCount: definition.availablePanels.length,
    features: definition.features,
    hasAdvancedFeatures: Object.values(definition.features).some(Boolean),
  };
}

/**
 * Re-export types for external use
 */
export type { ContentType, ContentTypeDefinition, ExtendedContentTypeDefinition };