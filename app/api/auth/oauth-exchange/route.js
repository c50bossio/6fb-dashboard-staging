import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const { code } = await request.json()
    
    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    // Try to exchange the code directly
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      // Check if session exists anyway
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        return NextResponse.json({ 
          success: true, 
          session,
          recovered: true 
        })
      }
      
      return NextResponse.json({ 
        error: error.message,
        details: error 
      }, { status: 400 })
    }
    
    if (data?.session) {
      return NextResponse.json({ 
        success: true, 
        session: data.session 
      })
    }
    
    return NextResponse.json({ 
      error: 'No session created' 
    }, { status: 400 })
    
  } catch (error) {
    console.error('OAuth exchange error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 })
  }
}