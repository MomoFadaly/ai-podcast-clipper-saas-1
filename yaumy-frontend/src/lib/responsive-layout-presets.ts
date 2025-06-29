/**
 * Responsive Layout Presets
 * 
 * Device-aware layout presets that automatically adapt based on screen size,
 * device capabilities, and user interaction patterns.
 */

import type { DeviceBreakpoint } from './device-detection';
import { ContentType } from '~/components/panels/types';
import type { DockZone } from '~/types/adobe-layout';

/**
 * Device-specific layout configuration
 */
export interface DeviceLayoutConfig {
  zoneConfig: DockZone;
  panelConfig: Record<string, any>;
  visiblePanels: string[];
  panelGroups: Record<string, {
    panels: string[];
    activePanel: string;
  }>;
  adaptiveRules?: {
    hideOnSmallScreen?: string[];
    collapseToTabs?: string[];
    minimumSizes?: Record<string, { width: number; height: number }>;
  };
}

/**
 * Responsive layout preset with device-specific configurations
 */
export interface ResponsiveLayoutPreset {
  id: string;
  name: string;
  description: string;
  supportedContentTypes: ContentType[];
  category: 'focus' | 'learning' | 'analysis' | 'creation';
  
  // Device-specific configurations
  mobile?: DeviceLayoutConfig;
  tablet?: DeviceLayoutConfig;
  desktop: DeviceLayoutConfig; // Required baseline
  large?: DeviceLayoutConfig;
  ultrawide?: DeviceLayoutConfig;
  
  // Adaptive behavior
  adaptiveBehavior: {
    autoHideUnusedPanels: boolean;
    preferTabsOnMobile: boolean;
    maintainAspectRatio: boolean;
    gracefulDegradation: boolean;
  };
  
  metadata: {
    useCase: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    isDefault?: boolean;
  };
}

/**
 * Device-aware video learning presets
 */
export const VIDEO_RESPONSIVE_PRESETS: ResponsiveLayoutPreset[] = [
  {
    id: 'video-focus-responsive',
    name: 'Video Focus (Responsive)',
    description: 'Immersive video viewing optimized for each device',
    supportedContentTypes: ['video'],
    category: 'focus',
    
    // Mobile: Single video with minimal UI
    mobile: {
      zoneConfig: {
        id: 'video-focus-mobile-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 100,
          },
        ],
      },
      panelConfig: {
        'media-player': { fullWidth: true, aspectRatio: '16:9' },
      },
      visiblePanels: ['media-player'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
      },
    },
    
    // Tablet: Video with collapsible notes
    tablet: {
      zoneConfig: {
        id: 'video-focus-tablet-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 70,
          },
          {
            type: 'panel-group',
            id: 'notes-bottom',
            tabs: ['notes'],
            activeTabId: 'notes',
            size: 30,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
        'notes': { collapsible: true },
      },
      visiblePanels: ['media-player', 'notes'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'notes-bottom': {
          panels: ['notes'],
          activePanel: 'notes',
        },
      },
    },
    
    // Desktop: Video with side notes
    desktop: {
      zoneConfig: {
        id: 'video-focus-desktop-root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 75,
          },
          {
            type: 'panel-group',
            id: 'notes-side',
            tabs: ['notes'],
            activeTabId: 'notes',
            size: 25,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
        'notes': { minWidth: 300 },
      },
      visiblePanels: ['media-player', 'notes'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'notes-side': {
          panels: ['notes'],
          activePanel: 'notes',
        },
      },
    },
    
    // Large: Video with multiple panels
    large: {
      zoneConfig: {
        id: 'video-focus-large-root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 60,
          },
          {
            id: 'video-focus-large-sidebar',
            orientation: 'vertical',
            children: [
              {
                type: 'panel-group',
                id: 'notes-top',
                tabs: ['notes'],
                activeTabId: 'notes',
                size: 60,
              },
              {
                type: 'panel-group',
                id: 'progress-bottom',
                tabs: ['progress'],
                activeTabId: 'progress',
                size: 40,
              },
            ],
            size: 40,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
        'notes': { minWidth: 350 },
        'progress': { minHeight: 200 },
      },
      visiblePanels: ['media-player', 'notes', 'progress'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'notes-top': {
          panels: ['notes'],
          activePanel: 'notes',
        },
        'progress-bottom': {
          panels: ['progress'],
          activePanel: 'progress',
        },
      },
    },
    
    adaptiveBehavior: {
      autoHideUnusedPanels: true,
      preferTabsOnMobile: true,
      maintainAspectRatio: true,
      gracefulDegradation: true,
    },
    
    metadata: {
      useCase: 'Distraction-free video watching',
      difficulty: 'beginner',
      isDefault: true,
    },
  },
  
  {
    id: 'video-study-responsive',
    name: 'Video Study (Responsive)',
    description: 'Comprehensive video learning with transcript and notes',
    supportedContentTypes: ['video'],
    category: 'learning',
    
    // Mobile: Tabbed interface
    mobile: {
      zoneConfig: {
        id: 'video-study-mobile-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 50,
          },
          {
            type: 'panel-group',
            id: 'content-tabs',
            tabs: ['transcript', 'notes'],
            activeTabId: 'transcript',
            size: 50,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
      },
      visiblePanels: ['media-player', 'transcript', 'notes'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'content-tabs': {
          panels: ['transcript', 'notes'],
          activePanel: 'transcript',
        },
      },
    },
    
    // Tablet: Split view
    tablet: {
      zoneConfig: {
        id: 'video-study-tablet-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 50,
          },
          {
            id: 'video-study-tablet-content',
            orientation: 'horizontal',
            children: [
              {
                type: 'panel-group',
                id: 'transcript-panel',
                tabs: ['transcript'],
                activeTabId: 'transcript',
                size: 60,
              },
              {
                type: 'panel-group',
                id: 'notes-panel',
                tabs: ['notes'],
                activeTabId: 'notes',
                size: 40,
              },
            ],
            size: 50,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
      },
      visiblePanels: ['media-player', 'transcript', 'notes'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'transcript-panel': {
          panels: ['transcript'],
          activePanel: 'transcript',
        },
        'notes-panel': {
          panels: ['notes'],
          activePanel: 'notes',
        },
      },
    },
    
    // Desktop: Three-column layout
    desktop: {
      zoneConfig: {
        id: 'video-study-desktop-root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'video-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 50,
          },
          {
            id: 'video-study-desktop-sidebar',
            orientation: 'vertical',
            children: [
              {
                type: 'panel-group',
                id: 'transcript-panel',
                tabs: ['transcript'],
                activeTabId: 'transcript',
                size: 60,
              },
              {
                type: 'panel-group',
                id: 'notes-panel',
                tabs: ['notes'],
                activeTabId: 'notes',
                size: 40,
              },
            ],
            size: 50,
          },
        ],
      },
      panelConfig: {
        'media-player': { aspectRatio: '16:9' },
        'transcript': { minWidth: 300 },
        'notes': { minWidth: 300 },
      },
      visiblePanels: ['media-player', 'transcript', 'notes'],
      panelGroups: {
        'video-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'transcript-panel': {
          panels: ['transcript'],
          activePanel: 'transcript',
        },
        'notes-panel': {
          panels: ['notes'],
          activePanel: 'notes',
        },
      },
    },
    
    adaptiveBehavior: {
      autoHideUnusedPanels: false,
      preferTabsOnMobile: true,
      maintainAspectRatio: true,
      gracefulDegradation: true,
    },
    
    metadata: {
      useCase: 'Active learning with transcript and notes',
      difficulty: 'intermediate',
    },
  },
];

/**
 * Device-aware audio learning presets
 */
export const AUDIO_RESPONSIVE_PRESETS: ResponsiveLayoutPreset[] = [
  {
    id: 'audio-focus-responsive',
    name: 'Audio Focus (Responsive)',
    description: 'Optimized audio listening experience',
    supportedContentTypes: ['audio'],
    category: 'focus',
    
    // Mobile: Audio player with minimal UI
    mobile: {
      zoneConfig: {
        id: 'audio-focus-mobile-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'audio-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 40,
          },
          {
            type: 'panel-group',
            id: 'progress-panel',
            tabs: ['progress'],
            activeTabId: 'progress',
            size: 60,
          },
        ],
      },
      panelConfig: {
        'media-player': { compact: true },
        'progress': { showVisualizer: true },
      },
      visiblePanels: ['media-player', 'progress'],
      panelGroups: {
        'audio-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'progress-panel': {
          panels: ['progress'],
          activePanel: 'progress',
        },
      },
    },
    
    // Desktop: Audio with transcript
    desktop: {
      zoneConfig: {
        id: 'audio-focus-desktop-root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'audio-main',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 30,
          },
          {
            type: 'panel-group',
            id: 'transcript-main',
            tabs: ['transcript'],
            activeTabId: 'transcript',
            size: 70,
          },
        ],
      },
      panelConfig: {
        'media-player': { showVisualizer: true },
        'transcript': { fontSize: 'large' },
      },
      visiblePanels: ['media-player', 'transcript'],
      panelGroups: {
        'audio-main': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'transcript-main': {
          panels: ['transcript'],
          activePanel: 'transcript',
        },
      },
    },
    
    adaptiveBehavior: {
      autoHideUnusedPanels: true,
      preferTabsOnMobile: false,
      maintainAspectRatio: false,
      gracefulDegradation: true,
    },
    
    metadata: {
      useCase: 'Focused audio listening',
      difficulty: 'beginner',
      isDefault: true,
    },
  },
];

/**
 * Get responsive preset configuration for a device
 */
export function getResponsivePresetConfig(
  preset: ResponsiveLayoutPreset,
  deviceBreakpoint: DeviceBreakpoint
): DeviceLayoutConfig {
  // Try to get device-specific config, fall back to desktop
  let config: DeviceLayoutConfig | undefined;
  
  switch (deviceBreakpoint) {
    case 'MOBILE':
      config = preset.mobile;
      break;
    case 'TABLET':
      config = preset.tablet;
      break;
    case 'DESKTOP':
      config = preset.desktop;
      break;
    case 'LARGE':
      config = preset.large;
      break;
    case 'ULTRAWIDE':
      config = preset.ultrawide;
      break;
  }
  
  // Fall back to desktop config if device-specific config doesn't exist
  return config || preset.desktop;
}

/**
 * All responsive presets
 */
export const ALL_RESPONSIVE_PRESETS: ResponsiveLayoutPreset[] = [
  ...VIDEO_RESPONSIVE_PRESETS,
  ...AUDIO_RESPONSIVE_PRESETS,
];

/**
 * Get responsive presets for a content type
 */
export function getResponsivePresetsForContentType(
  contentType: ContentType
): ResponsiveLayoutPreset[] {
  return ALL_RESPONSIVE_PRESETS.filter(preset =>
    preset.supportedContentTypes.includes(contentType)
  );
}

/**
 * Get default responsive preset for a content type
 */
export function getDefaultResponsivePreset(
  contentType: ContentType
): ResponsiveLayoutPreset | null {
  const presets = getResponsivePresetsForContentType(contentType);
  return presets.find(preset => preset.metadata.isDefault) || presets[0] || null;
}