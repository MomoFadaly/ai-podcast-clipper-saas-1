/**
 * Seed Default Layouts
 * 
 * Populates the database with system default layout presets.
 * Run this after deploying the layout system to production.
 */

import { db } from "~/server/db";
import { LAYOUT_PRESETS } from "./layout-presets";
import { PDF_LAYOUT_PRESETS } from "./pdf-layout-presets";
import type { LayoutPresetType, LayoutCategory, ContentType } from "@prisma/client";

/**
 * Map our internal content types to Prisma enums
 */
function mapContentType(contentType: string): ContentType {
  switch (contentType) {
    case 'video': return 'VIDEO';
    case 'audio': return 'AUDIO';
    case 'text': return 'TEXT';
    case 'pdf': return 'PDF';
    default: return 'VIDEO';
  }
}

/**
 * Map our internal categories to Prisma enums
 */
function mapCategory(category: string): LayoutCategory {
  switch (category) {
    case 'focus': return 'FOCUS';
    case 'learning': return 'LEARNING';
    case 'analysis': return 'ANALYSIS';
    case 'creation': return 'CREATION';
    default: return 'LEARNING';
  }
}

/**
 * Seed default layout presets into the database
 */
export async function seedDefaultLayouts(): Promise<void> {
  console.log('🌱 Seeding default layout presets...');

  try {
    // Delete existing system presets to avoid duplicates
    await db.layoutPreset.deleteMany({
      where: {
        presetType: 'SYSTEM',
      },
    });

    console.log('🗑️  Cleared existing system presets');

    // Combine video/audio and PDF presets
    const allPresets = { ...LAYOUT_PRESETS, ...PDF_LAYOUT_PRESETS };
    
    // Convert and insert all layout presets
    const presetsToCreate = Object.values(allPresets).map(preset => ({
      id: preset.id, // Use the same ID for consistency
      name: preset.name,
      description: preset.description,
      presetType: 'SYSTEM' as LayoutPresetType,
      category: mapCategory(preset.metadata?.category || 'learning'),
      supportedContentTypes: preset.supportedContentTypes.map(mapContentType),
      zoneConfig: preset.zoneConfig as any,
      panelConfig: preset.panelGroups, // Store panel groups as panel config
      visiblePanels: preset.visiblePanels,
      panelGroups: preset.panelGroups,
      desktopConfig: preset.zoneConfig as any, // Use zoneConfig as desktop config for legacy presets
      isDefault: preset.isDefault || false,
      isPublic: true, // System presets are public
      useCase: preset.metadata?.useCase,
      difficulty: preset.metadata?.difficulty,
      createdBy: null, // System presets have no creator
      usageCount: 0,
    }));

    // Insert all presets
    for (const presetData of presetsToCreate) {
      try {
        await db.layoutPreset.create({
          data: presetData,
        });
        console.log(`✅ Created preset: ${presetData.name}`);
      } catch (error) {
        console.error(`❌ Failed to create preset ${presetData.name}:`, error);
      }
    }

    console.log(`🎉 Successfully seeded ${presetsToCreate.length} default layout presets`);

    // Verify the seeding
    const count = await db.layoutPreset.count({
      where: { presetType: 'SYSTEM' },
    });

    console.log(`📊 Total system presets in database: ${count}`);

  } catch (error) {
    console.error('❌ Failed to seed default layouts:', error);
    throw error;
  }
}

/**
 * Remove all default layouts (for cleanup)
 */
export async function removeDefaultLayouts(): Promise<void> {
  console.log('🧹 Removing default layout presets...');

  try {
    const result = await db.layoutPreset.deleteMany({
      where: {
        presetType: 'SYSTEM',
      },
    });

    console.log(`🗑️  Removed ${result.count} system presets`);
  } catch (error) {
    console.error('❌ Failed to remove default layouts:', error);
    throw error;
  }
}

/**
 * Update existing default layouts with new definitions
 */
export async function updateDefaultLayouts(): Promise<void> {
  console.log('🔄 Updating default layout presets...');

  try {
    // Combine video/audio and PDF presets
    const allPresets = { ...LAYOUT_PRESETS, ...PDF_LAYOUT_PRESETS };
    
    for (const [presetId, preset] of Object.entries(allPresets)) {
      const updateData = {
        name: preset.name,
        description: preset.description,
        category: mapCategory(preset.metadata?.category || 'learning'),
        supportedContentTypes: preset.supportedContentTypes.map(mapContentType),
        zoneConfig: preset.zoneConfig as any,
        panelConfig: preset.panelGroups,
        visiblePanels: preset.visiblePanels,
        panelGroups: preset.panelGroups,
        isDefault: preset.isDefault || false,
        useCase: preset.metadata?.useCase,
        difficulty: preset.metadata?.difficulty,
      };

      try {
        await db.layoutPreset.upsert({
          where: { id: presetId },
          update: updateData,
          create: {
            id: presetId,
            ...updateData,
            desktopConfig: preset.zoneConfig as any, // Use zoneConfig as desktop config for legacy presets
            presetType: 'SYSTEM',
            isPublic: true,
            createdBy: null,
            usageCount: 0,
          },
        });

        console.log(`✅ Updated preset: ${preset.name}`);
      } catch (error) {
        console.error(`❌ Failed to update preset ${preset.name}:`, error);
      }
    }

    console.log('🎉 Successfully updated default layout presets');

  } catch (error) {
    console.error('❌ Failed to update default layouts:', error);
    throw error;
  }
}

/**
 * Get seeding statistics
 */
export async function getLayoutSeedStats(): Promise<{
  systemPresets: number;
  userPresets: number;
  totalPresets: number;
  contentTypeCoverage: Record<string, number>;
}> {
  try {
    const [systemCount, userCount, totalCount] = await Promise.all([
      db.layoutPreset.count({ where: { presetType: 'SYSTEM' } }),
      db.layoutPreset.count({ where: { presetType: 'USER_CUSTOM' } }),
      db.layoutPreset.count(),
    ]);

    // Get content type coverage
    const contentTypes = ['VIDEO', 'AUDIO', 'TEXT', 'PDF'] as const;
    const contentTypeCoverage: Record<string, number> = {};

    for (const contentType of contentTypes) {
      contentTypeCoverage[contentType] = await db.layoutPreset.count({
        where: {
          supportedContentTypes: { has: contentType },
          presetType: 'SYSTEM',
        },
      });
    }

    return {
      systemPresets: systemCount,
      userPresets: userCount,
      totalPresets: totalCount,
      contentTypeCoverage,
    };
  } catch (error) {
    console.error('Failed to get seeding stats:', error);
    return {
      systemPresets: 0,
      userPresets: 0,
      totalPresets: 0,
      contentTypeCoverage: {},
    };
  }
}

/**
 * Main seeding function for use in scripts
 */
export async function runLayoutSeeding(): Promise<void> {
  try {
    await seedDefaultLayouts();
    
    const stats = await getLayoutSeedStats();
    console.log('📈 Seeding Statistics:');
    console.log(`  System Presets: ${stats.systemPresets}`);
    console.log(`  User Presets: ${stats.userPresets}`);
    console.log(`  Total Presets: ${stats.totalPresets}`);
    console.log('  Content Type Coverage:');
    
    for (const [contentType, count] of Object.entries(stats.contentTypeCoverage)) {
      console.log(`    ${contentType}: ${count} presets`);
    }

  } catch (error) {
    console.error('❌ Layout seeding failed:', error);
    process.exit(1);
  }
}

// Allow running this file directly
if (require.main === module) {
  runLayoutSeeding()
    .then(() => {
      console.log('✅ Layout seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Layout seeding failed:', error);
      process.exit(1);
    });
}