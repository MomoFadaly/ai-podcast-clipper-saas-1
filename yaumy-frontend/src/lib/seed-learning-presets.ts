/**
 * Seed Learning-Focused Layout Presets
 * 
 * This script adds six learning-focused layout presets to the database as SYSTEM presets.
 * These presets are designed for different learner personas and use cases.
 * 
 * Run with: npx tsx src/lib/seed-learning-presets.ts
 */

import { PrismaClient, LayoutPresetType, LayoutCategory, ContentType } from '@prisma/client';
import type { DockZone } from '~/types/adobe-layout';

const prisma = new PrismaClient();

// Helper function to create zone configuration
function createZoneConfig(config: DockZone): any {
  return config;
}

// Define our six learning-focused presets
const learningPresets = [
  {
    // 1. Focus Mode - The Deep Learner
    id: 'learning-focus-mode',
    name: 'Focus Mode',
    description: 'Immersive learning with minimal distractions. Perfect for lectures and deep study sessions.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.FOCUS,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO],
    useCase: 'Deep learning sessions, lectures, tutorials',
    difficulty: 'beginner',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'main-content',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 85,
          },
          {
            type: 'panel-group',
            id: 'minimal-sidebar',
            tabs: ['chunk-navigation-vertical'],
            activeTabId: 'chunk-navigation-vertical',
            size: 15,
          },
        ],
      }),
      visiblePanels: ['media-player', 'chunk-navigation-vertical'],
      panelGroups: {
        'main-content': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'minimal-sidebar': {
          panels: ['chunk-navigation-vertical'],
          activePanel: 'chunk-navigation-vertical',
        },
      },
    },
  },

  {
    // 2. Note-Taker - The Active Documenter
    id: 'learning-note-taker',
    name: 'Note-Taker',
    description: 'Side-by-side video and notes for active documentation. Ideal for students and researchers.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.LEARNING,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO],
    useCase: 'Taking synchronized notes, content review',
    difficulty: 'beginner',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'video-section',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 60,
          },
          {
            type: 'panel-group',
            id: 'notes-section',
            tabs: ['notes'],
            activeTabId: 'notes',
            size: 40,
          },
        ],
      }),
      visiblePanels: ['media-player', 'notes'],
      panelGroups: {
        'video-section': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'notes-section': {
          panels: ['notes'],
          activePanel: 'notes',
        },
      },
    },
  },

  {
    // 3. Overview Master - The Strategic Learner
    id: 'learning-overview-master',
    name: 'Overview Master',
    description: 'Visual content navigation with timeline view. Great for quick review and progress tracking.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.LEARNING,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO],
    useCase: 'Content preview, quick navigation, progress tracking',
    difficulty: 'intermediate',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'vertical',
        children: [
          {
            id: 'main-area',
            orientation: 'horizontal',
            children: [
              {
                type: 'panel-group',
                id: 'video-player',
                tabs: ['media-player'],
                activeTabId: 'media-player',
                size: 70,
              },
              {
                type: 'panel-group',
                id: 'chapters-sidebar',
                tabs: ['chunk-navigation-vertical', 'progress'],
                activeTabId: 'chunk-navigation-vertical',
                size: 30,
              },
            ],
            size: 75,
          },
          {
            type: 'panel-group',
            id: 'timeline-bottom',
            tabs: ['chunk-navigation-horizontal'],
            activeTabId: 'chunk-navigation-horizontal',
            size: 25,
          },
        ],
      }),
      visiblePanels: ['media-player', 'chunk-navigation-vertical', 'chunk-navigation-horizontal', 'progress'],
      panelGroups: {
        'video-player': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'chapters-sidebar': {
          panels: ['chunk-navigation-vertical', 'progress'],
          activePanel: 'chunk-navigation-vertical',
        },
        'timeline-bottom': {
          panels: ['chunk-navigation-horizontal'],
          activePanel: 'chunk-navigation-horizontal',
        },
      },
    },
  },

  {
    // 4. Split Screen Study - The Multi-Tasker
    id: 'learning-split-screen',
    name: 'Split Screen Study',
    description: 'Video, transcript, and navigation in perfect harmony. Ideal for language learning and detailed study.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.LEARNING,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO],
    useCase: 'Following along with transcript, language learning',
    difficulty: 'intermediate',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'media-section',
            tabs: ['media-player'],
            activeTabId: 'media-player',
            size: 40,
          },
          {
            type: 'panel-group',
            id: 'transcript-section',
            tabs: ['transcript'],
            activeTabId: 'transcript',
            size: 30,
          },
          {
            id: 'right-panel',
            orientation: 'vertical',
            children: [
              {
                type: 'panel-group',
                id: 'chunks-notes',
                tabs: ['chunk-navigation-vertical', 'notes'],
                activeTabId: 'chunk-navigation-vertical',
                size: 70,
              },
              {
                type: 'panel-group',
                id: 'progress-section',
                tabs: ['progress'],
                activeTabId: 'progress',
                size: 30,
              },
            ],
            size: 30,
          },
        ],
      }),
      visiblePanels: ['media-player', 'transcript', 'chunk-navigation-vertical', 'notes', 'progress'],
      panelGroups: {
        'media-section': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'transcript-section': {
          panels: ['transcript'],
          activePanel: 'transcript',
        },
        'chunks-notes': {
          panels: ['chunk-navigation-vertical', 'notes'],
          activePanel: 'chunk-navigation-vertical',
        },
        'progress-section': {
          panels: ['progress'],
          activePanel: 'progress',
        },
      },
    },
  },

  {
    // 5. Dashboard View - The Progress Tracker
    id: 'learning-dashboard',
    name: 'Dashboard View',
    description: 'Track your learning journey with progress stats and smart navigation. Perfect for self-paced learners.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.LEARNING,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO],
    useCase: 'Tracking learning streaks, managing multiple courses',
    difficulty: 'beginner',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'horizontal',
        children: [
          {
            type: 'panel-group',
            id: 'progress-sidebar',
            tabs: ['progress'],
            activeTabId: 'progress',
            size: 20,
          },
          {
            id: 'main-content',
            orientation: 'vertical',
            children: [
              {
                type: 'panel-group',
                id: 'video-area',
                tabs: ['media-player'],
                activeTabId: 'media-player',
                size: 70,
              },
              {
                type: 'panel-group',
                id: 'navigation-area',
                tabs: ['chunk-navigation-horizontal'],
                activeTabId: 'chunk-navigation-horizontal',
                size: 30,
              },
            ],
            size: 60,
          },
          {
            type: 'panel-group',
            id: 'chapters-sidebar',
            tabs: ['chunk-navigation-vertical'],
            activeTabId: 'chunk-navigation-vertical',
            size: 20,
          },
        ],
      }),
      visiblePanels: ['media-player', 'progress', 'chunk-navigation-vertical', 'chunk-navigation-horizontal'],
      panelGroups: {
        'progress-sidebar': {
          panels: ['progress'],
          activePanel: 'progress',
        },
        'video-area': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'navigation-area': {
          panels: ['chunk-navigation-horizontal'],
          activePanel: 'chunk-navigation-horizontal',
        },
        'chapters-sidebar': {
          panels: ['chunk-navigation-vertical'],
          activePanel: 'chunk-navigation-vertical',
        },
      },
    },
  },

  {
    // 6. Reference Mode - The Researcher
    id: 'learning-reference-mode',
    name: 'Reference Mode',
    description: 'Comprehensive layout for research and analysis. All tools at your fingertips.',
    presetType: LayoutPresetType.SYSTEM,
    category: LayoutCategory.ANALYSIS,
    supportedContentTypes: [ContentType.VIDEO, ContentType.AUDIO, ContentType.TEXT, ContentType.PDF],
    useCase: 'Research, content analysis, cross-referencing',
    difficulty: 'advanced',
    isPublic: true,
    isResponsive: true,
    desktopConfig: {
      zoneConfig: createZoneConfig({
        id: 'root',
        orientation: 'vertical',
        children: [
          {
            id: 'top-section',
            orientation: 'horizontal',
            children: [
              {
                type: 'panel-group',
                id: 'media-player-area',
                tabs: ['media-player'],
                activeTabId: 'media-player',
                size: 50,
              },
              {
                type: 'panel-group',
                id: 'navigation-list',
                tabs: ['chunk-navigation-vertical', 'navigation'],
                activeTabId: 'chunk-navigation-vertical',
                size: 25,
              },
              {
                id: 'right-tools',
                orientation: 'vertical',
                children: [
                  {
                    type: 'panel-group',
                    id: 'transcript-notes',
                    tabs: ['transcript', 'notes'],
                    activeTabId: 'notes',
                    size: 60,
                  },
                  {
                    type: 'panel-group',
                    id: 'progress-stats',
                    tabs: ['progress'],
                    activeTabId: 'progress',
                    size: 40,
                  },
                ],
                size: 25,
              },
            ],
            size: 75,
          },
          {
            type: 'panel-group',
            id: 'timeline-reference',
            tabs: ['timeline', 'chunk-navigation-horizontal'],
            activeTabId: 'timeline',
            size: 25,
          },
        ],
      }),
      visiblePanels: ['media-player', 'chunk-navigation-vertical', 'navigation', 'transcript', 'notes', 'progress', 'timeline', 'chunk-navigation-horizontal'],
      panelGroups: {
        'media-player-area': {
          panels: ['media-player'],
          activePanel: 'media-player',
        },
        'navigation-list': {
          panels: ['chunk-navigation-vertical', 'navigation'],
          activePanel: 'chunk-navigation-vertical',
        },
        'transcript-notes': {
          panels: ['transcript', 'notes'],
          activePanel: 'notes',
        },
        'progress-stats': {
          panels: ['progress'],
          activePanel: 'progress',
        },
        'timeline-reference': {
          panels: ['timeline', 'chunk-navigation-horizontal'],
          activePanel: 'timeline',
        },
      },
    },
  },
];

async function seedLearningPresets() {
  console.log('🌱 Seeding learning-focused layout presets...');

  try {
    for (const preset of learningPresets) {
      // Check if preset already exists
      const existing = await prisma.layoutPreset.findFirst({
        where: { id: preset.id },
      });

      if (existing) {
        console.log(`✓ Preset "${preset.name}" already exists, skipping...`);
        continue;
      }

      // Create the preset
      const created = await prisma.layoutPreset.create({
        data: {
          id: preset.id,
          name: preset.name,
          description: preset.description,
          presetType: preset.presetType,
          category: preset.category,
          supportedContentTypes: preset.supportedContentTypes,
          useCase: preset.useCase,
          difficulty: preset.difficulty,
          isPublic: preset.isPublic,
          isResponsive: preset.isResponsive,
          desktopConfig: preset.desktopConfig,
          zoneConfig: preset.desktopConfig.zoneConfig,
          visiblePanels: preset.desktopConfig.visiblePanels,
          panelGroups: preset.desktopConfig.panelGroups,
          // No createdBy for system presets
          createdBy: null,
        },
      });

      console.log(`✅ Created preset: ${created.name}`);
    }

    console.log('\n🎉 Successfully seeded all learning-focused presets!');
    console.log('\nThese presets are now available as SYSTEM presets that:');
    console.log('- Regular users can use but cannot edit or delete');
    console.log('- Only super admins can modify or remove');
    console.log('- Are visible to all users by default');

  } catch (error) {
    console.error('❌ Error seeding presets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedLearningPresets()
  .catch((error) => {
    console.error('Failed to seed presets:', error);
    process.exit(1);
  });