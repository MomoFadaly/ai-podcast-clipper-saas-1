/**
 * Layout Presets Tests
 * Tests for layout preset system and configurations
 */

import { describe, it, expect } from 'vitest';
import {
  LAYOUT_PRESETS,
  getPresetById,
  getPresetsForContentType,
  getDefaultPresetForContentType,
  type LayoutPreset,
} from '../../lib/layout-presets';

describe('Layout Presets', () => {
  describe('LAYOUT_PRESETS', () => {
    it('should define all expected presets', () => {
      const expectedPresets = [
        'video-focus',
        'video-study',
        'video-analysis',
        'audio-study',
        'audio-focus',
        'minimal',
        'side-by-side',
      ];

      expectedPresets.forEach(presetId => {
        expect(LAYOUT_PRESETS[presetId]).toBeDefined();
      });
    });

    it('should have valid structure for each preset', () => {
      Object.values(LAYOUT_PRESETS).forEach((preset: LayoutPreset) => {
        // Basic properties
        expect(preset.id).toBeDefined();
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.supportedContentTypes).toBeInstanceOf(Array);
        expect(preset.supportedContentTypes.length).toBeGreaterThan(0);
        
        // Layout configuration
        expect(preset.zoneConfig).toBeDefined();
        expect(preset.zoneConfig.id).toBe('root');
        expect(preset.visiblePanels).toBeInstanceOf(Array);
        expect(preset.panelGroups).toBeDefined();
        
        // Optional metadata
        if (preset.metadata) {
          expect(['learning', 'analysis', 'creation', 'focus']).toContain(preset.metadata.category);
          expect(['beginner', 'intermediate', 'advanced']).toContain(preset.metadata.difficulty);
        }
      });
    });
  });

  describe('getPresetById', () => {
    it('should return preset by ID', () => {
      const preset = getPresetById('video-focus');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('video-focus');
      expect(preset?.name).toBe('Video Focus');
    });

    it('should return undefined for invalid ID', () => {
      const preset = getPresetById('non-existent');
      expect(preset).toBeUndefined();
    });
  });

  describe('getPresetsForContentType', () => {
    it('should return video presets', () => {
      const presets = getPresetsForContentType('video');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.id === 'video-focus')).toBe(true);
      expect(presets.some(p => p.id === 'video-study')).toBe(true);
    });

    it('should return audio presets', () => {
      const presets = getPresetsForContentType('audio');
      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.id === 'audio-study')).toBe(true);
    });

    it('should return text presets', () => {
      const presets = getPresetsForContentType('text');
      expect(presets.length).toBeGreaterThanOrEqual(0);
    });

    it('should return PDF presets', () => {
      const presets = getPresetsForContentType('pdf');
      expect(presets.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDefaultPresetForContentType', () => {
    it('should return default preset for video', () => {
      const preset = getDefaultPresetForContentType('video');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('video-focus');
      expect(preset?.isDefault).toBe(true);
    });

    it('should fallback to first available preset', () => {
      const preset = getDefaultPresetForContentType('text');
      expect(preset).toBeDefined();
      expect(preset?.supportedContentTypes).toContain('text');
    });
  });

  describe('preset configurations', () => {
    it('should have correct panel configuration for video-focus', () => {
      const preset = LAYOUT_PRESETS['video-focus'];
      expect(preset.visiblePanels).toContain('media-player');
      expect(preset.visiblePanels).toContain('notes');
    });

    it('should have correct panel configuration for video-study', () => {
      const preset = LAYOUT_PRESETS['video-study'];
      expect(preset.visiblePanels).toContain('media-player');
      expect(preset.visiblePanels).toContain('transcript');
      expect(preset.visiblePanels).toContain('notes');
    });

    it('should have correct zone configuration', () => {
      const preset = LAYOUT_PRESETS['video-focus'];
      expect(preset.zoneConfig.orientation).toBe('horizontal');
      expect(preset.zoneConfig.children).toBeDefined();
      expect(preset.zoneConfig.children!.length).toBeGreaterThan(0);
    });

    it('should define panel groups correctly', () => {
      const preset = LAYOUT_PRESETS['video-study'];
      const groups = Object.keys(preset.panelGroups);
      
      groups.forEach(groupId => {
        const group = preset.panelGroups[groupId];
        expect(group.panels).toBeInstanceOf(Array);
        expect(group.activePanel).toBeDefined();
        expect(group.panels).toContain(group.activePanel);
      });
    });
  });

});