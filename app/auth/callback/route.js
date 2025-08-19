import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  if (code) {
    const cookieStore = cookies()
    
    // Create Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch {
              // Server component cookie handling - this is expected
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch {
              // Server component cookie handling - this is expected
            }
          },
        },
      }
    )
    
    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Successfully authenticated - redirect to dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  
  // Auth failed - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}