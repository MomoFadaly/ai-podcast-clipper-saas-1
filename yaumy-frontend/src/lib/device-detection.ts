/**
 * Device Detection and Breakpoint Management
 * 
 * Handles device detection, responsive breakpoints, and device-specific
 * layout configuration for the Chunkwise layout system.
 */

import { useState, useEffect, useMemo } from 'react';

/**
 * Device breakpoint definitions
 */
export const DEVICE_BREAKPOINTS = {
  MOBILE: { min: 0, max: 767, name: 'mobile' as const },
  TABLET: { min: 768, max: 1023, name: 'tablet' as const },
  DESKTOP: { min: 1024, max: 1439, name: 'desktop' as const },
  LARGE: { min: 1440, max: 2559, name: 'large' as const },
  ULTRAWIDE: { min: 2560, max: Infinity, name: 'ultrawide' as const },
} as const;

/**
 * Device breakpoint type
 */
export type DeviceBreakpoint = keyof typeof DEVICE_BREAKPOINTS;

/**
 * Device information interface
 */
export interface DeviceInfo {
  breakpoint: DeviceBreakpoint;
  width: number;
  height: number;
  aspectRatio: number;
  pixelRatio: number;
  isTouchDevice: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  hasHover: boolean;
  prefersReducedMotion: boolean;
  screenResolution: string;
  viewportSize: string;
}

/**
 * Layout constraints based on device type
 */
export interface DeviceLayoutConstraints {
  maxPanels: number;
  preferTabs: boolean;
  allowSplitPanels: boolean;
  allowFloatingPanels: boolean;
  minPanelWidth: number;
  minPanelHeight: number;
  touchOptimized: boolean;
  gesturesEnabled: boolean;
}

/**
 * Get current device breakpoint from width
 */
export function getDeviceBreakpoint(width: number): DeviceBreakpoint {
  for (const [breakpoint, config] of Object.entries(DEVICE_BREAKPOINTS)) {
    if (width >= config.min && width <= config.max) {
      return breakpoint as DeviceBreakpoint;
    }
  }
  return 'DESKTOP'; // Default fallback
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/**
 * Check if device has hover capability
 */
export function hasHoverCapability(): boolean {
  if (typeof window === 'undefined') return true;
  
  return window.matchMedia('(hover: hover)').matches;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get device pixel ratio
 */
export function getDevicePixelRatio(): number {
  if (typeof window === 'undefined') return 1;
  
  return window.devicePixelRatio || 1;
}

/**
 * Get screen resolution string
 */
export function getScreenResolution(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  const { screen } = window;
  return `${screen.width}x${screen.height}`;
}

/**
 * Get viewport size string
 */
export function getViewportSize(): string {
  if (typeof window === 'undefined') return 'unknown';
  
  return `${window.innerWidth}x${window.innerHeight}`;
}

/**
 * Hook for responsive device detection
 */
export function useDeviceInfo(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'DESKTOP',
        width: 1024,
        height: 768,
        aspectRatio: 1024 / 768,
        pixelRatio: 1,
        isTouchDevice: false,
        isPortrait: false,
        isLandscape: true,
        hasHover: true,
        prefersReducedMotion: false,
        screenResolution: 'unknown',
        viewportSize: 'unknown',
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    
    return {
      breakpoint: getDeviceBreakpoint(width),
      width,
      height,
      aspectRatio: width / height,
      pixelRatio: getDevicePixelRatio(),
      isTouchDevice: isTouchDevice(),
      isPortrait: height > width,
      isLandscape: width > height,
      hasHover: hasHoverCapability(),
      prefersReducedMotion: prefersReducedMotion(),
      screenResolution: getScreenResolution(),
      viewportSize: getViewportSize(),
    };
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        breakpoint: getDeviceBreakpoint(width),
        width,
        height,
        aspectRatio: width / height,
        pixelRatio: getDevicePixelRatio(),
        isTouchDevice: isTouchDevice(),
        isPortrait: height > width,
        isLandscape: width > height,
        hasHover: hasHoverCapability(),
        prefersReducedMotion: prefersReducedMotion(),
        screenResolution: getScreenResolution(),
        viewportSize: getViewportSize(),
      });
    };

    // Initial update
    updateDeviceInfo();

    // Add event listeners
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    // Listen for reduced motion changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
      motionQuery.removeEventListener('change', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

/**
 * Get layout constraints for a device breakpoint
 */
export function getDeviceLayoutConstraints(breakpoint: DeviceBreakpoint): DeviceLayoutConstraints {
  switch (breakpoint) {
    case 'MOBILE':
      return {
        maxPanels: 2,
        preferTabs: true,
        allowSplitPanels: false,
        allowFloatingPanels: false,
        minPanelWidth: 280,
        minPanelHeight: 200,
        touchOptimized: true,
        gesturesEnabled: true,
      };

    case 'TABLET':
      return {
        maxPanels: 3,
        preferTabs: false,
        allowSplitPanels: true,
        allowFloatingPanels: false,
        minPanelWidth: 320,
        minPanelHeight: 240,
        touchOptimized: true,
        gesturesEnabled: true,
      };

    case 'DESKTOP':
      return {
        maxPanels: 4,
        preferTabs: false,
        allowSplitPanels: true,
        allowFloatingPanels: true,
        minPanelWidth: 250,
        minPanelHeight: 200,
        touchOptimized: false,
        gesturesEnabled: false,
      };

    case 'LARGE':
      return {
        maxPanels: 6,
        preferTabs: false,
        allowSplitPanels: true,
        allowFloatingPanels: true,
        minPanelWidth: 300,
        minPanelHeight: 250,
        touchOptimized: false,
        gesturesEnabled: false,
      };

    case 'ULTRAWIDE':
      return {
        maxPanels: 8,
        preferTabs: false,
        allowSplitPanels: true,
        allowFloatingPanels: true,
        minPanelWidth: 350,
        minPanelHeight: 300,
        touchOptimized: false,
        gesturesEnabled: false,
      };

    default:
      return getDeviceLayoutConstraints('DESKTOP');
  }
}

/**
 * Hook for device layout constraints
 */
export function useDeviceLayoutConstraints(): DeviceLayoutConstraints {
  const { breakpoint } = useDeviceInfo();
  
  return useMemo(() => getDeviceLayoutConstraints(breakpoint), [breakpoint]);
}

/**
 * Check if breakpoint supports feature
 */
export function breakpointSupportsFeature(
  breakpoint: DeviceBreakpoint,
  feature: keyof DeviceLayoutConstraints
): boolean {
  const constraints = getDeviceLayoutConstraints(breakpoint);
  const value = constraints[feature];
  
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'number') {
    return value > 0;
  }
  
  return false;
}

/**
 * Get optimal panel arrangement for device
 */
export function getOptimalPanelArrangement(
  breakpoint: DeviceBreakpoint,
  panelCount: number
): {
  layout: 'tabs' | 'split' | 'grid';
  arrangement: string;
  recommendation: string;
} {
  const constraints = getDeviceLayoutConstraints(breakpoint);
  
  if (panelCount <= 1) {
    return {
      layout: 'split',
      arrangement: 'single',
      recommendation: 'Single panel layout',
    };
  }
  
  if (constraints.preferTabs || panelCount > constraints.maxPanels) {
    return {
      layout: 'tabs',
      arrangement: 'tabbed',
      recommendation: 'Use tabs to save space and improve mobile experience',
    };
  }
  
  if (panelCount === 2) {
    return {
      layout: 'split',
      arrangement: breakpoint === 'MOBILE' ? 'vertical' : 'horizontal',
      recommendation: 'Side-by-side layout for optimal viewing',
    };
  }
  
  if (panelCount <= 4) {
    return {
      layout: 'grid',
      arrangement: '2x2',
      recommendation: 'Grid layout for multiple panels',
    };
  }
  
  return {
    layout: 'grid',
    arrangement: 'complex',
    recommendation: 'Complex grid layout for power users',
  };
}

/**
 * CSS media queries for breakpoints
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${DEVICE_BREAKPOINTS.MOBILE.max}px)`,
  tablet: `(min-width: ${DEVICE_BREAKPOINTS.TABLET.min}px) and (max-width: ${DEVICE_BREAKPOINTS.TABLET.max}px)`,
  desktop: `(min-width: ${DEVICE_BREAKPOINTS.DESKTOP.min}px) and (max-width: ${DEVICE_BREAKPOINTS.DESKTOP.max}px)`,
  large: `(min-width: ${DEVICE_BREAKPOINTS.LARGE.min}px) and (max-width: ${DEVICE_BREAKPOINTS.LARGE.max}px)`,
  ultrawide: `(min-width: ${DEVICE_BREAKPOINTS.ULTRAWIDE.min}px)`,
  
  // Utility queries
  mobileAndUp: `(min-width: ${DEVICE_BREAKPOINTS.MOBILE.min}px)`,
  tabletAndUp: `(min-width: ${DEVICE_BREAKPOINTS.TABLET.min}px)`,
  desktopAndUp: `(min-width: ${DEVICE_BREAKPOINTS.DESKTOP.min}px)`,
  largeAndUp: `(min-width: ${DEVICE_BREAKPOINTS.LARGE.min}px)`,
  
  // Feature queries
  touch: '(hover: none) and (pointer: coarse)',
  hover: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
} as const;