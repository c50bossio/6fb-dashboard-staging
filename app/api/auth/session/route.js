import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  const cookieStore = cookies()
  const { searchParams } = new URL(request.url)
  const includeProfile = searchParams.get('profile') === 'true'
  const validateConsistency = searchParams.get('validate') === 'true'
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
          }
        },
      },
    }
  )
  
  try {
    
    // Enhanced session retrieval with multiple checks
    const { data: { session }, error } = await supabase.auth.getSession()
    const timestamp = new Date().toISOString()
    
    if (error) {
      console.error('❌ Session API: Session retrieval error:', error.message)
      return NextResponse.json({ 
        authenticated: false, 
        error: error.message,
        timestamp,
        source: 'session_retrieval'
      })
    }
    
    if (session?.user) {
      
      const responseData = {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata,
          email_confirmed: session.user.email_confirmed_at !== null,
          phone_confirmed: session.user.phone_confirmed_at !== null,
          last_sign_in: session.user.last_sign_in_at
        },
        session: {
          access_token: !!session.access_token,
          refresh_token: !!session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_at ? Math.max(0, session.expires_at - Math.floor(Date.now() / 1000)) : null
        },
        timestamp,
        source: 'valid_session'
      }
      
      // Include profile data if requested
      if (includeProfile) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profileError) {
            console.warn('⚠️ Session API: Profile fetch error:', profileError.message)
            responseData.profile_error = profileError.message
          } else if (profile) {
            responseData.profile = profile
          }
        } catch (profileErr) {
          console.error('💥 Session API: Profile fetch exception:', profileErr)
          responseData.profile_error = profileErr.message
        }
      }
      
      // Perform consistency validation if requested
      if (validateConsistency) {
        try {
          
          // Check if user exists in auth.users
          const { data: authUser, error: authError } = await supabase.auth.getUser()
          
          responseData.consistency_check = {
            auth_user_exists: !authError && !!authUser?.user,
            session_user_match: !authError && authUser?.user?.id === session.user.id,
            timestamp: new Date().toISOString()
          }
          
          if (authError) {
            console.warn('⚠️ Session API: Auth user check error:', authError.message)
            responseData.consistency_check.auth_error = authError.message
          }
        } catch (consistencyErr) {
          console.error('💥 Session API: Consistency check failed:', consistencyErr)
          responseData.consistency_check = {
            error: consistencyErr.message,
            timestamp: new Date().toISOString()
          }
        }
      }
      
      return NextResponse.json(responseData)
    }
    
    return NextResponse.json({ 
      authenticated: false,
      message: 'No active session',
      timestamp,
      source: 'no_session'
    })
    
  } catch (err) {
    console.error('💥 Session API: Unexpected error:', err)
    return NextResponse.json({ 
      authenticated: false,
      error: err.message,
      timestamp: new Date().toISOString(),
      source: 'exception'
    }, { status: 500 })
  }
}

// Add POST endpoint for session recovery operations
export async function POST(request) {
  const cookieStore = cookies()
  
  try {
    const body = await request.json()
    const { action } = body
    
    
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
            } catch (error) {
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
            }
          },
        },
      }
    )
    
    switch (action) {
      case 'refresh':
        const { data, error } = await supabase.auth.refreshSession()
        
        if (error) {
          return NextResponse.json({
            success: false,
            error: error.message,
            action: 'refresh'
          })
        }
        
        return NextResponse.json({
          success: true,
          session: {
            user: data.session?.user,
            expires_at: data.session?.expires_at
          },
          action: 'refresh'
        })
      
      case 'validate':
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        return NextResponse.json({
          success: !sessionError,
          authenticated: !!session?.user,
          error: sessionError?.message,
          action: 'validate'
        })
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          validActions: ['refresh', 'validate']
        }, { status: 400 })
    }
    
  } catch (err) {
    console.error('💥 Session API POST: Error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 })
  }
}