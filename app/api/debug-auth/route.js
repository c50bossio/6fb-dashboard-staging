import { NextResponse } from 'next/server'

import { createClient } from '../../../lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get current session
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        session: null,
        user: null
      })
    }
    
    // Get user profile if authenticated
    let profile = null
    if (session?.user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      profile = profileData
    }
    
    return NextResponse.json({
      success: true,
      session: session ? {
        user: {
          id: session.user.id,
          email: session.user.email
        },
        expires_at: session.expires_at
      } : null,
      profile,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      session: null,
      user: null
    })
  }
}