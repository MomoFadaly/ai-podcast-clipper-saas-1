import posthog from 'posthog-js'
import { env } from '~/env'

// Note: Server-side PostHog disabled to avoid build issues
// We'll use our custom analytics database for server-side tracking

// Client-side PostHog initialization
export const initPostHog = () => {
  if (typeof window !== 'undefined' && env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-sensitive], .sensitive',
        recordCrossOriginIframes: false,
      },
      autocapture: {
        dom_event_allowlist: ['click', 'change', 'submit'],
        url_allowlist: ['/dashboard/*', '/auth/*'],
      },
      loaded: (posthog) => {
        // Debug mode disabled - only enable manually if needed
        // To enable: localStorage.setItem('posthog_debug', 'true') and reload
      },
    })
  }
}

// Track page view
export const trackPageView = (url?: string) => {
  if (typeof window !== 'undefined') {
    posthog.capture('$pageview', {
      $current_url: url || window.location.href,
      timestamp: new Date().toISOString(),
    })
  }
}

// Identify user
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.identify(userId, {
      ...properties,
      identified_at: new Date().toISOString(),
    })
  }
}

// Track custom event
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    posthog.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  }
}

// Track user signup
export const trackSignup = (userId: string, method: string, properties?: Record<string, any>) => {
  trackEvent('user_signed_up', {
    user_id: userId,
    signup_method: method,
    ...properties,
  })
}

// Track user login
export const trackLogin = (userId: string, method: string) => {
  trackEvent('user_logged_in', {
    user_id: userId,
    login_method: method,
  })
}

// Track project creation
export const trackProjectCreated = (projectId: string, sourceType: string, userId: string) => {
  trackEvent('project_created', {
    project_id: projectId,
    source_type: sourceType,
    user_id: userId,
  })
}

// Track subscription events
export const trackSubscription = (event: 'started' | 'cancelled' | 'renewed', plan: string, userId: string) => {
  trackEvent(`subscription_${event}`, {
    plan,
    user_id: userId,
  })
}

// Track feature usage
export const trackFeatureUsage = (feature: string, action: string, userId?: string) => {
  trackEvent('feature_used', {
    feature,
    action,
    user_id: userId,
  })
}

// Get client-side PostHog instance
export const getPostHog = () => {
  if (typeof window !== 'undefined') {
    return posthog
  }
  return null
}

// Analytics utilities for common patterns
export const analytics = {
  page: trackPageView,
  identify: identifyUser,
  track: trackEvent,
  signup: trackSignup,
  login: trackLogin,
  projectCreated: trackProjectCreated,
  subscription: trackSubscription,
  feature: trackFeatureUsage,
  getInstance: getPostHog,
}

// Server-side analytics helper (simplified)
export const serverAnalytics = {
  track: (userId: string, event: string, properties?: Record<string, any>) => {
    // For now, we'll rely on our custom database analytics
    // PostHog server-side tracking disabled to avoid build issues
    console.debug('Server analytics event:', { userId, event, properties });
  },
  identify: (userId: string, properties?: Record<string, any>) => {
    console.debug('Server analytics identify:', { userId, properties });
  },
  shutdown: () => {
    // No-op for now
  },
}