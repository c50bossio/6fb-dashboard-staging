import { createBrowserClient } from '@supabase/ssr'

// Enhanced cookie management for better session persistence
function getCookie(name) {
  if (typeof document === 'undefined') return undefined
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop().split(';').shift()
    try {
      return decodeURIComponent(cookieValue)
    } catch {
      return cookieValue
    }
  }
  return undefined
}

function setCookie(name, value, options = {}) {
  if (typeof document === 'undefined') return
  
  const {
    maxAge = 60 * 60 * 24 * 30, // 30 days default
    path = '/',
    domain,
    secure = window.location.protocol === 'https:',
    sameSite = 'lax'
  } = options
  
  try {
    // Enhanced encoding to handle special characters better
    const encodedValue = encodeURIComponent(value).replace(/[!'()*]/g, (c) => 
      '%' + c.charCodeAt(0).toString(16).toUpperCase()
    )
    
    let cookieString = `${name}=${encodedValue}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`
    
    // Chrome/Safari compatibility: Only add Secure flag when actually using HTTPS
    if (secure && window.location.protocol === 'https:') {
      cookieString += '; Secure'
    }
    
    // Don't set domain for localhost (Chrome/Safari compatibility)
    if (domain && !domain.includes('localhost') && !domain.includes('127.0.0.1')) {
      cookieString += `; Domain=${domain}`
    }
    
    document.cookie = cookieString
    console.log(`🍪 Set cookie: ${name} (${encodedValue.substring(0, 20)}...)`)
  } catch (error) {
    console.error(`❌ Failed to set cookie ${name}:`, error)
  }
}

function deleteCookie(name, options = {}) {
  if (typeof document === 'undefined') return
  
  const { path = '/', domain } = options
  let cookieString = `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:01 GMT`
  
  if (domain) cookieString += `; Domain=${domain}`
  
  document.cookie = cookieString
  console.log(`🗑️ Deleted cookie: ${name}`)
}

export function createClient() {
  // For development testing - use placeholder values if not configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  
  console.log('🔐 Creating Supabase client:')
  console.log('  URL:', supabaseUrl)
  console.log('  Key:', supabaseAnonKey?.substring(0, 30) + '...')
  console.log('  Using real client:', !supabaseUrl.includes('placeholder'))
  
  if (supabaseUrl.includes('placeholder') || supabaseAnonKey.includes('placeholder')) {
    console.warn('⚠️ Using placeholder Supabase configuration for development testing')
    // Return a comprehensive mock client for testing
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        signInWithOAuth: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        resetPasswordForEmail: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        updateUser: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        onAuthStateChange: (callback) => {
          // Call the callback immediately with no session to simulate logged-out state
          setTimeout(() => callback('SIGNED_OUT', null), 0)
          // Return mock subscription object
          return {
            data: {
              subscription: {
                unsubscribe: () => console.log('Mock auth listener unsubscribed')
              }
            }
          }
        }
      },
      from: (table) => ({
        select: (columns = '*') => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
            then: (callback) => callback({ data: [], error: null })
          }),
          limit: (count) => Promise.resolve({ data: [], error: null }),
          then: (callback) => callback({ data: [], error: null })
        }),
        insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
            })
          })
        }),
        delete: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      })
    }
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return getCookie(name)
      },
      set(name, value, options) {
        // Ensure cookies are set with proper persistence options
        const enhancedOptions = {
          ...options,
          maxAge: options?.maxAge || 60 * 60 * 24 * 30, // 30 days default
          path: '/',
          sameSite: 'lax',
          secure: window.location.protocol === 'https:'
        }
        setCookie(name, value, enhancedOptions)
      },
      remove(name, options) {
        deleteCookie(name, options)
      }
    },
    auth: {
      persistSession: true, // Explicitly enable session persistence
      autoRefreshToken: true, // Enable automatic token refresh
      detectSessionInUrl: true, // Detect OAuth callbacks
      storageKey: 'sb-auth-token', // Consistent storage key
      storage: {
        // Enhanced storage with browser compatibility checks
        getItem: (key) => {
          try {
            // Try localStorage first (preferred for Chrome/Safari)
            if (typeof window !== 'undefined' && window.localStorage) {
              const item = window.localStorage.getItem(key)
              if (item) {
                console.log(`📦 Retrieved from localStorage: ${key}`)
                return item
              }
            }
          } catch (error) {
            console.warn(`⚠️ LocalStorage getItem failed for ${key}:`, error)
          }
          
          try {
            // Fall back to cookies
            const cookieValue = getCookie(key)
            if (cookieValue) {
              console.log(`🍪 Retrieved from cookies: ${key}`)
              return cookieValue
            }
          } catch (error) {
            console.warn(`⚠️ Cookie get failed for ${key}:`, error)
          }
          
          return null
        },
        setItem: (key, value) => {
          try {
            // Store in localStorage (primary for Chrome/Safari)
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(key, value)
              console.log(`📦 Stored in localStorage: ${key}`)
            }
          } catch (error) {
            console.warn(`⚠️ LocalStorage setItem failed for ${key}:`, error)
          }
          
          try {
            // Also store in cookies as backup
            setCookie(key, value, { 
              maxAge: 60 * 60 * 24 * 30,
              sameSite: 'lax',
              // Chrome/Safari: don't set secure flag on localhost
              secure: window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')
            })
          } catch (error) {
            console.warn(`⚠️ Cookie set failed for ${key}:`, error)
          }
        },
        removeItem: (key) => {
          try {
            // Remove from localStorage
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(key)
              console.log(`🗑️ Removed from localStorage: ${key}`)
            }
          } catch (error) {
            console.warn(`⚠️ LocalStorage removeItem failed for ${key}:`, error)
          }
          
          try {
            // Remove from cookies
            deleteCookie(key)
          } catch (error) {
            console.warn(`⚠️ Cookie deletion failed for ${key}:`, error)
          }
        }
      }
    }
  })
}