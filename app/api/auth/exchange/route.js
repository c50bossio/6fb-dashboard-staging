import { createBrowserClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ success: false, error: 'No code provided' })
    }
    
    // Create Supabase client
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Exchange error:', error)
      return NextResponse.json({ success: false, error: error.message })
    }
    
    if (data?.session) {
      console.log('Session created for:', data.session.user.email)
      return NextResponse.json({ 
        success: true, 
        user: {
          email: data.session.user.email,
          id: data.session.user.id
        }
      })
    }
    
    return NextResponse.json({ success: false, error: 'No session created' })
  } catch (err) {
    console.error('Exchange route error:', err)
    return NextResponse.json({ success: false, error: err.message })
  }
}