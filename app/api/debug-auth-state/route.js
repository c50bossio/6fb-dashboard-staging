import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'No user found',
        details: 'User session not found or expired'
      })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, shop_id, barbershop_id, organization_id, full_name, email')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      profile: {
        found: !!profile,
        error: profileError?.message || null,
        data: profile || null
      },
      permissions: {
        canCreateLocations: profile ? ['ENTERPRISE_OWNER', 'SUPER_ADMIN', 'SHOP_OWNER'].includes(profile.role) : false,
        currentRole: profile?.role || 'UNKNOWN'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error.message
    }, { status: 500 })
  }
}