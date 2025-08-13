// Simplified OAuth callback following Supabase best practices
import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    
    // Simple exchange - let Supabase handle all PKCE complexity
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth exchange error:', error.message)
      // Redirect to error page with error details
      return NextResponse.redirect(`${origin}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`)
    }
    
    // Successful authentication - check if user needs onboarding
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      // If no profile or incomplete profile, redirect to welcome
      if (!profile || !profile.shop_name) {
        // Create basic profile if it doesn't exist
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            role: 'SHOP_OWNER',
            created_at: new Date().toISOString()
          })
        }
        return NextResponse.redirect(`${origin}/welcome`)
      }
      
      // Profile exists and is complete, go to dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}