import { NextResponse } from 'next/server'
import { getDisplayName, splitFullName, combineNames, normalizeNameData } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to find their barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get barbershop ID from profile
    let barbershopId = profile.shop_id || profile.barbershop_id

    if (!barbershopId) {
      // Check if user owns a barbershop
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)

      if (!ownedShops || ownedShops.length === 0) {
        return NextResponse.json({ error: 'No barbershop found for user' }, { status: 404 })
      }
      
      barbershopId = ownedShops[0].id
    }

    // Get all active staff for this barbershop
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barbershop_id,
        role,
        is_active,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    if (!staff || staff.length === 0) {
      return NextResponse.json({ 
        staff: [],
        message: 'No active staff found for this barbershop'
      })
    }

    // Get profile details for each staff member
    const userIds = staff.map(s => s.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching staff profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch staff details' }, { status: 500 })
    }

    // Combine staff data with profile information
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles.find(p => p.id === staffMember.user_id)
      
      // Normalize name data for consistent handling  
      // Note: users table only has full_name field, split it for compatibility
      const nameData = normalizeNameData({
        fullName: profile?.full_name
      })
      
      const displayName = getDisplayName({
        firstName: nameData.firstName,
        lastName: nameData.lastName,
        fullName: nameData.fullName,
        email: profile?.email,
        defaultName: 'Staff Member'
      })
      
      return {
        // STANDARDIZED: Use user_id as primary identifier
        id: staffMember.user_id,       // PRIMARY ID for all API calls
        user_id: staffMember.user_id,  // Explicit user ID field
        staff_id: staffMember.id,       // barbershop_staff.id for reference only
        barbershop_id: staffMember.barbershop_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        created_at: staffMember.created_at,
        // Provide both name formats for backward compatibility
        first_name: nameData.firstName,
        last_name: nameData.lastName,
        full_name: nameData.fullName,
        firstName: nameData.firstName, // camelCase version
        lastName: nameData.lastName,   // camelCase version
        fullName: nameData.fullName,   // camelCase version
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        display_name: displayName
      }
    })

    return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      barbershop_id: barbershopId,
      count: staffWithProfiles.length
    })

  } catch (error) {
    console.error('Staff API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}