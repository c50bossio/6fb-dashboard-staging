import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { locationIds } = body

    if (!locationIds || !Array.isArray(locationIds)) {
      return NextResponse.json({ 
        error: 'locationIds array is required' 
      }, { status: 400 })
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
        // Return empty result for new users instead of error
        return NextResponse.json({
          success: true,
          staff: [],
          locations: [],
          message: 'No barbershop found - setup required'
        })
      }
      
      barbershopId = ownedShops[0].id
    }

    // Get all active staff for this barbershop
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        user_id,
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

    // If no staff, return empty result
    if (!staff || staff.length === 0) {
      return NextResponse.json({
        success: true,
        staff: [],
        locations: [{ id: barbershopId, name: 'Main Location' }],
        message: 'No active staff found'
      })
    }

    // Get profile details for each staff member
    const userIds = staff.map(s => s.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, first_name, last_name, email')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching staff profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch staff details' }, { status: 500 })
    }

    // Transform staff data to match expected format
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles.find(p => p.id === staffMember.user_id)
      
      const displayName = profile?.full_name || 
                         `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
                         profile?.email?.split('@')[0] ||
                         'Staff Member'
      
      return {
        id: staffMember.user_id,
        user_id: staffMember.user_id,
        name: displayName,
        role: staffMember.role,
        is_active: staffMember.is_active,
        email: profile?.email || '',
        avatar_url: null, // Avatar URL not available in this schema
        location_id: barbershopId
      }
    })

    return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      locations: [{ 
        id: barbershopId, 
        name: 'Main Location',
        staff_count: staffWithProfiles.length 
      }],
      barbershop_id: barbershopId,
      total_staff: staffWithProfiles.length
    })

  } catch (error) {
    console.error('Calendar location-barbers API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  // Support GET method as fallback
  return POST(request)
}