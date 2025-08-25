import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile with all necessary fields
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get barbershop ID from profile (check both possible field names)
    let barbershopId = profile.shop_id || profile.barbershop_id

    if (!barbershopId) {
      // Check if user owns a barbershop
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)

      if (ownedShops && ownedShops.length > 0) {
        barbershopId = ownedShops[0].id
      }
    }

    // For barber role users, check if they are active staff
    let isActiveBarber = false
    if (profile.role === 'BARBER' && barbershopId) {
      const { data: staffRecord } = await supabase
        .from('barbershop_staff')
        .select('is_active')
        .eq('user_id', profile.id)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      isActiveBarber = !!staffRecord
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        shop_id: profile.shop_id,
        barbershop_id: profile.barbershop_id,
        resolved_barbershop_id: barbershopId,
        is_active_barber: isActiveBarber
      },
      user: {
        id: user.id,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Profile API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}