/**
 * Feature Flags System
 * 
 * Control feature rollout and A/B testing
 */

import React from 'react';
import { type User } from '~/stores/user-store';

// Feature flag definitions
export const FEATURES = {
  // Core features
  PDF_SUPPORT: 'pdf_support',
  TEXT_SUPPORT: 'text_support',
  NOTE_TAKING: 'note_taking',
  AI_SUMMARIES: 'ai_summaries',
  COLLABORATIVE_LEARNING: 'collaborative_learning',
  
  // UI experiments
  NEW_PLAYER_UI: 'new_player_ui',
  DARK_MODE_V2: 'dark_mode_v2',
  COMPOUND_COMPONENTS: 'compound_components',
  
  // Performance features
  PROGRESSIVE_LOADING: 'progressive_loading',
  OFFLINE_MODE: 'offline_mode',
  WEB_WORKERS: 'web_workers',
  
  // Monetization
  PREMIUM_FEATURES: 'premium_features',
  AFFILIATE_PROGRAM: 'affiliate_program',
  TEAM_PLANS: 'team_plans',
  
  // Developer features
  DEBUG_MODE: 'debug_mode',
  PERFORMANCE_METRICS: 'performance_metrics',
  API_V2: 'api_v2',
} as const;

export type FeatureFlag = typeof FEATURES[keyof typeof FEATURES];

// Feature flag configuration
interface FlagConfig {
  defaultEnabled: boolean;
  description: string;
  rolloutPercentage?: number;
  enabledForUsers?: string[];
  enabledForRoles?: string[];
  enabledInEnvironments?: string[];
  metadata?: Record<string, any>;
}

// Feature configurations
const flagConfigs: Record<FeatureFlag, FlagConfig> = {
  [FEATURES.PDF_SUPPORT]: {
    defaultEnabled: false,
    description: 'Enable PDF file upload and processing',
    rolloutPercentage: 10,
    enabledForRoles: ['ADMIN', 'BETA_TESTER'],
  },
  
  [FEATURES.TEXT_SUPPORT]: {
    defaultEnabled: false,
    description: 'Enable text document support',
    rolloutPercentage: 5,
  },
  
  [FEATURES.NOTE_TAKING]: {
    defaultEnabled: false,
    description: 'Enable note-taking on chunks',
    enabledForRoles: ['ADMIN'],
  },
  
  [FEATURES.AI_SUMMARIES]: {
    defaultEnabled: true,
    description: 'AI-generated content summaries',
    rolloutPercentage: 100,
  },
  
  [FEATURES.COLLABORATIVE_LEARNING]: {
    defaultEnabled: false,
    description: 'Share and collaborate on learning',
  },
  
  [FEATURES.NEW_PLAYER_UI]: {
    defaultEnabled: false,
    description: 'New video player interface',
    rolloutPercentage: 50,
  },
  
  [FEATURES.DARK_MODE_V2]: {
    defaultEnabled: false,
    description: 'Improved dark mode implementation',
    rolloutPercentage: 25,
  },
  
  [FEATURES.COMPOUND_COMPONENTS]: {
    defaultEnabled: true,
    description: 'Use new compound component architecture',
    enabledInEnvironments: ['development', 'preview'],
  },
  
  [FEATURES.PROGRESSIVE_LOADING]: {
    defaultEnabled: true,
    description: 'Progressive content loading',
  },
  
  [FEATURES.OFFLINE_MODE]: {
    defaultEnabled: false,
    description: 'Offline content access',
  },
  
  [FEATURES.WEB_WORKERS]: {
    defaultEnabled: false,
    description: 'Use web workers for processing',
    rolloutPercentage: 10,
  },
  
  [FEATURES.PREMIUM_FEATURES]: {
    defaultEnabled: true,
    description: 'Premium subscription features',
  },
  
  [FEATURES.AFFILIATE_PROGRAM]: {
    defaultEnabled: false,
    description: 'Affiliate referral program',
    enabledForRoles: ['ADMIN', 'AFFILIATE'],
  },
  
  [FEATURES.TEAM_PLANS]: {
    defaultEnabled: false,
    description: 'Team subscription plans',
  },
  
  [FEATURES.DEBUG_MODE]: {
    defaultEnabled: false,
    description: 'Debug information display',
    enabledInEnvironments: ['development'],
    enabledForRoles: ['ADMIN'],
  },
  
  [FEATURES.PERFORMANCE_METRICS]: {
    defaultEnabled: false,
    description: 'Show performance metrics',
    enabledInEnvironments: ['development', 'preview'],
  },
  
  [FEATURES.API_V2]: {
    defaultEnabled: false,
    description: 'New API version',
    rolloutPercentage: 0,
  },
};

// Feature flag evaluation
export class FeatureFlags {
  private overrides: Map<FeatureFlag, boolean> = new Map();
  private user?: User;
  private environment: string;
  
  constructor(user?: User, environment: string = process.env.NODE_ENV || 'development') {
    this.user = user;
    this.environment = environment;
    
    // Load overrides from localStorage in browser
    if (typeof window !== 'undefined') {
      this.loadOverrides();
    }
  }
  
  // Check if feature is enabled
  isEnabled(feature: FeatureFlag): boolean {
    // Check overrides first
    if (this.overrides.has(feature)) {
      return this.overrides.get(feature)!;
    }
    
    const config = flagConfigs[feature];
    if (!config) {
      console.warn(`Unknown feature flag: ${feature}`);
      return false;
    }
    
    // Check environment
    if (config.enabledInEnvironments && 
        !config.enabledInEnvironments.includes(this.environment)) {
      return false;
    }
    
    // Check user-specific enablement
    if (this.user) {
      // Check specific users
      if (config.enabledForUsers?.includes(this.user.id)) {
        return true;
      }
      
      // Check roles
      if (this.user.role && config.enabledForRoles?.includes(this.user.role)) {
        return true;
      }
      
      // Check rollout percentage
      if (config.rolloutPercentage !== undefined) {
        const hash = this.hashUserId(this.user.id, feature);
        return hash < config.rolloutPercentage;
      }
    }
    
    return config.defaultEnabled;
  }
  
  // Get all enabled features
  getEnabledFeatures(): FeatureFlag[] {
    return Object.values(FEATURES).filter(feature => this.isEnabled(feature));
  }
  
  // Get feature configuration
  getConfig(feature: FeatureFlag): FlagConfig | undefined {
    return flagConfigs[feature];
  }
  
  // Override feature flag (for testing)
  override(feature: FeatureFlag, enabled: boolean) {
    this.overrides.set(feature, enabled);
    this.saveOverrides();
  }
  
  // Clear overrides
  clearOverrides() {
    this.overrides.clear();
    this.saveOverrides();
  }
  
  // Hash user ID for consistent rollout
  private hashUserId(userId: string, feature: string): number {
    const str = `${userId}-${feature}`;
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100;
  }
  
  // Load overrides from localStorage
  private loadOverrides() {
    try {
      const stored = localStorage.getItem('featureFlags');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.overrides.set(key as FeatureFlag, value as boolean);
        });
      }
    } catch (error) {
      console.error('Failed to load feature flag overrides:', error);
    }
  }
  
  // Save overrides to localStorage
  private saveOverrides() {
    try {
      const obj = Object.fromEntries(this.overrides);
      localStorage.setItem('featureFlags', JSON.stringify(obj));
    } catch (error) {
      console.error('Failed to save feature flag overrides:', error);
    }
  }
}

// Standalone feature flag check function
export function isFeatureEnabled(feature: FeatureFlag, userId?: string, userRole?: string): boolean {
  const user = userId ? { id: userId, role: userRole } as User : undefined;
  const flags = new FeatureFlags(user, process.env.NODE_ENV);
  return flags.isEnabled(feature);
}

// React hook for feature flags
import { useMemo } from 'react';
import { useUserStore } from '~/stores/user-store';

export function useFeatureFlags() {
  const user = useUserStore(state => state.user);
  
  const flags = useMemo(() => {
    return new FeatureFlags(user || undefined);
  }, [user]);
  
  return {
    isEnabled: (feature: FeatureFlag) => flags.isEnabled(feature),
    getEnabledFeatures: () => flags.getEnabledFeatures(),
    override: (feature: FeatureFlag, enabled: boolean) => flags.override(feature, enabled),
    clearOverrides: () => flags.clearOverrides(),
  };
}

// React hook for individual feature flag
export function useFeatureFlag(feature: FeatureFlag): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(feature);
}

// React component for feature-gated content
export function FeatureGate({ feature, children, fallback }: {
  feature: FeatureFlag;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isEnabled = useFeatureFlag(feature);
  return isEnabled ? <>{children}</> : <>{fallback || null}</>;
}

// HOC for feature-flagged components
import { type ComponentType } from 'react';

export function withFeatureFlag<P extends object>(
  feature: FeatureFlag,
  Component: ComponentType<P>,
  Fallback?: ComponentType<P>
) {
  return function FeatureFlaggedComponent(props: P) {
    const { isEnabled } = useFeatureFlags();
    
    if (isEnabled(feature)) {
      return <Component {...props} />;
    }
    
    return Fallback ? <Fallback {...props} /> : null;
  };
}

// Server-side feature flag check
export async function checkFeatureFlag(
  feature: FeatureFlag,
  userId?: string,
  userRole?: string
): Promise<boolean> {
  const user = userId ? { id: userId, role: userRole } as User : undefined;
  const flags = new FeatureFlags(user, process.env.NODE_ENV);
  return flags.isEnabled(feature);
}