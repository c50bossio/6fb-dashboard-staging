import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  
  console.log('🔐 Server callback processing code:', !!code)

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('📊 Code exchange result:', {
      hasSession: !!data?.session,
      hasUser: !!data?.session?.user,
      hasError: !!error,
      userEmail: data?.session?.user?.email
    })
    
    if (!error && data?.session) {
      console.log('✅ Server-side OAuth success, redirecting to dashboard')
      // Successful authentication - redirect to dashboard
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      console.error('❌ Server-side code exchange failed:', error)
      // Authentication failed - redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_code_exchange_failed`)
    }
  }

  console.log('⚠️ No code in server callback, redirecting to login')
  // No code parameter - redirect to login
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`)
}