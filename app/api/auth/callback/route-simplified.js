import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('OAuth exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`)
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (!profile || !profile.shop_name) {
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
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login`)
}