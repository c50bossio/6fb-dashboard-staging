/**
 * Session Synchronization Utilities
 * Ensures proper session sync between client and server after OAuth
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

/**
 * Force session refresh to sync client/server state
 */
export async function forceSessionRefresh() {
  try {
    console.log('🔄 [Session Sync] Forcing session refresh...')
    
    const supabase = createClientComponentClient()
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ [Session Sync] Session refresh failed:', error.message)
      return false
    }
    
    if (data?.session) {
      console.log('✅ [Session Sync] Session refreshed successfully')
      return true
    }
    
    console.warn('⚠️ [Session Sync] No session after refresh')
    return false
    
  } catch (error) {
    console.error('❌ [Session Sync] Exception during refresh:', error.message)
    return false
  }
}

/**
 * Test if server-side session is working by making a test API call
 */
export async function testServerSession() {
  try {
    console.log('🧪 [Session Sync] Testing server-side session...')
    
    const response = await fetch('/api/staff', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    })
    
    if (response.ok) {
      console.log('✅ [Session Sync] Server-side session working')
      return true
    } else if (response.status === 401) {
      console.warn('⚠️ [Session Sync] Server-side session not established (401)')
      return false
    } else {
      console.warn('⚠️ [Session Sync] Server responded with status:', response.status)
      return false
    }
    
  } catch (error) {
    console.error('❌ [Session Sync] Server session test failed:', error.message)
    return false
  }
}

/**
 * Complete session synchronization after OAuth
 */
export async function syncSessionAfterOAuth() {
  try {
    console.log('🔄 [Session Sync] Starting post-OAuth session sync...')
    
    // Check if we came from OAuth callback
    const wasOAuthFlow = window.location.search.includes('code=') || 
                        document.referrer.includes('/auth/callback') ||
                        sessionStorage.getItem('oauth-in-progress')
    
    if (!wasOAuthFlow) {
      console.log('ℹ️ [Session Sync] Not from OAuth flow, skipping sync')
      return true
    }
    
    // Clear OAuth flag
    sessionStorage.removeItem('oauth-in-progress')
    
    // Test current session state
    const serverWorking = await testServerSession()
    
    if (serverWorking) {
      console.log('✅ [Session Sync] Session already working, no sync needed')
      return true
    }
    
    // Try refreshing session
    const refreshed = await forceSessionRefresh()
    
    if (!refreshed) {
      console.error('❌ [Session Sync] Session refresh failed')
      return false
    }
    
    // Wait a bit for cookies to propagate
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Test again
    const finalTest = await testServerSession()
    
    if (finalTest) {
      console.log('✅ [Session Sync] Session sync completed successfully')
      return true
    } else {
      console.error('❌ [Session Sync] Session still not working after refresh')
      return false
    }
    
  } catch (error) {
    console.error('❌ [Session Sync] Unexpected error during sync:', error.message)
    return false
  }
}

/**
 * React hook for automatic session sync
 */
export function useSessionSync() {
  const [isSynced, setIsSynced] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    async function performSync() {
      try {
        setIsLoading(true)
        const success = await syncSessionAfterOAuth()
        setIsSynced(success)
      } finally {
        setIsLoading(false)
      }
    }
    
    performSync()
  }, [])
  
  return { isSynced, isLoading }
}

/**
 * Call this before OAuth to track the flow
 */
export function startOAuthFlow() {
  console.log('🎯 [Session Sync] Starting OAuth flow tracking...')
  sessionStorage.setItem('oauth-in-progress', 'true')
}

/**
 * Manual session sync trigger (for debugging)
 */
export async function manualSessionSync() {
  console.log('🔧 [Session Sync] Manual session sync triggered...')
  const result = await syncSessionAfterOAuth()
  
  if (result) {
    console.log('✅ [Session Sync] Manual sync completed successfully')
    // Force page reload to clear any cached auth state
    window.location.reload()
  } else {
    console.error('❌ [Session Sync] Manual sync failed')
    alert('Session sync failed. Please try logging in again.')
  }
  
  return result
}