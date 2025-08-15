import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  
  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }
  
  try {
    console.log('🔍 Looking up user profile for:', email)
    
    // Query profiles table with service role key (bypasses RLS)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        subscription_status,
        stripe_customer_id,
        shop_name,
        onboarding_completed,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .single()
    
    if (profileError) {
      console.log('❌ Profile query error:', profileError)
      return NextResponse.json({
        found: false,
        error: profileError.message,
        email: email
      })
    }
    
    if (!profile) {
      return NextResponse.json({
        found: false,
        message: 'No profile found',
        email: email
      })
    }
    
    console.log('✅ Profile found:', profile.email)
    
    // Also check auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id)
    
    return NextResponse.json({
      found: true,
      profile: {
        ...profile,
        stripe_customer_id: profile.stripe_customer_id ? 'present' : null
      },
      authUser: authError ? null : {
        id: authUser.user?.id,
        email: authUser.user?.email,
        email_confirmed_at: authUser.user?.email_confirmed_at,
        last_sign_in_at: authUser.user?.last_sign_in_at,
        created_at: authUser.user?.created_at
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('💥 User lookup error:', error)
    return NextResponse.json({
      found: false,
      error: error.message,
      email: email
    }, { status: 500 })
  }
}