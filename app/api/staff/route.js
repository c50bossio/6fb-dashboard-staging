import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    // Get user session for barbershop context
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to find their barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', session.user.email)
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

    if (!staff || staff.length === 0) {
      return NextResponse.json({ 
        staff: [],
        message: 'No active staff found for this barbershop'
      })
    }

    // Get profile details for each staff member
    const userIds = staff.map(s => s.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching staff profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch staff details' }, { status: 500 })
    }

    // Combine staff data with profile information
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles.find(p => p.id === staffMember.user_id)
      return {
        user_id: staffMember.user_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        full_name: profile?.full_name || 'Unknown',
        email: profile?.email || '',
        avatar_url: profile?.avatar_url || null,
        display_name: profile?.full_name || profile?.email?.split('@')[0] || 'Staff Member'
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