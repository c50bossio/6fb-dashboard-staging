import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    
    capture_pageview: true,
    capture_pageleave: true,
    
    autocapture: {
      css_selector_allowlist: ['[data-analytics]'], // Only capture marked elements
      element_attribute_ignorelist: ['data-sensitive'], // Ignore sensitive data
    },
    
    session_recording: {
      maskTextSelector: '[data-sensitive]',
      maskAllInputs: false, // We'll manually mark sensitive inputs
      recordCrossOriginIframes: false,
    },
    
    bootstrap: {
      distinctId: undefined, // Will be set on login
      isIdentifiedID: false,
    },
    
    persistence: 'localStorage',
    cross_subdomain_cookie: true,
    secure_cookie: true,
    
    opt_out_capturing_by_default: false,
    respect_dnt: true,
  })
}

export { posthog, PHProvider as PostHogProvider }