/**
 * Diagnostic script to check layout presets in database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPresets() {
  console.log('🔍 Checking layout presets in database...\n');

  try {
    // Get all presets
    const allPresets = await prisma.layoutPreset.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        presetType: true,
        category: true,
        supportedContentTypes: true,
        isPublic: true,
        createdBy: true,
        createdAt: true,
      },
    });

    console.log(`Total presets: ${allPresets.length}`);
    console.log('-------------------\n');

    // Group by type
    const systemPresets = allPresets.filter(p => p.presetType === 'SYSTEM');
    const userPresets = allPresets.filter(p => p.presetType === 'USER_CUSTOM');

    console.log(`SYSTEM presets: ${systemPresets.length}`);
    systemPresets.forEach(p => {
      console.log(`  - ${p.name} (${p.id})`);
      console.log(`    Public: ${p.isPublic}, Content Types: ${p.supportedContentTypes.join(', ')}`);
      console.log(`    Category: ${p.category}, Created: ${p.createdAt.toISOString()}`);
    });

    console.log(`\nUSER_CUSTOM presets: ${userPresets.length}`);
    userPresets.forEach(p => {
      console.log(`  - ${p.name} (${p.id})`);
      console.log(`    Public: ${p.isPublic}, Creator: ${p.createdBy || 'none'}`);
      console.log(`    Content Types: ${p.supportedContentTypes.join(', ')}`);
    });

    // Check our learning presets specifically
    console.log('\n🎯 Learning Presets Status:');
    const learningPresetIds = [
      'learning-focus-mode',
      'learning-note-taker',
      'learning-overview-master',
      'learning-split-screen',
      'learning-dashboard',
      'learning-reference-mode',
    ];

    for (const id of learningPresetIds) {
      const preset = allPresets.find(p => p.id === id);
      if (preset) {
        console.log(`✅ ${preset.name} - Found`);
      } else {
        console.log(`❌ ${id} - Not found`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking presets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkPresets();