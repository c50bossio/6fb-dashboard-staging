/**
 * Session Synchronization Utility
 * 
 * Fixes the mismatch between server-side session cookies and client-side localStorage
 * that causes "session from storage null" errors in GoTrueClient.
 * 
 * Problem: OAuth callback sets session cookies on server, but GoTrueClient expects
 * session data in localStorage on client. This utility bridges that gap.
 */

/**
 * Synchronizes server-side session cookies with client-side localStorage
 * by fetching session data from the server and storing it where GoTrueClient expects it.
 */
export async function syncSessionFromServer() {
  if (typeof window === 'undefined') {
    console.warn('[Session Sync] Cannot sync session on server side')
    return { success: false, error: 'Server-side execution' }
  }

  try {
    console.log('🔄 [Session Sync] Starting session synchronization from server...')
    
    // Make API call to get current session from server (which can read cookies)
    // Use the special 'tokens' parameter to get full session data
    const response = await fetch('/api/auth/session?tokens=true', {
      method: 'GET',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [Session Sync] Failed to fetch session from server:', response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    
    if (data.error || !data.authenticated || !data.session_data) {
      console.warn('⚠️ [Session Sync] No session available from server:', data.error || 'Session not authenticated')
      return { success: false, error: data.error || 'No session available' }
    }

    const session = data.session_data
    console.log('✅ [Session Sync] Received session from server:', {
      userId: session.user?.id,
      hasAccessToken: !!session.access_token,
      hasRefreshToken: !!session.refresh_token,
      expiresAt: session.expires_at
    })

    // Store session in localStorage with the correct key format GoTrueClient expects
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
    
    if (!storageKey.includes('sb-')) {
      console.error('❌ [Session Sync] Failed to generate proper storage key')
      return { success: false, error: 'Invalid storage key generation' }
    }

    // Format session data for localStorage (matches Supabase client expectations)
    const sessionData = {
      access_token: session.access_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      refresh_token: session.refresh_token,
      token_type: session.token_type || 'bearer',
      user: session.user
    }

    // Store in localStorage
    localStorage.setItem(storageKey, JSON.stringify(sessionData))
    
    console.log('🍪 [Session Sync] Session stored in localStorage:', {
      key: storageKey,
      userId: sessionData.user?.id,
      expiresAt: sessionData.expires_at
    })

    // Verify the storage worked
    const stored = localStorage.getItem(storageKey)
    if (!stored) {
      console.error('❌ [Session Sync] Failed to store session in localStorage')
      return { success: false, error: 'localStorage storage failed' }
    }

    console.log('✅ [Session Sync] Session synchronization completed successfully')
    return { 
      success: true, 
      session: sessionData,
      storageKey 
    }

  } catch (error) {
    console.error('❌ [Session Sync] Session synchronization failed:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Clears session data from localStorage
 * Useful for debugging or when switching between users
 */
export function clearStoredSession() {
  if (typeof window === 'undefined') {
    console.warn('[Session Sync] Cannot clear session on server side')
    return false
  }

  try {
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
    
    if (localStorage.getItem(storageKey)) {
      localStorage.removeItem(storageKey)
      console.log('🗑️ [Session Sync] Cleared stored session from localStorage')
      return true
    } else {
      console.log('📝 [Session Sync] No stored session found to clear')
      return false
    }
  } catch (error) {
    console.error('❌ [Session Sync] Failed to clear stored session:', error)
    return false
  }
}

/**
 * Checks if there's a valid session in localStorage
 * Returns session info if found, null if not found or expired
 */
export function checkStoredSession() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storageKey = `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`
    const storedData = localStorage.getItem(storageKey)
    
    if (!storedData) {
      console.log('📝 [Session Sync] No session found in localStorage')
      return null
    }

    const session = JSON.parse(storedData)
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000)
    if (session.expires_at && session.expires_at <= now) {
      console.warn('⚠️ [Session Sync] Stored session is expired')
      localStorage.removeItem(storageKey)
      return null
    }

    console.log('✅ [Session Sync] Found valid session in localStorage:', {
      userId: session.user?.id,
      expiresAt: session.expires_at
    })

    return session
  } catch (error) {
    console.error('❌ [Session Sync] Error checking stored session:', error)
    return null
  }
}

/**
 * Automatic session sync on page load
 * Call this early in your app initialization
 */
export async function autoSyncSession() {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Server-side execution' }
  }

  console.log('🔄 [Session Sync] Starting automatic session sync...')
  
  // Check if we're in the middle of an OAuth flow
  const currentPath = window.location.pathname
  const isOAuthFlow = currentPath.includes('/auth/callback') || 
                     currentPath.includes('/dashboard') && window.location.search.includes('code=')
  
  if (isOAuthFlow) {
    console.log('⏸️ [Session Sync] OAuth flow detected, skipping sync to avoid interference')
    return { success: false, error: 'OAuth flow in progress', skipped: true }
  }
  
  // Check if we already have a valid session in localStorage
  const existing = checkStoredSession()
  if (existing) {
    console.log('✅ [Session Sync] Valid session already in localStorage, skipping sync')
    return { success: true, session: existing, skipped: true }
  }

  // Check if we just came from an OAuth redirect (within last 5 seconds)
  const lastOAuthRedirect = sessionStorage.getItem('oauth_redirect_time')
  if (lastOAuthRedirect) {
    const timeSinceRedirect = Date.now() - parseInt(lastOAuthRedirect)
    if (timeSinceRedirect < 5000) {
      console.log('⏸️ [Session Sync] Recent OAuth redirect detected, waiting for session establishment')
      return { success: false, error: 'Waiting for OAuth session', skipped: true }
    }
  }

  // No valid session in localStorage, try to sync from server
  return await syncSessionFromServer()
}