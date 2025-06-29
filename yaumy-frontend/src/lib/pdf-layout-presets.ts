/**
 * PDF Layout Presets
 * 
 * Specialized layout configurations for PDF document study modes.
 * Each preset is optimized for different learning approaches and study patterns.
 */

import { ContentType } from '~/components/panels/types';
import type { LayoutPreset } from './layout-presets';

/**
 * PDF-specific layout presets for different study modes
 */
export const PDF_LAYOUT_PRESETS: Record<string, LayoutPreset> = {
  // 1. PDF Reading Focus Mode
  'pdf-reading-focus': {
    id: 'pdf-reading-focus',
    name: 'PDF Reading Focus',
    description: 'Distraction-free PDF reading with full-page view and minimal UI elements',
    supportedContentTypes: ['pdf'],
    isDefault: true,
    zoneConfig: {
      id: 'root',
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'pdf-main',
          tabs: ['pdf-reader'],
          activeTabId: 'pdf-reader',
          size: 100,
        },
      ],
    },
    visiblePanels: ['pdf-reader'],
    panelGroups: {
      'pdf-main': {
        panels: ['pdf-reader'],
        activePanel: 'pdf-reader',
      },
    },
    metadata: {
      category: 'focus',
      difficulty: 'beginner',
      useCase: 'Immersive reading experience with maximum screen real estate for the PDF',
    },
  },

  // 2. PDF Study & Annotate Mode
  'pdf-study-annotate': {
    id: 'pdf-study-annotate',
    name: 'PDF Study & Annotate',
    description: 'Balanced layout with PDF viewer, notes panel, and annotation tools for active studying',
    supportedContentTypes: ['pdf'],
    zoneConfig: {
      id: 'root',
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'pdf-content',
          tabs: ['pdf-viewer'],
          activeTabId: 'pdf-viewer',
          size: 65,
        },
        {
          type: 'panel-group',
          id: 'study-tools',
          orientation: 'vertical',
          children: [
            {
              type: 'panel-group',
              id: 'notes-section',
              tabs: ['notes', 'highlights'],
              activeTabId: 'notes',
              size: 70,
            },
            {
              type: 'panel-group',
              id: 'navigation-section',
              tabs: ['outline', 'bookmarks'],
              activeTabId: 'outline',
              size: 30,
            },
          ],
          size: 35,
        },
      ],
    },
    visiblePanels: ['pdf-viewer', 'notes', 'highlights', 'outline', 'bookmarks'],
    panelGroups: {
      'pdf-content': {
        panels: ['pdf-viewer'],
        activePanel: 'pdf-viewer',
      },
      'notes-section': {
        panels: ['notes', 'highlights'],
        activePanel: 'notes',
      },
      'navigation-section': {
        panels: ['outline', 'bookmarks'],
        activePanel: 'outline',
      },
    },
    metadata: {
      category: 'learning',
      difficulty: 'intermediate',
      useCase: 'Active studying with note-taking, highlighting, and easy navigation through document structure',
    },
  },

  // 3. PDF Research & Analysis Mode
  'pdf-research-analysis': {
    id: 'pdf-research-analysis',
    name: 'PDF Research & Analysis',
    description: 'Comprehensive layout for in-depth document analysis with multiple reference panels',
    supportedContentTypes: ['pdf'],
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          type: 'panel-group',
          id: 'main-workspace',
          orientation: 'horizontal',
          children: [
            {
              type: 'panel-group',
              id: 'pdf-primary',
              tabs: ['pdf-viewer'],
              activeTabId: 'pdf-viewer',
              size: 50,
            },
            {
              type: 'panel-group',
              id: 'analysis-tools',
              orientation: 'vertical',
              children: [
                {
                  type: 'panel-group',
                  id: 'reference-panel',
                  tabs: ['references', 'citations', 'search'],
                  activeTabId: 'references',
                  size: 50,
                },
                {
                  type: 'panel-group',
                  id: 'notes-analysis',
                  tabs: ['notes', 'highlights', 'annotations'],
                  activeTabId: 'notes',
                  size: 50,
                },
              ],
              size: 50,
            },
          ],
          size: 80,
        },
        {
          type: 'panel-group',
          id: 'overview-panel',
          tabs: ['outline', 'thumbnails', 'bookmarks'],
          activeTabId: 'outline',
          size: 20,
        },
      ],
    },
    visiblePanels: ['pdf-viewer', 'references', 'citations', 'search', 'notes', 'highlights', 'annotations', 'outline', 'thumbnails', 'bookmarks'],
    panelGroups: {
      'pdf-primary': {
        panels: ['pdf-viewer'],
        activePanel: 'pdf-viewer',
      },
      'reference-panel': {
        panels: ['references', 'citations', 'search'],
        activePanel: 'references',
      },
      'notes-analysis': {
        panels: ['notes', 'highlights', 'annotations'],
        activePanel: 'notes',
      },
      'overview-panel': {
        panels: ['outline', 'thumbnails', 'bookmarks'],
        activePanel: 'outline',
      },
    },
    metadata: {
      category: 'analysis',
      difficulty: 'advanced',
      useCase: 'Deep document analysis with cross-referencing, comprehensive note-taking, and multi-panel workspace',
    },
  },

  // 4. PDF Compare & Review Mode
  'pdf-compare-review': {
    id: 'pdf-compare-review',
    name: 'PDF Compare & Review',
    description: 'Side-by-side PDF viewing for comparing documents or reviewing with annotations',
    supportedContentTypes: ['pdf'],
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          type: 'panel-group',
          id: 'comparison-area',
          orientation: 'horizontal',
          children: [
            {
              type: 'panel-group',
              id: 'pdf-left',
              tabs: ['pdf-viewer'],
              activeTabId: 'pdf-viewer',
              size: 45,
            },
            {
              type: 'panel-group',
              id: 'pdf-right',
              tabs: ['pdf-viewer-secondary'],
              activeTabId: 'pdf-viewer-secondary',
              size: 45,
            },
            {
              type: 'panel-group',
              id: 'comparison-tools',
              tabs: ['notes', 'differences'],
              activeTabId: 'notes',
              size: 10,
            },
          ],
          size: 85,
        },
        {
          type: 'panel-group',
          id: 'sync-controls',
          tabs: ['sync-settings', 'bookmarks'],
          activeTabId: 'sync-settings',
          size: 15,
        },
      ],
    },
    visiblePanels: ['pdf-viewer', 'pdf-viewer-secondary', 'notes', 'differences', 'sync-settings', 'bookmarks'],
    panelGroups: {
      'pdf-left': {
        panels: ['pdf-viewer'],
        activePanel: 'pdf-viewer',
      },
      'pdf-right': {
        panels: ['pdf-viewer-secondary'],
        activePanel: 'pdf-viewer-secondary',
      },
      'comparison-tools': {
        panels: ['notes', 'differences'],
        activePanel: 'notes',
      },
      'sync-controls': {
        panels: ['sync-settings', 'bookmarks'],
        activePanel: 'sync-settings',
      },
    },
    metadata: {
      category: 'analysis',
      difficulty: 'advanced',
      useCase: 'Compare multiple PDFs side-by-side, review changes, or study related documents simultaneously',
    },
  },
};

/**
 * Get all PDF layout presets
 */
export function getPDFLayoutPresets(): LayoutPreset[] {
  return Object.values(PDF_LAYOUT_PRESETS);
}

/**
 * Get default PDF layout preset
 */
export function getDefaultPDFPreset(): LayoutPreset {
  return PDF_LAYOUT_PRESETS['pdf-reading-focus']!;
}

/**
 * Get PDF preset by study mode
 */
export function getPDFPresetByMode(mode: 'focus' | 'study' | 'research' | 'compare'): LayoutPreset | null {
  const modeMap = {
    focus: 'pdf-reading-focus',
    study: 'pdf-study-annotate',
    research: 'pdf-research-analysis',
    compare: 'pdf-compare-review',
  };
  
  return PDF_LAYOUT_PRESETS[modeMap[mode]] || null;
}

/**
 * Adapt PDF preset for device breakpoint
 */
export function adaptPDFPresetForDevice(
  preset: LayoutPreset,
  deviceBreakpoint: 'mobile' | 'tablet' | 'desktop' | 'large' | 'ultrawide'
): LayoutPreset {
  const adapted = { ...preset };
  
  // Mobile adaptations
  if (deviceBreakpoint === 'mobile') {
    // Convert multi-panel layouts to tabbed interface for mobile
    if (preset.id === 'pdf-study-annotate' || preset.id === 'pdf-research-analysis') {
      adapted.zoneConfig = {
        id: 'root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'mobile-tabs',
            tabs: ['pdf-viewer', 'notes', 'outline'],
            activeTabId: 'pdf-viewer',
            size: 100,
          },
        ],
      };
      adapted.visiblePanels = ['pdf-viewer', 'notes', 'outline'];
    }
  }
  
  // Tablet adaptations
  if (deviceBreakpoint === 'tablet') {
    // Simplify complex layouts for tablet
    if (preset.id === 'pdf-research-analysis') {
      adapted.zoneConfig = {
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-main',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 70,
          },
          {
            type: 'panel-group',
            id: 'tools-side',
            tabs: ['notes', 'outline', 'search'],
            activeTabId: 'notes',
            size: 30,
          },
        ],
      };
    }
  }
  
  // Ultrawide adaptations
  if (deviceBreakpoint === 'ultrawide') {
    // Expand layouts to utilize ultrawide space
    if (preset.id === 'pdf-study-annotate') {
      // Add additional reference panel for ultrawide
      const zoneConfig = preset.zoneConfig as any;
      zoneConfig.children.push({
        type: 'panel-group',
        id: 'additional-reference',
        tabs: ['references', 'web-search'],
        activeTabId: 'references',
        size: 20,
      });
    }
  }
  
  return adapted;
}