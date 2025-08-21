import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('Auth callback error:', error, errorDescription)
    return NextResponse.redirect(new URL('/auth/error?message=' + encodeURIComponent(errorDescription || error), requestUrl.origin))
  }

  if (code) {
    const supabase = createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(new URL('/auth/error?message=' + encodeURIComponent(exchangeError.message), requestUrl.origin))
    }
  }

  // URL to redirect to after sign in process completes
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard'
  return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
}