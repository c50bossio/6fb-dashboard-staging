import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Attempt to sign out on the server side
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      console.error('Server-side signOut error:', error)
      // Don't fail the request if server-side signout fails
      // Client-side cleanup is more important
    }
    
    // Create response
    const response = NextResponse.json({ success: true })
    
    // Clear any server-side auth cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token'
    ]
    
    cookiesToClear.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
    })
    
    return response
  } catch (error) {
    console.error('Signout API error:', error)
    // Still return success since client-side cleanup is primary
    return NextResponse.json({ success: true, warning: error.message })
  }
}