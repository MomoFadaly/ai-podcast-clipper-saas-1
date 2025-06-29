/**
 * Device-Aware Layout Service
 * 
 * Manages device-specific layout resolution, combining database preferences
 * with responsive design principles for optimal user experience.
 */

import { layoutPersistenceService } from './layout-persistence-service';
import {
  // getUserLayoutPreference,
  // saveUserLayoutPreference,
  // type UserLayoutPreferenceInput,
} from '~/actions/user-layout-preferences';
import { 
  getDeviceLayoutConstraints,
  type DeviceBreakpoint,
  type DeviceInfo,
  type DeviceLayoutConstraints 
} from './device-detection';
import { 
  getResponsivePresetConfig,
  getDefaultResponsivePreset,
  type ResponsiveLayoutPreset,
} from './responsive-layout-presets';
import type { ContentType } from '~/components/panels/types';
import { ContentTypes } from './content-types';

/**
 * Device-aware resolved layout configuration
 */
export interface DeviceAwareLayoutConfig {
  deviceBreakpoint: DeviceBreakpoint;
  deviceConstraints: DeviceLayoutConstraints;
  zoneConfig: any;
  panelConfig: any;
  visiblePanels: string[];
  panelGroups: any;
  adaptiveRules: {
    hideOnSmallScreen: string[];
    collapseToTabs: string[];
    minimumSizes: Record<string, { width: number; height: number }>;
  };
  userPreferences: {
    autoSaveLayouts: boolean;
    enableAnimations: boolean;
    compactMode: boolean;
    autoHideUnusedPanels: boolean;
    enableTouchGestures: boolean;
    preferTabsOverPanels: boolean;
    hideInactivePanels: boolean;
  };
  source: 'responsive-preset' | 'user-device-preference' | 'system-default' | 'adaptive';
  responsivePreset?: ResponsiveLayoutPreset;
}

/**
 * Layout adaptation options
 */
export interface LayoutAdaptationOptions {
  respectUserPreferences: boolean;
  allowAutomaticAdaptation: boolean;
  preserveUserCustomizations: boolean;
  enableGracefulDegradation: boolean;
}

/**
 * Device-aware layout service
 */
export class DeviceAwareLayoutService {
  private static instance: DeviceAwareLayoutService;
  
  // Cache for device-specific configurations
  private deviceConfigCache = new Map<string, DeviceAwareLayoutConfig>();
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes (shorter for responsiveness)

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): DeviceAwareLayoutService {
    if (!DeviceAwareLayoutService.instance) {
      DeviceAwareLayoutService.instance = new DeviceAwareLayoutService();
    }
    return DeviceAwareLayoutService.instance;
  }

  /**
   * Resolve layout configuration for a specific device and content type
   */
  async resolveDeviceAwareLayout(
    contentType: ContentType,
    deviceInfo: DeviceInfo,
    options: LayoutAdaptationOptions = {
      respectUserPreferences: true,
      allowAutomaticAdaptation: true,
      preserveUserCustomizations: true,
      enableGracefulDegradation: true,
    }
  ): Promise<DeviceAwareLayoutConfig> {
    const { breakpoint } = deviceInfo;
    const cacheKey = `${contentType}-${breakpoint}-${JSON.stringify(options)}`;

    // Check cache
    if (this.isCacheValid() && this.deviceConfigCache.has(cacheKey)) {
      return this.deviceConfigCache.get(cacheKey)!;
    }

    // Get device constraints
    const deviceConstraints = getDeviceLayoutConstraints(breakpoint);

    try {

      // Try to get user's device-specific preferences
      let resolvedConfig: DeviceAwareLayoutConfig | null = null;

      if (options.respectUserPreferences) {
        resolvedConfig = await this.getUserDevicePreferences(
          contentType,
          breakpoint,
          deviceConstraints
        );
      }

      // Fall back to responsive presets
      if (!resolvedConfig && options.allowAutomaticAdaptation) {
        resolvedConfig = this.getResponsivePresetLayout(
          contentType,
          breakpoint,
          deviceConstraints
        );
      }

      // Final fallback to adaptive layout
      if (!resolvedConfig) {
        resolvedConfig = this.generateAdaptiveLayout(
          contentType,
          breakpoint,
          deviceConstraints
        );
      }

      // Apply device constraints and optimizations
      const optimizedConfig = this.optimizeForDevice(
        resolvedConfig,
        deviceInfo,
        options
      );

      // Cache the result
      this.deviceConfigCache.set(cacheKey, optimizedConfig);
      this.updateCacheTimestamp();

      return optimizedConfig;

    } catch (error) {
      console.error('Failed to resolve device-aware layout:', error);
      
      // Return fallback configuration
      return this.generateFallbackLayout(contentType, breakpoint, deviceConstraints);
    }
  }

  /**
   * Get user's device-specific preferences from database
   */
  private async getUserDevicePreferences(
    contentType: ContentType,
    deviceBreakpoint: DeviceBreakpoint,
    deviceConstraints: DeviceLayoutConstraints
  ): Promise<DeviceAwareLayoutConfig | null> {
    try {
      // This would call a new API endpoint for device-specific preferences
      // For now, we'll adapt the existing preference system
      const baseConfig = await layoutPersistenceService.getResolvedLayoutConfig(
        contentType,
        { includeCustomizations: true }
      );

      if (!baseConfig.preset && !baseConfig.zoneConfig) {
        return null;
      }

      return {
        deviceBreakpoint,
        deviceConstraints,
        zoneConfig: baseConfig.zoneConfig,
        panelConfig: baseConfig.panelConfig,
        visiblePanels: baseConfig.visiblePanels,
        panelGroups: baseConfig.panelGroups,
        adaptiveRules: {
          hideOnSmallScreen: [],
          collapseToTabs: [],
          minimumSizes: {},
        },
        userPreferences: {
          ...baseConfig.userPreferences,
          enableTouchGestures: true,
          preferTabsOverPanels: deviceBreakpoint === 'MOBILE',
          hideInactivePanels: deviceBreakpoint === 'MOBILE',
        },
        source: 'user-device-preference',
      };

    } catch (error) {
      console.error('Failed to get user device preferences:', error);
      return null;
    }
  }

  /**
   * Get layout from responsive presets
   */
  private getResponsivePresetLayout(
    contentType: ContentType,
    deviceBreakpoint: DeviceBreakpoint,
    deviceConstraints: DeviceLayoutConstraints
  ): DeviceAwareLayoutConfig | null {
    try {
      const defaultPreset = getDefaultResponsivePreset(contentType);
      if (!defaultPreset) return null;

      const deviceConfig = getResponsivePresetConfig(defaultPreset, deviceBreakpoint);

      return {
        deviceBreakpoint,
        deviceConstraints,
        zoneConfig: deviceConfig.zoneConfig,
        panelConfig: deviceConfig.panelConfig,
        visiblePanels: deviceConfig.visiblePanels,
        panelGroups: deviceConfig.panelGroups,
        adaptiveRules: {
          hideOnSmallScreen: deviceConfig.adaptiveRules?.hideOnSmallScreen || [],
          collapseToTabs: deviceConfig.adaptiveRules?.collapseToTabs || [],
          minimumSizes: deviceConfig.adaptiveRules?.minimumSizes || {},
        },
        userPreferences: {
          autoSaveLayouts: true,
          enableAnimations: !deviceConstraints.touchOptimized,
          compactMode: deviceBreakpoint === 'MOBILE',
          autoHideUnusedPanels: defaultPreset.adaptiveBehavior.autoHideUnusedPanels,
          enableTouchGestures: deviceConstraints.gesturesEnabled,
          preferTabsOverPanels: defaultPreset.adaptiveBehavior.preferTabsOnMobile && deviceBreakpoint === 'MOBILE',
          hideInactivePanels: deviceBreakpoint === 'MOBILE',
        },
        source: 'responsive-preset',
        responsivePreset: defaultPreset,
      };

    } catch (error) {
      console.error('Failed to get responsive preset layout:', error);
      return null;
    }
  }

  /**
   * Generate adaptive layout based on device constraints
   */
  private generateAdaptiveLayout(
    contentType: ContentType,
    deviceBreakpoint: DeviceBreakpoint,
    deviceConstraints: DeviceLayoutConstraints
  ): DeviceAwareLayoutConfig {
    // Determine core panels for content type
    const corePanels = this.getCorePanelsForContentType(contentType);
    const availablePanels = this.getAvailablePanelsForContentType(contentType);

    // Filter panels based on device constraints
    let visiblePanels = availablePanels.slice(0, deviceConstraints.maxPanels);

    // Always include core panels
    visiblePanels = [...new Set([...corePanels, ...visiblePanels])];

    // Generate zone configuration based on device
    const zoneConfig = this.generateZoneConfigForDevice(
      visiblePanels,
      deviceBreakpoint,
      deviceConstraints
    );

    return {
      deviceBreakpoint,
      deviceConstraints,
      zoneConfig,
      panelConfig: this.generatePanelConfig(visiblePanels, deviceConstraints),
      visiblePanels,
      panelGroups: this.generatePanelGroups(visiblePanels, deviceConstraints),
      adaptiveRules: {
        hideOnSmallScreen: deviceBreakpoint === 'MOBILE' ? availablePanels.slice(2) : [],
        collapseToTabs: deviceConstraints.preferTabs ? visiblePanels : [],
        minimumSizes: this.generateMinimumSizes(deviceConstraints),
      },
      userPreferences: {
        autoSaveLayouts: true,
        enableAnimations: !deviceConstraints.touchOptimized,
        compactMode: deviceBreakpoint === 'MOBILE',
        autoHideUnusedPanels: deviceBreakpoint === 'MOBILE',
        enableTouchGestures: deviceConstraints.gesturesEnabled,
        preferTabsOverPanels: deviceConstraints.preferTabs,
        hideInactivePanels: deviceBreakpoint === 'MOBILE',
      },
      source: 'adaptive',
    };
  }

  /**
   * Optimize layout configuration for specific device
   */
  private optimizeForDevice(
    config: DeviceAwareLayoutConfig,
    deviceInfo: DeviceInfo,
    _options: LayoutAdaptationOptions
  ): DeviceAwareLayoutConfig {
    const optimized = { ...config };

    // Apply device-specific optimizations
    if (deviceInfo.isTouchDevice) {
      optimized.userPreferences.enableTouchGestures = true;
      
      // Increase minimum sizes for touch targets
      Object.keys(optimized.adaptiveRules.minimumSizes).forEach(panel => {
        const size = optimized.adaptiveRules.minimumSizes[panel];
        if (size) {
          size.width = Math.max(size.width, 320);
          size.height = Math.max(size.height, 240);
        }
      });
    }

    // Respect reduced motion preference
    if (deviceInfo.prefersReducedMotion) {
      optimized.userPreferences.enableAnimations = false;
    }

    // Optimize for aspect ratio
    if (deviceInfo.aspectRatio < 1) { // Portrait
      optimized.userPreferences.preferTabsOverPanels = true;
    }

    // High-DPI display optimizations
    if (deviceInfo.pixelRatio > 1.5) {
      // Enable high-quality rendering
      optimized.panelConfig = {
        ...optimized.panelConfig,
        highDPI: true,
      };
    }

    return optimized;
  }

  /**
   * Generate fallback layout configuration
   */
  private generateFallbackLayout(
    contentType: ContentType,
    deviceBreakpoint: DeviceBreakpoint,
    deviceConstraints: DeviceLayoutConstraints
  ): DeviceAwareLayoutConfig {
    const corePanels = this.getCorePanelsForContentType(contentType);

    return {
      deviceBreakpoint,
      deviceConstraints,
      zoneConfig: {
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'main-content',
            tabs: corePanels,
            activeTabId: corePanels[0],
            size: 100,
          },
        ],
      },
      panelConfig: {},
      visiblePanels: corePanels,
      panelGroups: {
        'main-content': {
          panels: corePanels,
          activePanel: corePanels[0],
        },
      },
      adaptiveRules: {
        hideOnSmallScreen: [],
        collapseToTabs: [],
        minimumSizes: {},
      },
      userPreferences: {
        autoSaveLayouts: true,
        enableAnimations: true,
        compactMode: false,
        autoHideUnusedPanels: false,
        enableTouchGestures: deviceConstraints.gesturesEnabled,
        preferTabsOverPanels: deviceConstraints.preferTabs,
        hideInactivePanels: false,
      },
      source: 'system-default',
    };
  }

  /**
   * Helper methods for panel management
   */
  private getCorePanelsForContentType(contentType: ContentType): string[] {
    switch (contentType) {
      case ContentTypes.VIDEO:
      case ContentTypes.AUDIO:
        return ['media-player'];
      case ContentTypes.TEXT:
        return ['text-reader'];
      case ContentTypes.PDF:
        return ['pdf-viewer'];
      default:
        return ['media-player'];
    }
  }

  private getAvailablePanelsForContentType(contentType: ContentType): string[] {
    switch (contentType) {
      case ContentTypes.VIDEO:
      case ContentTypes.AUDIO:
        return ['media-player', 'transcript', 'notes', 'timeline', 'navigation', 'progress'];
      case ContentTypes.TEXT:
      case ContentTypes.PDF:
        return ['text-reader', 'notes', 'navigation', 'progress'];
      default:
        return ['media-player', 'notes'];
    }
  }

  private generateZoneConfigForDevice(
    panels: string[],
    breakpoint: DeviceBreakpoint,
    constraints: DeviceLayoutConstraints
  ): any {
    if (panels.length === 1 || constraints.preferTabs) {
      return {
        orientation: 'vertical',
        children: [
          {
            type: 'panel-group',
            id: 'main-group',
            tabs: panels,
            activeTabId: panels[0],
            size: 100,
          },
        ],
      };
    }

    // For multiple panels, create a layout based on device
    if (breakpoint === 'MOBILE') {
      return {
        orientation: 'vertical',
        children: panels.slice(0, 2).map((panel, index) => ({
          type: 'panel-group',
          id: `panel-${index}`,
          tabs: [panel],
          activeTabId: panel,
          size: index === 0 ? 60 : 40,
        })),
      };
    }

    // Default horizontal layout for larger screens
    return {
      orientation: 'horizontal',
      children: [
        {
          type: 'panel-group',
          id: 'main-panel',
          tabs: [panels[0]],
          activeTabId: panels[0],
          size: 70,
        },
        {
          type: 'panel-group',
          id: 'side-panel',
          tabs: panels.slice(1),
          activeTabId: panels[1],
          size: 30,
        },
      ],
    };
  }

  private generatePanelConfig(panels: string[], constraints: DeviceLayoutConstraints): any {
    const config: any = {};
    
    panels.forEach(panel => {
      config[panel] = {
        minWidth: constraints.minPanelWidth,
        minHeight: constraints.minPanelHeight,
        touchOptimized: constraints.touchOptimized,
      };
    });

    return config;
  }

  private generatePanelGroups(panels: string[], constraints: DeviceLayoutConstraints): any {
    if (constraints.preferTabs) {
      return {
        'main-group': {
          panels,
          activePanel: panels[0],
        },
      };
    }

    const groups: any = {};
    panels.forEach((panel, index) => {
      groups[`group-${index}`] = {
        panels: [panel],
        activePanel: panel,
      };
    });

    return groups;
  }

  private generateMinimumSizes(constraints: DeviceLayoutConstraints): Record<string, { width: number; height: number }> {
    return {
      'media-player': {
        width: Math.max(constraints.minPanelWidth, 400),
        height: Math.max(constraints.minPanelHeight, 300),
      },
      'transcript': {
        width: constraints.minPanelWidth,
        height: constraints.minPanelHeight,
      },
      'notes': {
        width: constraints.minPanelWidth,
        height: constraints.minPanelHeight,
      },
    };
  }

  /**
   * Cache management
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  private updateCacheTimestamp(): void {
    this.cacheTimestamp = Date.now();
  }

  /**
   * Clear device-specific cache
   */
  clearCache(): void {
    this.deviceConfigCache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Save device-specific user preferences
   */
  async saveDevicePreferences(
    contentType: ContentType,
    deviceBreakpoint: DeviceBreakpoint,
    config: Partial<DeviceAwareLayoutConfig>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // This would call the updated user preferences API with device breakpoint
      const result = await layoutPersistenceService.saveLayoutChanges(
        contentType,
        {
          zoneConfig: config.zoneConfig,
          panelConfig: config.panelConfig,
          visiblePanels: config.visiblePanels,
          panelGroups: config.panelGroups,
        },
        { autoSave: true }
      );

      if (result.success) {
        this.clearCache();
      }

      return result;

    } catch (error) {
      console.error('Failed to save device preferences:', error);
      return { success: false, error: 'Failed to save device preferences' };
    }
  }
}

// Export singleton instance
export const deviceAwareLayoutService = DeviceAwareLayoutService.getInstance();