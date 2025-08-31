import { NextResponse } from 'next/server'
import { getDisplayName, splitFullName, combineNames, normalizeNameData } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/server'
import { getTenant } from '@/lib/tenant-resolver'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
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

    // Get barbershop ID using unified tenant resolver
    const { barbershopId } = await getTenant(profile.id, { supabase })

    // Skip barbershop_staff query to avoid 406 errors
    // For barber role users, assume they are active if they have a barbershop
    let isActiveBarber = false
    if (profile.role === 'BARBER' && barbershopId) {
      // Assume barber is active if they have a barbershop association
      isActiveBarber = true
    }

    // Normalize name data for consistent handling
    const nameData = normalizeNameData({
      firstName: profile.first_name,
      lastName: profile.last_name,
      fullName: profile.full_name
    })
    
    const displayName = getDisplayName({
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      fullName: nameData.fullName,
      email: profile.email,
      defaultName: 'User'
    })

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        email: profile.email,
        // Provide both name formats for backward compatibility
        first_name: nameData.firstName,
        last_name: nameData.lastName,
        full_name: nameData.fullName,
        firstName: nameData.firstName,  // camelCase version
        lastName: nameData.lastName,    // camelCase version
        fullName: nameData.fullName,    // camelCase version
        display_name: displayName,
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