// OAuth Session Management for Secure Plan Data Transfer
// Handles secure storage and retrieval of plan selection during OAuth flow

import { createClient } from './supabase/browser-client'

const OAUTH_SESSION_KEY = 'oauth_plan_selection'
const SESSION_EXPIRY_MINUTES = 30

/**
 * Secure session data structure for OAuth flow
 * @typedef {Object} OAuthSession
 * @property {string} planId - Selected subscription plan ID
 * @property {string} billingPeriod - Monthly or yearly billing
 * @property {number} timestamp - Session creation timestamp
 * @property {string} state - Random state string for security
 * @property {string} origin - Origin URL for validation
 */

/**
 * Generate a cryptographically secure random string for OAuth state
 * @param {number} length - Length of the state string
 * @returns {string} Random state string
 */
function generateSecureState(length = 32) {
  if (typeof window === 'undefined') return 'server-side-state'
  
  const array = new Uint8Array(length)
  window.crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(36)).join('')
}

/**
 * Create an OAuth session with plan data and secure state
 * @param {string} planId - The selected plan ID (barber, shop, enterprise)
 * @param {string} billingPeriod - Billing period (monthly, yearly)
 * @returns {string} OAuth state parameter for use in redirect
 */
export function createOAuthSession(planId, billingPeriod) {
  if (typeof window === 'undefined') {
    console.warn('OAuth session creation attempted on server side')
    return null
  }

  const state = generateSecureState()
  const session = {
    planId,
    billingPeriod,
    timestamp: Date.now(),
    state,
    origin: window.location.origin
  }

  try {
    // Store in sessionStorage (more secure than localStorage for temporary data)
    window.sessionStorage.setItem(OAUTH_SESSION_KEY, JSON.stringify(session))
    console.log('🔒 OAuth session created:', { planId, billingPeriod, state: state.substring(0, 8) + '...' })
    return state
  } catch (error) {
    console.error('Failed to create OAuth session:', error)
    return null
  }
}

/**
 * Retrieve and validate OAuth session data using state parameter
 * @param {string} state - The OAuth state parameter from callback
 * @returns {OAuthSession|null} Session data if valid, null otherwise
 */
export function getOAuthSession(state) {
  if (typeof window === 'undefined') {
    console.warn('OAuth session retrieval attempted on server side')
    return null
  }

  try {
    const sessionData = window.sessionStorage.getItem(OAUTH_SESSION_KEY)
    if (!sessionData) {
      console.warn('No OAuth session found')
      return null
    }

    const session = JSON.parse(sessionData)
    
    // Validate session structure
    if (!session.planId || !session.billingPeriod || !session.state || !session.timestamp) {
      console.error('Invalid OAuth session structure')
      clearOAuthSession()
      return null
    }

    // Validate state parameter
    if (session.state !== state) {
      console.error('OAuth state mismatch - possible CSRF attack')
      clearOAuthSession()
      return null
    }

    // Check session expiry
    const sessionAge = Date.now() - session.timestamp
    const maxAge = SESSION_EXPIRY_MINUTES * 60 * 1000
    if (sessionAge > maxAge) {
      console.warn('OAuth session expired')
      clearOAuthSession()
      return null
    }

    // Validate origin
    if (session.origin !== window.location.origin) {
      console.error('OAuth session origin mismatch')
      clearOAuthSession()
      return null
    }

    console.log('✅ OAuth session validated:', { 
      planId: session.planId, 
      billingPeriod: session.billingPeriod,
      age: Math.round(sessionAge / 1000) + 's'
    })
    
    return session
  } catch (error) {
    console.error('Failed to retrieve OAuth session:', error)
    clearOAuthSession()
    return null
  }
}

/**
 * Clear OAuth session data (should be called after successful processing)
 */
export function clearOAuthSession() {
  if (typeof window === 'undefined') return
  
  try {
    window.sessionStorage.removeItem(OAUTH_SESSION_KEY)
    console.log('🧹 OAuth session cleared')
  } catch (error) {
    console.error('Failed to clear OAuth session:', error)
  }
}

/**
 * Check if there's a valid OAuth session in progress
 * @returns {boolean} True if valid session exists
 */
export function hasOAuthSession() {
  if (typeof window === 'undefined') return false
  
  try {
    const sessionData = window.sessionStorage.getItem(OAUTH_SESSION_KEY)
    if (!sessionData) return false

    const session = JSON.parse(sessionData)
    const sessionAge = Date.now() - session.timestamp
    const maxAge = SESSION_EXPIRY_MINUTES * 60 * 1000
    
    return sessionAge <= maxAge && session.planId && session.billingPeriod
  } catch {
    return false
  }
}

/**
 * Enhanced OAuth initiation with plan data
 * @param {string} planId - Selected plan ID
 * @param {string} billingPeriod - Billing period
 * @returns {Promise<{data: any, error: any}>} OAuth initiation result
 */
export async function initiateOAuthWithPlan(planId, billingPeriod) {
  console.log('🎯 initiateOAuthWithPlan called with:', { planId, billingPeriod })
  
  const supabase = createClient()
  
  // Store plan data in sessionStorage (not relying on OAuth state parameter)
  // This is more reliable as Supabase doesn't pass custom state through
  const planData = {
    planId,
    billingPeriod,
    timestamp: Date.now(),
    isOAuthSignup: true
  }
  
  console.log('📝 About to store plan data:', planData)
  
  try {
    // Store in sessionStorage for retrieval after OAuth
    window.sessionStorage.setItem('oauth_plan_data', JSON.stringify(planData))
    console.log('💾 Stored plan data in sessionStorage:', { planId, billingPeriod })
    
    // Verify it was stored
    const verifyStored = window.sessionStorage.getItem('oauth_plan_data')
    console.log('✅ Verified storage, data exists:', !!verifyStored)
  } catch (e) {
    console.error('❌ Failed to store plan data:', e)
  }
  
  // Also create the session with state (for backwards compatibility)
  const state = createOAuthSession(planId, billingPeriod)

  try {
    // Initiate OAuth - Supabase manages its own state parameter
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      console.error('OAuth initiation failed:', error)
      clearOAuthSession()
      window.sessionStorage.removeItem('oauth_plan_data')
      return { data: null, error }
    }

    console.log('🚀 OAuth initiated with plan data stored in sessionStorage')
    return { data, error: null }
  } catch (error) {
    console.error('OAuth initiation error:', error)
    clearOAuthSession()
    window.sessionStorage.removeItem('oauth_plan_data')
    return { data: null, error }
  }
}

/**
 * For development/debugging - get session info
 */
export function getSessionInfo() {
  if (typeof window === 'undefined') return null
  
  try {
    const sessionData = window.sessionStorage.getItem(OAUTH_SESSION_KEY)
    return sessionData ? JSON.parse(sessionData) : null
  } catch {
    return null
  }
}