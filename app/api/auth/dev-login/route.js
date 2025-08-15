import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  // Development-only endpoint for quick authentication
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  
  try {
    const supabase = createClient()
    
    // Use the test email we know exists
    const email = 'dev@bookedbarber.com'
    const password = 'Test123!@#' // You'll need to set this password
    
    // Try to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Dev login error:', error)
      
      // If login fails, try to create the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: 'Dev User'
          }
        }
      })
      
      if (signUpError) {
        return NextResponse.json({ 
          error: 'Failed to authenticate', 
          details: signUpError.message 
        }, { status: 401 })
      }
      
      // Sign in after signup
      const { data: newLoginData, error: newLoginError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (newLoginError) {
        return NextResponse.json({ 
          error: 'Failed to login after signup', 
          details: newLoginError.message 
        }, { status: 401 })
      }
      
      // Redirect to welcome page with session
      return NextResponse.redirect(new URL('/welcome', request.url))
    }
    
    // Successfully signed in, redirect to welcome
    return NextResponse.redirect(new URL('/welcome', request.url))
    
  } catch (error) {
    console.error('Unexpected error in dev login:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}