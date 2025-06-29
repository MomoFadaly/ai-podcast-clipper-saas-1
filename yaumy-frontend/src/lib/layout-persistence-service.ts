/**
 * Layout Persistence Service
 * 
 * Integrates the layout registry with database persistence,
 * providing seamless layout management with user preferences.
 */

// import { chunkLayoutRegistry } from './chunk-layout-registry';
import type { ContentType } from '~/components/panels/types';
import type { LayoutPreset } from './layout-presets';
import {
  getUserLayoutPreference,
  setDefaultPreset,
  saveCustomLayoutConfig,
  clearCustomLayoutConfig,
  recordLayoutUsage,
} from '~/actions/user-layout-preferences';
import {
  getLayoutPresets,
  getUserLayoutPresets,
  getDefaultLayoutPreset,
  createLayoutPreset,
  incrementPresetUsage,
  type CreateLayoutPresetInput,
  type LayoutPresetWithCreator,
} from '~/actions/layout-presets';
import {
  createTemporaryLayout,
} from '~/actions/saved-layouts';

/**
 * Resolved layout configuration with all sources merged
 */
export interface ResolvedLayoutConfig {
  presetId?: string;
  preset?: LayoutPreset;
  zoneConfig: any;
  panelConfig: any;
  visiblePanels: string[];
  panelGroups: any;
  userPreferences: {
    autoSaveLayouts: boolean;
    enableAnimations: boolean;
    compactMode: boolean;
    autoHideUnusedPanels: boolean;
  };
  source: 'system-default' | 'user-preset' | 'custom' | 'saved-layout';
}

/**
 * Layout persistence service class
 */
export class LayoutPersistenceService {
  private static instance: LayoutPersistenceService;
  
  // Cache for performance
  private userPreferencesCache = new Map<string, any>();
  private presetsCache = new Map<string, any>();
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): LayoutPersistenceService {
    if (!LayoutPersistenceService.instance) {
      LayoutPersistenceService.instance = new LayoutPersistenceService();
    }
    return LayoutPersistenceService.instance;
  }

  /**
   * Get resolved layout configuration for a user and content type
   */
  async getResolvedLayoutConfig(
    contentType: ContentType,
    options: {
      presetId?: string;
      includeCustomizations?: boolean;
      fallbackToDefault?: boolean;
    } = {}
  ): Promise<ResolvedLayoutConfig> {
    const {
      presetId,
      includeCustomizations = true,
      fallbackToDefault = true,
    } = options;

    try {
      // Get user preferences
      const userPrefResult = await getUserLayoutPreference(contentType.toUpperCase() as any);
      const userPreference = userPrefResult.data;

      // Determine which preset to use
      let resolvedPresetId = presetId;
      let source: ResolvedLayoutConfig['source'] = 'system-default';

      if (!resolvedPresetId && userPreference?.defaultPresetId) {
        resolvedPresetId = userPreference.defaultPresetId;
        source = 'user-preset';
      }

      // Get preset configuration
      let preset: LayoutPresetWithCreator | null = null;
      if (resolvedPresetId) {
        const presetResult = await getDefaultLayoutPreset(contentType.toUpperCase() as any);
        preset = presetResult.data || null;
      }

      // Fall back to system default if needed
      if (!preset && fallbackToDefault) {
        const defaultResult = await getDefaultLayoutPreset(contentType.toUpperCase() as any);
        preset = defaultResult.data || null;
        if (preset) {
          resolvedPresetId = preset.id;
        }
      }

      // Fall back to registry defaults if database has no defaults
      if (!preset) {
        // const registryDefault = chunkLayoutRegistry.getDefaultPreset(contentType);
        // if (registryDefault) {
        //   // Convert LayoutPreset to LayoutPresetWithCreator for type compatibility
        //   preset = registryDefault as any;
        //   resolvedPresetId = registryDefault.id;
        // }
      }

      // Build base configuration from preset
      let zoneConfig = preset?.zoneConfig || {};
      let panelConfig = preset?.panelConfig || {};
      let visiblePanels = preset?.visiblePanels || [];
      let panelGroups = preset?.panelGroups || {};

      // Apply user customizations if enabled
      if (includeCustomizations && userPreference) {
        if (userPreference.customZoneConfig) {
          zoneConfig = userPreference.customZoneConfig;
          source = 'custom';
        }
        if (userPreference.customPanelConfig) {
          panelConfig = userPreference.customPanelConfig;
        }
        if (userPreference.customVisiblePanels) {
          visiblePanels = userPreference.customVisiblePanels;
        }
        if (userPreference.customPanelGroups) {
          panelGroups = userPreference.customPanelGroups;
        }
      }

      // Build user preferences
      const userPreferences = {
        autoSaveLayouts: userPreference?.autoSaveLayouts ?? true,
        enableAnimations: userPreference?.enableAnimations ?? true,
        compactMode: userPreference?.compactMode ?? false,
        autoHideUnusedPanels: userPreference?.autoHideUnusedPanels ?? false,
      };

      return {
        presetId: resolvedPresetId,
        preset: preset as unknown as LayoutPreset | undefined,
        zoneConfig,
        panelConfig,
        visiblePanels,
        panelGroups,
        userPreferences,
        source,
      };
    } catch (error) {
      console.error('Failed to resolve layout configuration:', error);
      
      // Return fallback configuration
      // const fallbackPreset = chunkLayoutRegistry.getDefaultPreset(contentType);
      return {
        zoneConfig: {},
        panelConfig: {},
        visiblePanels: [],
        panelGroups: {},
        userPreferences: {
          autoSaveLayouts: true,
          enableAnimations: true,
          compactMode: false,
          autoHideUnusedPanels: false,
        },
        source: 'system-default',
      };
    }
  }

  /**
   * Save layout changes for a user
   */
  async saveLayoutChanges(
    contentType: ContentType,
    changes: {
      zoneConfig?: any;
      panelConfig?: any;
      visiblePanels?: string[];
      panelGroups?: any;
      panelSizes?: any;
      panelPositions?: any;
    },
    options: {
      autoSave?: boolean;
      createTemporary?: boolean;
      presetId?: string;
    } = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { autoSave = true, createTemporary = false } = options;

      if (createTemporary) {
        // Create temporary layout for auto-save
        const result = await createTemporaryLayout({
          name: `Auto-save ${new Date().toISOString()}`,
          contentType: contentType.toUpperCase() as any,
          zoneConfig: changes.zoneConfig || {},
          panelConfig: changes.panelConfig || {},
          visiblePanels: changes.visiblePanels || [],
          panelGroups: changes.panelGroups || {},
        });

        return { success: result.success, error: result.error };
      }

      if (autoSave) {
        // Save as custom configuration
        const result = await saveCustomLayoutConfig(contentType.toUpperCase() as any, changes);
        return { success: result.success, error: result.error };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to save layout changes:', error);
      return { success: false, error: 'Failed to save layout changes' };
    }
  }

  /**
   * Set user's default preset for a content type
   */
  async setUserDefaultPreset(
    contentType: ContentType,
    presetId: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await setDefaultPreset(contentType.toUpperCase() as any, presetId);
      
      // Increment usage count if setting a preset
      if (presetId && result.success) {
        await incrementPresetUsage(presetId);
      }

      // Clear cache
      this.clearCache();

      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Failed to set user default preset:', error);
      return { success: false, error: 'Failed to set default preset' };
    }
  }

  /**
   * Create a new user preset from current configuration
   */
  async createUserPreset(
    name: string,
    description: string | undefined,
    contentType: ContentType,
    config: {
      zoneConfig: any;
      panelConfig: any;
      visiblePanels: string[];
      panelGroups: any;
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const input: CreateLayoutPresetInput = {
        name,
        description,
        supportedContentTypes: [contentType.toUpperCase() as any],
        zoneConfig: config.zoneConfig,
        panelConfig: config.panelConfig,
        visiblePanels: config.visiblePanels,
        panelGroups: config.panelGroups,
        presetType: 'USER_CUSTOM',
        category: 'LEARNING',
        isPublic: false,
      };

      const result = await createLayoutPreset(input);

      // Clear cache
      this.clearCache();

      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error('Failed to create user preset:', error);
      return { success: false, error: 'Failed to create preset' };
    }
  }

  /**
   * Get available presets for a content type
   */
  async getAvailablePresets(
    contentType: ContentType,
    includeUserPresets = true
  ): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const cacheKey = `presets-${contentType}-${includeUserPresets}`;
      
      // Check cache
      if (this.isCacheValid() && this.presetsCache.has(cacheKey)) {
        return { success: true, data: this.presetsCache.get(cacheKey) };
      }

      // Get system and public presets
      const systemPresetsResult = await getLayoutPresets(contentType.toUpperCase() as any);
      let allPresets = systemPresetsResult.data || [];

      // Get user's custom presets if requested
      if (includeUserPresets) {
        const userPresetsResult = await getUserLayoutPresets();
        const userPresets = (userPresetsResult.data || [])
          .filter(preset => preset.supportedContentTypes.includes(contentType.toUpperCase() as any));
        allPresets = [...allPresets, ...userPresets];
      }

      // Cache the result
      this.presetsCache.set(cacheKey, allPresets);
      this.updateCacheTimestamp();

      return { success: true, data: allPresets };
    } catch (error) {
      console.error('Failed to get available presets:', error);
      return { success: false, error: 'Failed to fetch presets' };
    }
  }

  /**
   * Record layout usage analytics
   */
  async recordUsage(
    contentType: ContentType,
    analytics: {
      presetId?: string;
      sessionDuration: number;
      panelsUsed: string[];
      panelSwitches?: number;
      customizations?: any;
      projectId?: string;
      chunkId?: string;
    }
  ): Promise<void> {
    try {
      await recordLayoutUsage(contentType.toUpperCase() as any, analytics);
    } catch (error) {
      console.error('Failed to record layout usage:', error);
      // Don't throw - analytics failure shouldn't break the app
    }
  }

  /**
   * Clear user customizations and revert to preset
   */
  async revertToPreset(
    contentType: ContentType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await clearCustomLayoutConfig(contentType.toUpperCase() as any);
      this.clearCache();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error('Failed to revert to preset:', error);
      return { success: false, error: 'Failed to revert layout' };
    }
  }

  /**
   * Reset all layout preferences for a content type
   */
  async resetLayoutPreferences(
    contentType: ContentType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Clear custom configuration
      await clearCustomLayoutConfig(contentType.toUpperCase() as any);
      
      // Reset to system default
      await setDefaultPreset(contentType.toUpperCase() as any, null);

      this.clearCache();
      return { success: true };
    } catch (error) {
      console.error('Failed to reset layout preferences:', error);
      return { success: false, error: 'Failed to reset preferences' };
    }
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

  private clearCache(): void {
    this.userPreferencesCache.clear();
    this.presetsCache.clear();
    this.cacheTimestamp = 0;
  }

  /**
   * Initialize service
   */
  async initialize(): Promise<void> {
    console.log('Layout Persistence Service initialized');
  }
}

// Export singleton instance
export const layoutPersistenceService = LayoutPersistenceService.getInstance();