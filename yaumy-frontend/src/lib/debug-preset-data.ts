/**
 * Debug script to check preset data structure
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugPresetData() {
  console.log('🔍 Debugging preset data structure...\n');

  try {
    // Get one of our learning presets
    const preset = await prisma.layoutPreset.findUnique({
      where: { id: 'learning-split-screen' },
    });

    if (!preset) {
      console.log('❌ Preset not found');
      return;
    }

    console.log('Preset:', preset.name);
    console.log('-------------------\n');

    console.log('desktopConfig type:', typeof preset.desktopConfig);
    console.log('desktopConfig:', JSON.stringify(preset.desktopConfig, null, 2));
    
    console.log('\nzoneConfig type:', typeof preset.zoneConfig);
    console.log('zoneConfig:', JSON.stringify(preset.zoneConfig, null, 2));
    
    console.log('\npanelGroups type:', typeof preset.panelGroups);
    console.log('panelGroups:', JSON.stringify(preset.panelGroups, null, 2));

    console.log('\nvisiblePanels:', preset.visiblePanels);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugPresetData();