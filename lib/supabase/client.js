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
    maxAge = 60 * 60 * 24 * 365, // 1 year default
    path = '/',
    domain,
    secure = window.location.protocol === 'https:',
    sameSite = 'lax'
  } = options
  
  let cookieString = `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; SameSite=${sameSite}`
  
  if (secure) cookieString += '; Secure'
  if (domain) cookieString += `; Domain=${domain}`
  
  document.cookie = cookieString
  console.log(`🍪 Set cookie: ${name} (${value.substring(0, 20)}...)`)
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
        setCookie(name, value, options)
      },
      remove(name, options) {
        deleteCookie(name, options)
      }
    }
  })
}