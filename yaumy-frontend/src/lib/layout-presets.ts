/**
 * Layout Presets System
 * 
 * Defines predefined layout configurations for different learning modes and content types.
 * Provides smart defaults and user-customizable layouts.
 */

import { ContentType } from '~/components/panels/types';
import type { DockZone, PanelGroup } from '~/types/adobe-layout';

/**
 * Layout preset definition
 */
export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  supportedContentTypes: ContentType[];
  isDefault?: boolean;
  zoneConfig: DockZone;
  visiblePanels: string[];
  panelGroups: Record<string, {
    panels: string[];
    activePanel: string;
  }>;
  metadata?: {
    category: 'learning' | 'analysis' | 'creation' | 'focus';
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    useCase: string;
  };
}

/**
 * Predefined layout presets
 */
export const LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  // Video Content Layouts
  'video-focus': {
    id: 'video-focus',
    name: 'Video Focus',
    description: 'Large video player with minimal distractions for immersive viewing',
    supportedContentTypes: [ContentType.VIDEO],
    isDefault: true,
    zoneConfig: {
      id: 'root',
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'main-video',
          tabs: ['media-player'],
          activeTabId: 'media-player',
          size: 75,
        },
        {
          type: 'panel-group',
          id: 'sidebar',
          tabs: ['notes'],
          activeTabId: 'notes',
          size: 25,
        },
      ],
    },
    visiblePanels: ['media-player', 'notes'],
    panelGroups: {
      'main-video': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'sidebar': {
        panels: ['notes'],
        activePanel: 'notes',
      },
    },
    metadata: {
      category: 'focus',
      difficulty: 'beginner',
      useCase: 'Distraction-free video watching with note-taking',
    },
  },

  'video-study': {
    id: 'video-study',
    name: 'Video Study Mode',
    description: 'Balanced layout with video, transcript, and notes for active learning',
    supportedContentTypes: [ContentType.VIDEO],
    zoneConfig: {
      id: 'root',
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
          id: 'side-panel',
          orientation: 'vertical',
          children: [
            {
              type: 'panel-group',
              id: 'transcript-group',
              tabs: ['transcript'],
              activeTabId: 'transcript',
              size: 60,
            },
            {
              type: 'panel-group',
              id: 'notes-group',
              tabs: ['notes'],
              activeTabId: 'notes',
              size: 40,
            },
          ],
          size: 50,
        },
      ],
    },
    visiblePanels: ['media-player', 'transcript', 'notes'],
    panelGroups: {
      'video-main': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'transcript-group': {
        panels: ['transcript'],
        activePanel: 'transcript',
      },
      'notes-group': {
        panels: ['notes'],
        activePanel: 'notes',
      },
    },
    metadata: {
      category: 'learning',
      difficulty: 'intermediate',
      useCase: 'Active learning with synchronized transcript reading',
    },
  },

  'video-analysis': {
    id: 'video-analysis',
    name: 'Video Analysis',
    description: 'Comprehensive layout with all panels for detailed content analysis',
    supportedContentTypes: [ContentType.VIDEO],
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          id: 'main-content',
          orientation: 'horizontal',
          children: [
            {
              type: 'panel-group',
              id: 'video-player',
              tabs: ['media-player'],
              activeTabId: 'media-player',
              size: 60,
            },
            {
              id: 'right-panel',
              orientation: 'vertical',
              children: [
                {
                  type: 'panel-group',
                  id: 'content-panels',
                  tabs: ['transcript', 'notes'],
                  activeTabId: 'transcript',
                  size: 70,
                },
                {
                  type: 'panel-group',
                  id: 'nav-progress',
                  tabs: ['navigation', 'progress'],
                  activeTabId: 'navigation',
                  size: 30,
                },
              ],
              size: 40,
            },
          ],
          size: 80,
        },
        {
          type: 'panel-group',
          id: 'timeline-bottom',
          tabs: ['timeline'],
          activeTabId: 'timeline',
          size: 20,
        },
      ],
    },
    visiblePanels: ['media-player', 'transcript', 'notes', 'timeline', 'navigation', 'progress'],
    panelGroups: {
      'video-player': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'content-panels': {
        panels: ['transcript', 'notes'],
        activePanel: 'transcript',
      },
      'nav-progress': {
        panels: ['navigation', 'progress'],
        activePanel: 'navigation',
      },
      'timeline-bottom': {
        panels: ['timeline'],
        activePanel: 'timeline',
      },
    },
    metadata: {
      category: 'analysis',
      difficulty: 'advanced',
      useCase: 'Comprehensive content analysis with full panel access',
    },
  },

  // Audio Content Layouts
  'audio-study': {
    id: 'audio-study',
    name: 'Audio Study Mode',
    description: 'Optimized layout for audio content with transcript and notes',
    supportedContentTypes: [ContentType.AUDIO],
    isDefault: true,
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          type: 'panel-group',
          id: 'audio-player',
          tabs: ['media-player'],
          activeTabId: 'media-player',
          size: 30,
        },
        {
          id: 'content-area',
          orientation: 'horizontal',
          children: [
            {
              type: 'panel-group',
              id: 'transcript-main',
              tabs: ['transcript'],
              activeTabId: 'transcript',
              size: 70,
            },
            {
              type: 'panel-group',
              id: 'notes-side',
              tabs: ['notes'],
              activeTabId: 'notes',
              size: 30,
            },
          ],
          size: 70,
        },
      ],
    },
    visiblePanels: ['media-player', 'transcript', 'notes'],
    panelGroups: {
      'audio-player': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'transcript-main': {
        panels: ['transcript'],
        activePanel: 'transcript',
      },
      'notes-side': {
        panels: ['notes'],
        activePanel: 'notes',
      },
    },
    metadata: {
      category: 'learning',
      difficulty: 'intermediate',
      useCase: 'Audio learning with transcript following and note-taking',
    },
  },

  'audio-focus': {
    id: 'audio-focus',
    name: 'Audio Focus',
    description: 'Minimal layout for distraction-free audio listening',
    supportedContentTypes: [ContentType.AUDIO],
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          type: 'panel-group',
          id: 'audio-main',
          tabs: ['media-player'],
          activeTabId: 'media-player',
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
    },
    visiblePanels: ['media-player', 'progress'],
    panelGroups: {
      'audio-main': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'progress-bottom': {
        panels: ['progress'],
        activePanel: 'progress',
      },
    },
    metadata: {
      category: 'focus',
      difficulty: 'beginner',
      useCase: 'Focused audio listening with progress tracking',
    },
  },

  // Universal Layouts
  'minimal': {
    id: 'minimal',
    name: 'Minimal',
    description: 'Single panel layout for maximum focus',
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO, ContentType.TEXT, ContentType.PDF],
    zoneConfig: {
      id: 'root',
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'single-panel',
          tabs: ['media-player'], // Will be adjusted based on content type
          activeTabId: 'media-player',
          size: 100,
        },
      ],
    },
    visiblePanels: ['media-player'],
    panelGroups: {
      'single-panel': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
    },
    metadata: {
      category: 'focus',
      difficulty: 'beginner',
      useCase: 'Maximum focus with single content panel',
    },
  },

  'side-by-side': {
    id: 'side-by-side',
    name: 'Side by Side',
    description: 'Two-panel layout for content and notes',
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO, ContentType.TEXT, ContentType.PDF],
    zoneConfig: {
      id: 'root',
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'content-main',
          tabs: ['media-player'], // Will be adjusted based on content type
          activeTabId: 'media-player',
          size: 70,
        },
        {
          type: 'panel-group',
          id: 'notes-side',
          tabs: ['notes'],
          activeTabId: 'notes',
          size: 30,
        },
      ],
    },
    visiblePanels: ['media-player', 'notes'],
    panelGroups: {
      'content-main': {
        panels: ['media-player'],
        activePanel: 'media-player',
      },
      'notes-side': {
        panels: ['notes'],
        activePanel: 'notes',
      },
    },
    metadata: {
      category: 'learning',
      difficulty: 'beginner',
      useCase: 'Content consumption with note-taking',
    },
  },
};

/**
 * Utility functions for layout presets
 */

/**
 * Get presets available for a content type
 */
export function getPresetsForContentType(contentType: ContentType): LayoutPreset[] {
  return Object.values(LAYOUT_PRESETS).filter(preset =>
    preset.supportedContentTypes.includes(contentType)
  );
}

/**
 * Get default preset for a content type
 */
export function getDefaultPreset(contentType: ContentType): LayoutPreset | null {
  const presets = getPresetsForContentType(contentType);
  return presets.find(preset => preset.isDefault) || presets[0] || null;
}

/**
 * Get preset by ID
 */
export function getPresetById(presetId: string): LayoutPreset | null {
  return LAYOUT_PRESETS[presetId] || null;
}

/**
 * Adapt preset for specific content type (adjust core panels)
 */
export function adaptPresetForContentType(
  preset: LayoutPreset,
  contentType: ContentType,
  availablePanels: string[]
): LayoutPreset {
  const adapted = { ...preset };
  
  // Replace core panel based on content type
  const corePanel = getCorePanel(contentType);
  
  // Update zone config
  adapted.zoneConfig = adaptZoneConfig(preset.zoneConfig, corePanel, availablePanels) as DockZone;
  
  // Update visible panels
  adapted.visiblePanels = adapted.visiblePanels
    .map(panelId => panelId === 'media-player' ? corePanel : panelId)
    .filter(panelId => availablePanels.includes(panelId));
  
  // Update panel groups
  adapted.panelGroups = adaptPanelGroups(preset.panelGroups, corePanel, availablePanels);
  
  return adapted;
}

/**
 * Get core panel for content type
 */
function getCorePanel(contentType: ContentType): string {
  switch (contentType) {
    case ContentType.VIDEO:
    case ContentType.AUDIO:
      return 'media-player';
    case ContentType.TEXT:
      return 'text-reader';
    case ContentType.PDF:
      return 'pdf-viewer';
    default:
      return 'media-player';
  }
}

/**
 * Recursively adapt zone configuration
 */
function adaptZoneConfig(
  zone: DockZone | PanelGroup,
  corePanel: string,
  availablePanels: string[]
): DockZone | PanelGroup {
  if ('type' in zone && zone.type === 'panel-group') {
    return {
      ...zone,
      tabs: zone.tabs
        .map(tabId => tabId === 'media-player' ? corePanel : tabId)
        .filter(tabId => availablePanels.includes(tabId)),
      activeTabId: zone.activeTabId === 'media-player' ? corePanel : zone.activeTabId,
    };
  } else {
    return {
      ...zone,
      children: (zone as DockZone).children.map(child => 
        adaptZoneConfig(child, corePanel, availablePanels)
      ),
    };
  }
}

/**
 * Adapt panel groups
 */
function adaptPanelGroups(
  panelGroups: Record<string, { panels: string[]; activePanel: string }>,
  corePanel: string,
  availablePanels: string[]
): Record<string, { panels: string[]; activePanel: string }> {
  const adapted: Record<string, { panels: string[]; activePanel: string }> = {};
  
  for (const [groupId, group] of Object.entries(panelGroups)) {
    adapted[groupId] = {
      panels: group.panels
        .map(panelId => panelId === 'media-player' ? corePanel : panelId)
        .filter(panelId => availablePanels.includes(panelId)),
      activePanel: group.activePanel === 'media-player' ? corePanel : group.activePanel,
    };
  }
  
  return adapted;
}

/**
 * Get presets by category
 */
export function getPresetsByCategory(category: string): LayoutPreset[] {
  return Object.values(LAYOUT_PRESETS).filter(preset =>
    preset.metadata?.category === category
  );
}

/**
 * Get presets by difficulty
 */
export function getPresetsByDifficulty(difficulty: string): LayoutPreset[] {
  return Object.values(LAYOUT_PRESETS).filter(preset =>
    preset.metadata?.difficulty === difficulty
  );
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): LayoutPreset[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(LAYOUT_PRESETS).filter(preset =>
    preset.name.toLowerCase().includes(lowerQuery) ||
    preset.description.toLowerCase().includes(lowerQuery) ||
    preset.metadata?.useCase.toLowerCase().includes(lowerQuery)
  );
}