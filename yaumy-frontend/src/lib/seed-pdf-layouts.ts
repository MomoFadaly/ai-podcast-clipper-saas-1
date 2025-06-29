/**
 * Seed PDF Layout Presets
 * 
 * Seeds the database with default PDF layout presets for different study modes.
 * These are system presets that can only be edited by admins.
 */

import { db } from '~/server/db';
import { PDF_LAYOUT_PRESETS } from './pdf-layout-presets';
import { ContentType, LayoutPresetType, LayoutCategory } from '@prisma/client';

/**
 * Seed PDF layout presets into the database
 */
export async function seedPDFLayoutPresets() {
  console.log('🌱 Seeding PDF layout presets...');

  try {
    // Check if PDF presets already exist
    const existingPDFPresets = await db.layoutPreset.findMany({
      where: {
        presetType: LayoutPresetType.SYSTEM,
        supportedContentTypes: {
          has: ContentType.PDF,
        },
      },
    });

    if (existingPDFPresets.length > 0) {
      console.log('PDF layout presets already exist. Skipping seed.');
      return;
    }

    // Create PDF layout presets
    const presetPromises = Object.values(PDF_LAYOUT_PRESETS).map(async (preset) => {
      const categoryMap: Record<string, LayoutCategory> = {
        'focus': LayoutCategory.FOCUS,
        'learning': LayoutCategory.LEARNING,
        'analysis': LayoutCategory.ANALYSIS,
        'creation': LayoutCategory.CREATION,
      };

      const category = preset.metadata?.category ? 
        categoryMap[preset.metadata.category] || LayoutCategory.LEARNING : 
        LayoutCategory.LEARNING;

      return db.layoutPreset.create({
        data: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          presetType: LayoutPresetType.SYSTEM,
          category,
          supportedContentTypes: preset.supportedContentTypes as ContentType[],
          
          // Desktop configuration is the default
          desktopConfig: JSON.parse(JSON.stringify({
            zoneConfig: JSON.parse(JSON.stringify(preset.zoneConfig)),
            visiblePanels: preset.visiblePanels,
            panelGroups: JSON.parse(JSON.stringify(preset.panelGroups)),
          })),
          
          // Mobile configuration - simplified for PDF viewing
          mobileConfig: getMobileConfig(preset.id),
          
          // Tablet configuration - balanced between mobile and desktop
          tabletConfig: getTabletConfig(preset.id),
          
          // Large and ultrawide configurations - enhanced versions
          largeConfig: getLargeConfig(preset),
          ultrawideConfig: getUltrawideConfig(preset),
          
          // Legacy fields for backward compatibility
          zoneConfig: JSON.parse(JSON.stringify(preset.zoneConfig)),
          visiblePanels: preset.visiblePanels,
          panelGroups: JSON.parse(JSON.stringify(preset.panelGroups)),
          
          // Metadata
          isDefault: preset.isDefault || false,
          isPublic: true, // System presets are always public
          useCase: preset.metadata?.useCase,
          difficulty: preset.metadata?.difficulty,
          isResponsive: true,
          
          // System presets don't have a creator
          createdBy: null,
        },
      });
    });

    const createdPresets = await Promise.all(presetPromises);
    console.log(`✅ Successfully seeded ${createdPresets.length} PDF layout presets`);
    
    return createdPresets;
  } catch (error) {
    console.error('❌ Error seeding PDF layout presets:', error);
    throw error;
  }
}

/**
 * Get mobile configuration for a PDF preset
 */
function getMobileConfig(presetId: string): any {
  // All mobile configs use a simple tabbed interface
  const baseConfig = {
    zoneConfig: {
      id: 'root',
      orientation: 'vertical',
      children: [
        {
          type: 'panel-group',
          id: 'mobile-main',
          tabs: ['pdf-viewer'],
          activeTabId: 'pdf-viewer',
          size: 100,
        },
      ],
    },
    visiblePanels: ['pdf-viewer'],
    panelGroups: {
      'mobile-main': {
        panels: ['pdf-viewer'],
        activePanel: 'pdf-viewer',
      },
    },
  };

  // Add floating action button config for notes/tools access
  if (presetId !== 'pdf-reading-focus') {
    return {
      ...baseConfig,
      floatingActions: {
        enabled: true,
        actions: ['notes', 'highlights', 'bookmarks'],
      }
    };
  }

  return baseConfig;
}

/**
 * Get tablet configuration for a PDF preset
 */
function getTabletConfig(presetId: string): any {
  const configs: Record<string, any> = {
    'pdf-reading-focus': {
      zoneConfig: {
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-main',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 100,
          },
        ],
      },
      visiblePanels: ['pdf-viewer'],
      panelGroups: {
        'pdf-main': {
          panels: ['pdf-viewer'],
          activePanel: 'pdf-viewer',
        },
      },
    },
    'pdf-study-annotate': {
      zoneConfig: {
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-content',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 70,
          },
          {
            type: 'panel-group',
            id: 'study-tools',
            tabs: ['notes', 'highlights', 'outline'],
            activeTabId: 'notes',
            size: 30,
          },
        ],
      },
      visiblePanels: ['pdf-viewer', 'notes', 'highlights', 'outline'],
      panelGroups: {
        'pdf-content': {
          panels: ['pdf-viewer'],
          activePanel: 'pdf-viewer',
        },
        'study-tools': {
          panels: ['notes', 'highlights', 'outline'],
          activePanel: 'notes',
        },
      },
    },
    'pdf-research-analysis': {
      zoneConfig: {
        id: 'root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-viewer-area',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 60,
          },
          {
            type: 'panel-group',
            id: 'analysis-tabs',
            tabs: ['notes', 'references', 'search', 'outline'],
            activeTabId: 'notes',
            size: 40,
          },
        ],
      },
      visiblePanels: ['pdf-viewer', 'notes', 'references', 'search', 'outline'],
      panelGroups: {
        'pdf-viewer-area': {
          panels: ['pdf-viewer'],
          activePanel: 'pdf-viewer',
        },
        'analysis-tabs': {
          panels: ['notes', 'references', 'search', 'outline'],
          activePanel: 'notes',
        },
      },
    },
    'pdf-compare-review': {
      zoneConfig: {
        id: 'root',
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'comparison-view',
            tabs: ['pdf-viewer', 'pdf-viewer-secondary'],
            activeTabId: 'pdf-viewer',
            size: 85,
          },
          {
            type: 'panel-group',
            id: 'comparison-tools',
            tabs: ['notes', 'sync-settings'],
            activeTabId: 'notes',
            size: 15,
          },
        ],
      },
      visiblePanels: ['pdf-viewer', 'pdf-viewer-secondary', 'notes', 'sync-settings'],
      panelGroups: {
        'comparison-view': {
          panels: ['pdf-viewer', 'pdf-viewer-secondary'],
          activePanel: 'pdf-viewer',
        },
        'comparison-tools': {
          panels: ['notes', 'sync-settings'],
          activePanel: 'notes',
        },
      },
    },
  };

  return configs[presetId] || configs['pdf-study-annotate'];
}

/**
 * Get large monitor configuration
 */
function getLargeConfig(preset: any): any {
  // Use desktop config as base and enhance with additional panels
  const config = JSON.parse(JSON.stringify({
    zoneConfig: preset.zoneConfig,
    visiblePanels: preset.visiblePanels,
    panelGroups: preset.panelGroups,
  }));

  // Add more space for panels on large monitors
  if (preset.id === 'pdf-study-annotate') {
    // Add a reference panel for large monitors
    config.visiblePanels.push('references');
    config.panelGroups['notes-section'].panels.push('references');
  }

  return config;
}

/**
 * Get ultrawide configuration
 */
function getUltrawideConfig(preset: any): any {
  const configs: Record<string, any> = {
    'pdf-reading-focus': {
      zoneConfig: {
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-centered',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 60,
          },
          {
            type: 'panel-group',
            id: 'left-margin',
            tabs: ['outline'],
            activeTabId: 'outline',
            size: 20,
          },
          {
            type: 'panel-group',
            id: 'right-margin',
            tabs: ['bookmarks'],
            activeTabId: 'bookmarks',
            size: 20,
          },
        ],
      },
      visiblePanels: ['pdf-viewer', 'outline', 'bookmarks'],
      panelGroups: {
        'pdf-centered': {
          panels: ['pdf-viewer'],
          activePanel: 'pdf-viewer',
        },
        'left-margin': {
          panels: ['outline'],
          activePanel: 'outline',
        },
        'right-margin': {
          panels: ['bookmarks'],
          activePanel: 'bookmarks',
        },
      },
    },
    'pdf-study-annotate': {
      zoneConfig: {
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'pdf-content',
            tabs: ['pdf-viewer'],
            activeTabId: 'pdf-viewer',
            size: 50,
          },
          {
            type: 'panel-group',
            id: 'notes-area',
            tabs: ['notes', 'highlights'],
            activeTabId: 'notes',
            size: 25,
          },
          {
            type: 'panel-group',
            id: 'reference-area',
            tabs: ['references', 'web-search'],
            activeTabId: 'references',
            size: 25,
          },
        ],
      },
      visiblePanels: ['pdf-viewer', 'notes', 'highlights', 'references', 'web-search'],
      panelGroups: {
        'pdf-content': {
          panels: ['pdf-viewer'],
          activePanel: 'pdf-viewer',
        },
        'notes-area': {
          panels: ['notes', 'highlights'],
          activePanel: 'notes',
        },
        'reference-area': {
          panels: ['references', 'web-search'],
          activePanel: 'references',
        },
      },
    },
  };

  // Use enhanced config for ultrawide, or fall back to desktop config
  return configs[preset.id] || {
    zoneConfig: preset.zoneConfig,
    visiblePanels: preset.visiblePanels,
    panelGroups: preset.panelGroups,
  };
}

/**
 * Update existing PDF presets
 */
export async function updatePDFLayoutPresets() {
  console.log('🔄 Updating PDF layout presets...');

  try {
    const updatePromises = Object.values(PDF_LAYOUT_PRESETS).map(async (preset) => {
      const categoryMap: Record<string, LayoutCategory> = {
        'focus': LayoutCategory.FOCUS,
        'learning': LayoutCategory.LEARNING,
        'analysis': LayoutCategory.ANALYSIS,
        'creation': LayoutCategory.CREATION,
      };

      const category = preset.metadata?.category ? 
        categoryMap[preset.metadata.category] || LayoutCategory.LEARNING : 
        LayoutCategory.LEARNING;

      return db.layoutPreset.upsert({
        where: { id: preset.id },
        update: {
          name: preset.name,
          description: preset.description,
          category,
          supportedContentTypes: preset.supportedContentTypes as ContentType[],
          desktopConfig: JSON.parse(JSON.stringify({
            zoneConfig: JSON.parse(JSON.stringify(preset.zoneConfig)),
            visiblePanels: preset.visiblePanels,
            panelGroups: JSON.parse(JSON.stringify(preset.panelGroups)),
          })),
          mobileConfig: getMobileConfig(preset.id),
          tabletConfig: getTabletConfig(preset.id),
          largeConfig: getLargeConfig(preset),
          ultrawideConfig: getUltrawideConfig(preset),
          useCase: preset.metadata?.useCase,
          difficulty: preset.metadata?.difficulty,
          isResponsive: true,
          updatedAt: new Date(),
        },
        create: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          presetType: LayoutPresetType.SYSTEM,
          category,
          supportedContentTypes: preset.supportedContentTypes as ContentType[],
          desktopConfig: JSON.parse(JSON.stringify({
            zoneConfig: JSON.parse(JSON.stringify(preset.zoneConfig)),
            visiblePanels: preset.visiblePanels,
            panelGroups: JSON.parse(JSON.stringify(preset.panelGroups)),
          })),
          mobileConfig: getMobileConfig(preset.id),
          tabletConfig: getTabletConfig(preset.id),
          largeConfig: getLargeConfig(preset),
          ultrawideConfig: getUltrawideConfig(preset),
          zoneConfig: JSON.parse(JSON.stringify(preset.zoneConfig)),
          visiblePanels: preset.visiblePanels,
          panelGroups: JSON.parse(JSON.stringify(preset.panelGroups)),
          isDefault: preset.isDefault || false,
          isPublic: true,
          useCase: preset.metadata?.useCase,
          difficulty: preset.metadata?.difficulty,
          isResponsive: true,
          createdBy: null,
        },
      });
    });

    const updatedPresets = await Promise.all(updatePromises);
    console.log(`✅ Successfully updated ${updatedPresets.length} PDF layout presets`);
    
    return updatedPresets;
  } catch (error) {
    console.error('❌ Error updating PDF layout presets:', error);
    throw error;
  }
}

/**
 * Remove PDF layout presets
 */
export async function removePDFLayoutPresets() {
  console.log('🗑️  Removing PDF layout presets...');

  try {
    const presetIds = Object.keys(PDF_LAYOUT_PRESETS);
    
    const result = await db.layoutPreset.deleteMany({
      where: {
        id: {
          in: presetIds,
        },
        presetType: LayoutPresetType.SYSTEM,
      },
    });

    console.log(`✅ Successfully removed ${result.count} PDF layout presets`);
    return result;
  } catch (error) {
    console.error('❌ Error removing PDF layout presets:', error);
    throw error;
  }
}