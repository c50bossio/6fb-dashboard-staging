import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  const cookieStore = cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({ 
        authenticated: false, 
        error: error.message 
      })
    }
    
    if (session) {
      return NextResponse.json({ 
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata
        },
        expires_at: session.expires_at
      })
    }
    
    return NextResponse.json({ 
      authenticated: false,
      message: 'No active session'
    })
    
  } catch (err) {
    return NextResponse.json({ 
      authenticated: false,
      error: err.message 
    }, { status: 500 })
  }
}