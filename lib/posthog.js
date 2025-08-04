import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Initialize PostHog only on client side
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    
    // Capture settings
    capture_pageview: true,
    capture_pageleave: true,
    
    // Privacy-first autocapture
    autocapture: {
      css_selector_allowlist: ['[data-analytics]'], // Only capture marked elements
      element_attribute_ignorelist: ['data-sensitive'], // Ignore sensitive data
    },
    
    // Session recording with privacy
    session_recording: {
      maskTextSelector: '[data-sensitive]',
      maskAllInputs: false, // We'll manually mark sensitive inputs
      recordCrossOriginIframes: false,
    },
    
    // Performance
    bootstrap: {
      distinctId: undefined, // Will be set on login
      isIdentifiedID: false,
    },
    
    // Other settings
    persistence: 'localStorage',
    cross_subdomain_cookie: true,
    secure_cookie: true,
    
    // Opt-out settings
    opt_out_capturing_by_default: false,
    respect_dnt: true,
  })
}

// Export PostHog instance and provider
export { posthog, PHProvider as PostHogProvider }