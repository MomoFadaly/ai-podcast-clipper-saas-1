/**
 * Content Types Tests
 * Tests for content type detection and management
 */

import { describe, it, expect } from 'vitest';
import {
  ContentTypes,
  CONTENT_TYPE_REGISTRY,
  detectContentType,
  getContentTypeDefinition,
  contentTypeSupportsFeature,
  getContentTypesByFeature,
  getCorePanels,
  getAvailablePanels,
  getOptionalPanels,
  getDefaultLayout,
  isPanelSupportedByContentType,
  getContentTypeCapabilities,
} from '../../lib/content-types';

describe('Content Types', () => {
  describe('ContentTypes constants', () => {
    it('should define all content types', () => {
      expect(ContentTypes.VIDEO).toBe('video');
      expect(ContentTypes.AUDIO).toBe('audio');
      expect(ContentTypes.TEXT).toBe('text');
      expect(ContentTypes.PDF).toBe('pdf');
    });
  });

  describe('CONTENT_TYPE_REGISTRY', () => {
    it('should contain all content type definitions', () => {
      expect(CONTENT_TYPE_REGISTRY.video).toBeDefined();
      expect(CONTENT_TYPE_REGISTRY.audio).toBeDefined();
      expect(CONTENT_TYPE_REGISTRY.text).toBeDefined();
      expect(CONTENT_TYPE_REGISTRY.pdf).toBeDefined();
    });

    it('should have valid structure for each content type', () => {
      Object.values(CONTENT_TYPE_REGISTRY).forEach(definition => {
        expect(definition.id).toBeDefined();
        expect(definition.name).toBeDefined();
        expect(definition.icon).toBeDefined();
        expect(definition.corePanels).toBeInstanceOf(Array);
        expect(definition.availablePanels).toBeInstanceOf(Array);
        expect(definition.defaultLayout).toBeDefined();
        expect(definition.features).toBeDefined();
      });
    });
  });

  describe('detectContentType', () => {
    it('should detect video files by extension', () => {
      expect(detectContentType('video.mp4')).toBe('video');
      expect(detectContentType('movie.webm')).toBe('video');
      expect(detectContentType('clip.avi')).toBe('video');
    });

    it('should detect audio files by extension', () => {
      expect(detectContentType('song.mp3')).toBe('audio');
      expect(detectContentType('podcast.wav')).toBe('audio');
      expect(detectContentType('music.flac')).toBe('audio');
    });

    it('should detect PDF files', () => {
      expect(detectContentType('document.pdf')).toBe('pdf');
      expect(detectContentType('report.PDF')).toBe('pdf');
    });

    it('should detect text files', () => {
      expect(detectContentType('readme.txt')).toBe('text');
      expect(detectContentType('notes.md')).toBe('text');
      expect(detectContentType('document.docx')).toBe('text');
    });

    it('should use MIME type when provided', () => {
      expect(detectContentType('unknown.xyz', 'video/mp4')).toBe('video');
      expect(detectContentType('unknown.xyz', 'audio/mpeg')).toBe('audio');
      expect(detectContentType('unknown.xyz', 'application/pdf')).toBe('pdf');
      expect(detectContentType('unknown.xyz', 'text/plain')).toBe('text');
    });

    it('should default to video for unknown types', () => {
      expect(detectContentType('unknown.xyz')).toBe('video');
    });
  });

  describe('getContentTypeDefinition', () => {
    it('should return correct definition for each type', () => {
      const videoDef = getContentTypeDefinition('video');
      expect(videoDef.id).toBe('video');
      expect(videoDef.name).toBe('Video');

      const audioDef = getContentTypeDefinition('audio');
      expect(audioDef.id).toBe('audio');
      expect(audioDef.name).toBe('Audio');
    });

    it('should throw for unknown content type', () => {
      expect(() => getContentTypeDefinition('unknown' as any)).toThrow();
    });
  });

  describe('contentTypeSupportsFeature', () => {
    it('should check video features correctly', () => {
      expect(contentTypeSupportsFeature('video', 'hasTimeline')).toBe(true);
      expect(contentTypeSupportsFeature('video', 'hasTranscript')).toBe(true);
    });

    it('should check PDF features correctly', () => {
      expect(contentTypeSupportsFeature('pdf', 'hasSearch')).toBe(true);
      expect(contentTypeSupportsFeature('pdf', 'hasTranscript')).toBe(false);
    });
  });

  describe('getContentTypesByFeature', () => {
    it('should return types that support timeline', () => {
      const types = getContentTypesByFeature('hasTimeline');
      expect(types).toContain('video');
      expect(types).toContain('audio');
      expect(types).not.toContain('pdf');
    });

    it('should return types that support search', () => {
      const types = getContentTypesByFeature('hasSearch');
      expect(types).toContain('video');
      expect(types).toContain('text');
      expect(types).toContain('pdf');
    });
  });

  describe('panel management functions', () => {
    it('should return correct core panels', () => {
      expect(getCorePanels('video')).toEqual(['media-player']);
      expect(getCorePanels('text')).toEqual(['text-reader']);
      expect(getCorePanels('pdf')).toEqual(['pdf-viewer']);
    });

    it('should return correct available panels', () => {
      const videoPanels = getAvailablePanels('video');
      expect(videoPanels).toContain('media-player');
      expect(videoPanels).toContain('transcript');
      expect(videoPanels).toContain('notes');

      const textPanels = getAvailablePanels('text');
      expect(textPanels).toContain('text-reader');
      expect(textPanels).toContain('notes');
    });

    it('should calculate optional panels correctly', () => {
      const optionalPanels = getOptionalPanels('video');
      expect(optionalPanels).not.toContain('media-player'); // Core panel
      expect(optionalPanels).toContain('transcript');
      expect(optionalPanels).toContain('notes');
    });

    it('should validate panel support', () => {
      expect(isPanelSupportedByContentType('media-player', 'video')).toBe(true);
      expect(isPanelSupportedByContentType('media-player', 'text')).toBe(false);
      expect(isPanelSupportedByContentType('text-reader', 'text')).toBe(true);
    });
  });

  describe('getDefaultLayout', () => {
    it('should return correct default layouts', () => {
      expect(getDefaultLayout('video')).toBe('video-focus');
      expect(getDefaultLayout('audio')).toBe('audio-study');
      expect(getDefaultLayout('text')).toBe('reading-mode');
      expect(getDefaultLayout('pdf')).toBe('document-mode');
    });
  });

  describe('getContentTypeCapabilities', () => {
    it('should return comprehensive capabilities', () => {
      const videoCaps = getContentTypeCapabilities('video');
      expect(videoCaps.name).toBe('Video');
      expect(videoCaps.icon).toBeDefined();
      expect(videoCaps.corePanelCount).toBe(1);
      expect(videoCaps.totalPanelCount).toBeGreaterThan(1);
      expect(videoCaps.hasAdvancedFeatures).toBe(true);
    });
  });
});