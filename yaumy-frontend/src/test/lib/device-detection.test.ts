/**
 * Device Detection Tests
 * Tests for device detection and responsive utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDeviceBreakpoint,
  getDeviceLayoutConstraints,
  isTouchDevice,
  hasHoverCapability,
  prefersReducedMotion,
  getDevicePixelRatio,
  getScreenResolution,
  getViewportSize,
  breakpointSupportsFeature,
  getOptimalPanelArrangement,
  DEVICE_BREAKPOINTS,
  MEDIA_QUERIES,
  type DeviceBreakpoint,
  type DeviceLayoutConstraints,
} from '../../lib/device-detection';

// Store original values
const originalWindow = global.window;
const originalNavigator = global.navigator;

// Helper to set window properties
const setWindowProperty = (property: string, value: any) => {
  Object.defineProperty(window, property, {
    value,
    writable: true,
    configurable: true,
  });
};

// Helper to set navigator properties  
const setNavigatorProperty = (property: string, value: any) => {
  Object.defineProperty(navigator, property, {
    value,
    writable: true,
    configurable: true,
  });
};

describe('Device Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset window properties
    setWindowProperty('innerWidth', 1920);
    setWindowProperty('innerHeight', 1080);
    setWindowProperty('devicePixelRatio', 1);
    
    // Mock screen properties
    Object.defineProperty(window, 'screen', {
      value: {
        width: 1920,
        height: 1080,
      },
      writable: true,
      configurable: true,
    });
    
    // Mock matchMedia
    window.matchMedia = vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any));
    
    // Reset navigator properties
    setNavigatorProperty('maxTouchPoints', 0);
    if ('msMaxTouchPoints' in navigator) {
      setNavigatorProperty('msMaxTouchPoints', 0);
    }
    
    // Ensure ontouchstart is not defined
    if ('ontouchstart' in window) {
      delete (window as any).ontouchstart;
    }
  });

  describe('getDeviceBreakpoint', () => {
    it('should return correct breakpoints', () => {
      expect(getDeviceBreakpoint(320)).toBe('MOBILE');
      expect(getDeviceBreakpoint(640)).toBe('MOBILE');
      expect(getDeviceBreakpoint(768)).toBe('TABLET');
      expect(getDeviceBreakpoint(1024)).toBe('DESKTOP');
      expect(getDeviceBreakpoint(1280)).toBe('DESKTOP');
      expect(getDeviceBreakpoint(1440)).toBe('LARGE');
      expect(getDeviceBreakpoint(1920)).toBe('LARGE');
      expect(getDeviceBreakpoint(2560)).toBe('ULTRAWIDE');
    });

    it('should return DESKTOP as default fallback', () => {
      expect(getDeviceBreakpoint(-1)).toBe('DESKTOP');
    });
  });

  describe('getDeviceLayoutConstraints', () => {
    it('should return mobile constraints', () => {
      const constraints = getDeviceLayoutConstraints('MOBILE');
      
      expect(constraints.minPanelWidth).toBe(280);
      expect(constraints.maxPanels).toBe(2);
      expect(constraints.preferTabs).toBe(true);
      expect(constraints.allowSplitPanels).toBe(false);
      expect(constraints.allowFloatingPanels).toBe(false);
      expect(constraints.touchOptimized).toBe(true);
      expect(constraints.gesturesEnabled).toBe(true);
    });

    it('should return tablet constraints', () => {
      const constraints = getDeviceLayoutConstraints('TABLET');
      
      expect(constraints.minPanelWidth).toBe(320);
      expect(constraints.maxPanels).toBe(3);
      expect(constraints.preferTabs).toBe(false);
      expect(constraints.allowSplitPanels).toBe(true);
      expect(constraints.allowFloatingPanels).toBe(false);
      expect(constraints.touchOptimized).toBe(true);
      expect(constraints.gesturesEnabled).toBe(true);
    });

    it('should return desktop constraints', () => {
      const constraints = getDeviceLayoutConstraints('DESKTOP');
      
      expect(constraints.minPanelWidth).toBe(250);
      expect(constraints.maxPanels).toBe(4);
      expect(constraints.preferTabs).toBe(false);
      expect(constraints.allowSplitPanels).toBe(true);
      expect(constraints.allowFloatingPanels).toBe(true);
      expect(constraints.touchOptimized).toBe(false);
      expect(constraints.gesturesEnabled).toBe(false);
    });

    it('should return large screen constraints', () => {
      const constraints = getDeviceLayoutConstraints('LARGE');
      
      expect(constraints.minPanelWidth).toBe(300);
      expect(constraints.maxPanels).toBe(6);
      expect(constraints.preferTabs).toBe(false);
      expect(constraints.allowSplitPanels).toBe(true);
      expect(constraints.allowFloatingPanels).toBe(true);
      expect(constraints.touchOptimized).toBe(false);
      expect(constraints.gesturesEnabled).toBe(false);
    });

    it('should return ultrawide constraints', () => {
      const constraints = getDeviceLayoutConstraints('ULTRAWIDE');
      
      expect(constraints.minPanelWidth).toBe(350);
      expect(constraints.maxPanels).toBe(8);
      expect(constraints.preferTabs).toBe(false);
      expect(constraints.allowSplitPanels).toBe(true);
      expect(constraints.allowFloatingPanels).toBe(true);
      expect(constraints.touchOptimized).toBe(false);
      expect(constraints.gesturesEnabled).toBe(false);
    });
  });

  describe('isTouchDevice', () => {
    it('should detect touch capability', () => {
      expect(isTouchDevice()).toBe(false);
      
      setNavigatorProperty('maxTouchPoints', 5);
      expect(isTouchDevice()).toBe(true);
    });

    it('should detect touch from msMaxTouchPoints', () => {
      setNavigatorProperty('maxTouchPoints', 0);
      setNavigatorProperty('msMaxTouchPoints', 5);
      expect(isTouchDevice()).toBe(true);
    });

    it('should detect touch from ontouchstart', () => {
      setNavigatorProperty('maxTouchPoints', 0);
      if ('msMaxTouchPoints' in navigator) {
        setNavigatorProperty('msMaxTouchPoints', 0);
      }
      // @ts-ignore
      window.ontouchstart = () => {};
      expect(isTouchDevice()).toBe(true);
      // @ts-ignore
      delete window.ontouchstart;
    });
  });

  describe('hasHoverCapability', () => {
    it('should detect hover capability', () => {
      window.matchMedia = vi.fn((query: string) => ({
        matches: query === '(hover: hover)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as any));
      
      expect(hasHoverCapability()).toBe(true);
    });

    it('should detect no hover capability', () => {
      window.matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as any));
      
      expect(hasHoverCapability()).toBe(false);
    });
  });

  describe('prefersReducedMotion', () => {
    it('should detect reduced motion preference', () => {
      window.matchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as any));
      
      expect(prefersReducedMotion()).toBe(true);
    });

    it('should detect no reduced motion preference', () => {
      window.matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as any));
      
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('getDevicePixelRatio', () => {
    it('should return device pixel ratio', () => {
      expect(getDevicePixelRatio()).toBe(1);
      
      setWindowProperty('devicePixelRatio', 2);
      expect(getDevicePixelRatio()).toBe(2);
    });
  });

  describe('getScreenResolution', () => {
    it('should return screen resolution string', () => {
      expect(getScreenResolution()).toBe('1920x1080');
      
      // Update screen properties
      Object.defineProperty(window, 'screen', {
        value: {
          width: 2560,
          height: 1440,
        },
        writable: true,
        configurable: true,
      });
      expect(getScreenResolution()).toBe('2560x1440');
    });
  });

  describe('getViewportSize', () => {
    it('should return viewport size string', () => {
      expect(getViewportSize()).toBe('1920x1080');
      
      setWindowProperty('innerWidth', 1024);
      setWindowProperty('innerHeight', 768);
      expect(getViewportSize()).toBe('1024x768');
    });
  });

  describe('breakpointSupportsFeature', () => {
    it('should check boolean features', () => {
      expect(breakpointSupportsFeature('MOBILE', 'preferTabs')).toBe(true);
      expect(breakpointSupportsFeature('MOBILE', 'allowFloatingPanels')).toBe(false);
      expect(breakpointSupportsFeature('DESKTOP', 'allowFloatingPanels')).toBe(true);
    });

    it('should check numeric features', () => {
      expect(breakpointSupportsFeature('MOBILE', 'maxPanels')).toBe(true);
      expect(breakpointSupportsFeature('DESKTOP', 'minPanelWidth')).toBe(true);
    });
  });

  describe('getOptimalPanelArrangement', () => {
    it('should recommend single panel layout', () => {
      const result = getOptimalPanelArrangement('DESKTOP', 1);
      expect(result.layout).toBe('split');
      expect(result.arrangement).toBe('single');
    });

    it('should recommend tabs for mobile with multiple panels', () => {
      const result = getOptimalPanelArrangement('MOBILE', 3);
      expect(result.layout).toBe('tabs');
      expect(result.arrangement).toBe('tabbed');
    });

    it('should recommend split layout for 2 panels', () => {
      const result = getOptimalPanelArrangement('DESKTOP', 2);
      expect(result.layout).toBe('split');
      expect(result.arrangement).toBe('horizontal');
    });

    it('should recommend vertical split for mobile with 2 panels', () => {
      const result = getOptimalPanelArrangement('MOBILE', 2);
      expect(result.layout).toBe('tabs'); // Mobile prefers tabs
      expect(result.arrangement).toBe('tabbed');
    });

    it('should recommend grid layout for 3-4 panels', () => {
      const result = getOptimalPanelArrangement('DESKTOP', 3);
      expect(result.layout).toBe('grid');
      expect(result.arrangement).toBe('2x2');
    });

    it('should recommend complex grid for many panels', () => {
      const result = getOptimalPanelArrangement('LARGE', 6);
      expect(result.layout).toBe('grid');
      expect(result.arrangement).toBe('complex');
    });
  });

  describe('DEVICE_BREAKPOINTS', () => {
    it('should have correct breakpoint definitions', () => {
      expect(DEVICE_BREAKPOINTS.MOBILE.max).toBe(767);
      expect(DEVICE_BREAKPOINTS.TABLET.min).toBe(768);
      expect(DEVICE_BREAKPOINTS.TABLET.max).toBe(1023);
      expect(DEVICE_BREAKPOINTS.DESKTOP.min).toBe(1024);
      expect(DEVICE_BREAKPOINTS.ULTRAWIDE.min).toBe(2560);
    });
  });

  describe('MEDIA_QUERIES', () => {
    it('should have correct media query strings', () => {
      expect(MEDIA_QUERIES.mobile).toBe('(max-width: 767px)');
      expect(MEDIA_QUERIES.tabletAndUp).toBe('(min-width: 768px)');
      expect(MEDIA_QUERIES.touch).toBe('(hover: none) and (pointer: coarse)');
      expect(MEDIA_QUERIES.hover).toBe('(hover: hover) and (pointer: fine)');
    });
  });
});