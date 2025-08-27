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
      // console.error('Error fetching staff:', staffError)
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
      // console.error('Error fetching staff profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch staff details' }, { status: 500 })
    }

    // Combine staff data with profile information - SIMPLIFIED
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles.find(p => p.id === staffMember.user_id)
      
      // Simple name handling - store exactly what we have
      let firstName = '', lastName = '', fullName = profile?.full_name || ''
      
      // If we have a full name, split it simply
      if (fullName && fullName.trim()) {
        const parts = fullName.trim().split(' ')
        firstName = parts[0] || ''
        lastName = parts.slice(1).join(' ') || ''
      }
      
      return {
        // STANDARDIZED: Use user_id as primary identifier
        id: staffMember.user_id,       // PRIMARY ID for all API calls
        user_id: staffMember.user_id,  // Explicit user ID field
        staff_id: staffMember.id,       // barbershop_staff.id for reference only
        barbershop_id: staffMember.barbershop_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        created_at: staffMember.created_at,
        // Simple name fields
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        // Simple display name - just combine what we have
        display_name: fullName || profile?.email || 'Staff Member',
        // Include the raw user data for reference
        user: profile
      }
    })

    return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      barbershop_id: barbershopId,
      count: staffWithProfiles.length
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}