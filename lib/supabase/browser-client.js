import { createBrowserClient } from '@supabase/ssr'

// Enhanced storage implementation for session recovery
const createEnhancedStorage = () => {
  const storagePrefix = 'supabase.auth.'
  
  return {
    getItem: (key) => {
      if (typeof window === 'undefined') return null
      
      try {
        // Strategy 1: Try localStorage first
        const localValue = localStorage.getItem(key)
        if (localValue) {
          console.log(`📦 Storage: Retrieved ${key} from localStorage`)
          return localValue
        }
        
        // Strategy 2: Try sessionStorage as backup
        const sessionValue = sessionStorage.getItem(key)
        if (sessionValue) {
          console.log(`📦 Storage: Retrieved ${key} from sessionStorage`)
          // Copy to localStorage for persistence
          localStorage.setItem(key, sessionValue)
          return sessionValue
        }
        
        // Strategy 3: Try cookies as final fallback
        const cookieValue = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${key}=`))
          ?.split('=')[1]
        
        if (cookieValue) {
          const decodedValue = decodeURIComponent(cookieValue)
          console.log(`🍪 Storage: Retrieved ${key} from cookies`)
          // Restore to localStorage
          localStorage.setItem(key, decodedValue)
          return decodedValue
        }
        
        console.log(`📭 Storage: No value found for ${key}`)
        return null
      } catch (error) {
        console.error(`❌ Storage: Error retrieving ${key}:`, error)
        return null
      }
    },
    
    setItem: (key, value) => {
      if (typeof window === 'undefined') return
      
      try {
        // Store in multiple locations for redundancy
        localStorage.setItem(key, value)
        sessionStorage.setItem(key, value)
        
        // Enhanced cookie settings for better persistence
        const maxAge = 60 * 60 * 24 * 30 // 30 days for auth tokens
        const cookieOptions = [
          `${key}=${encodeURIComponent(value)}`,
          'path=/',
          `max-age=${maxAge}`,
          'samesite=lax'
        ]
        
        // Add secure flag in production
        if (window.location.protocol === 'https:') {
          cookieOptions.push('secure')
        }
        
        document.cookie = cookieOptions.join('; ')
        
        console.log(`💾 Storage: Saved ${key} to localStorage, sessionStorage, and cookies`)
      } catch (error) {
        console.error(`❌ Storage: Error storing ${key}:`, error)
      }
    },
    
    removeItem: (key) => {
      if (typeof window === 'undefined') return
      
      try {
        // Remove from all storage locations
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
        
        // Clear cookie with proper path and domain
        const expiredCookieOptions = [
          `${key}=`,
          'path=/',
          'expires=Thu, 01 Jan 1970 00:00:00 UTC'
        ]
        
        document.cookie = expiredCookieOptions.join('; ')
        
        console.log(`🗑️ Storage: Removed ${key} from all storage locations`)
      } catch (error) {
        console.error(`❌ Storage: Error removing ${key}:`, error)
      }
    }
  }
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase configuration missing')
  }
  
  console.log('🔧 Creating Supabase browser client with enhanced PKCE support...')
  
  const client = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        debug: process.env.NODE_ENV === 'development',
        
        // REMOVED: Custom storage to ensure native PKCE cookie naming compatibility with server
        
        // Enhanced session recovery settings
        storageKey: 'supabase.auth.token',
        
        // Extend token refresh timing for better stability
        refreshTokenRotationEnabled: true,
        refreshTokenGracePeriod: 3600, // 1 hour grace period
      },
      
      // Enhanced real-time settings for session synchronization
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    }
  )
  
  // Add session recovery helper to client (non-interfering with PKCE)
  client.sessionRecovery = async () => {
    console.log('🔄 Manual session recovery requested...')
    
    try {
      const { data, error } = await client.auth.refreshSession()
      if (error) throw error
      
      console.log('✅ Session recovery successful')
      return { success: true, session: data.session }
    } catch (error) {
      console.error('❌ Session recovery failed:', error)
      return { success: false, error: error.message }
    }
  }
  
  // Add manual session backup to localStorage (for recovery only, not PKCE)
  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      try {
        // Store session backup for recovery (separate from PKCE flow)
        localStorage.setItem('supabase_session_backup', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          timestamp: Date.now()
        }))
        console.log('💾 Session backup stored for recovery')
      } catch (error) {
        console.warn('⚠️ Could not store session backup:', error)
      }
    } else if (event === 'SIGNED_OUT') {
      try {
        localStorage.removeItem('supabase_session_backup')
        console.log('🗑️ Session backup cleared')
      } catch (error) {
        console.warn('⚠️ Could not clear session backup:', error)
      }
    }
  })
  
  // Enhanced session listener for debugging
  if (process.env.NODE_ENV === 'development') {
    client.auth.onAuthStateChange((event, session) => {
      console.log(`🔐 Auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
      })
    })
  }
  
  console.log('✅ Supabase client created with native PKCE support and session recovery')
  return client
}