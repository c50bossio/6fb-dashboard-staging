import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'}/dashboard`
      }
    })
    
    if (error) {
      console.error('Magic link error:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to send magic link' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Magic link sent to your email' 
    })
    
  } catch (error) {
    console.error('Magic link error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}