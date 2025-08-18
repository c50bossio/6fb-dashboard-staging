import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST() {
  
  try {
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
    
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('❌ Supabase signOut error:', error)
    } else {
    }
    
    const allCookies = cookieStore.getAll()
    
    const authCookies = allCookies.filter(cookie => 
      cookie.name.includes('sb-') || 
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth')
    )
    
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Complete session termination successful',
      clearedCookies: authCookies.map(c => c.name)
    })
    
    authCookies.forEach(cookie => {
      const clearOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        expires: new Date(0)
      }
      
      response.cookies.set(cookie.name, '', { ...clearOptions, path: '/' })
      response.cookies.set(cookie.name, '', { ...clearOptions, path: '/api' })
      response.cookies.set(cookie.name, '', { ...clearOptions, path: '/auth' })
    })
    
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response
    
  } catch (error) {
    console.error('❌ Force logout error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}