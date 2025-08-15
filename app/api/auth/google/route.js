import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url)
    const next = requestUrl.searchParams.get('next') || '/dashboard'
    const redirectTo = `${requestUrl.origin}/api/auth/callback`
    
    console.log('🔐 Google OAuth initiation requested')
    console.log('   Redirect URL:', redirectTo)
    console.log('   Next URL:', next)
    
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          next: next
        }
      }
    })
    
    if (error) {
      console.error('❌ Google OAuth initiation failed:', error.message)
      return NextResponse.json(
        { error: 'OAuth initiation failed', details: error.message },
        { status: 500 }
      )
    }
    
    if (data?.url) {
      console.log('✅ Google OAuth URL generated successfully')
      console.log('   OAuth URL:', data.url.substring(0, 100) + '...')
      
      return NextResponse.redirect(data.url)
    }
    
    console.error('❌ No OAuth URL returned from Supabase')
    return NextResponse.json(
      { error: 'No OAuth URL generated' },
      { status: 500 }
    )
    
  } catch (error) {
    console.error('❌ Unexpected error in Google OAuth initiation:', error)
    return NextResponse.json(
      { error: 'Unexpected error', details: error.message },
      { status: 500 }
    )
  }
}