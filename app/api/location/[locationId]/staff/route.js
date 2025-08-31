import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  try {
    const supabase = await createClient()
    const locationId = await params.locationId
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userRole = profile.role || 'CLIENT'
    
    // Check if user has permission to access staff data
    if (!['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN', 'BARBER', 'MANAGER'].includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Verify user has access to this location
    let hasAccess = false
    
    if (userRole === 'SUPER_ADMIN') {
      hasAccess = true
    } else if (userRole === 'SHOP_OWNER') {
      // Check if this is their shop or they're staff there
      const userShopId = profile.shop_id || profile.barbershop_id
      if (userShopId === locationId) {
        hasAccess = true
      } else {
        // Check if they're staff at this location
        const { data: staffRecord } = await supabase
          .from('barbershop_staff')
          .select('barbershop_id')
          .eq('user_id', user.id)
          .eq('barbershop_id', locationId)
          .eq('is_active', true)
          .single()
        
        hasAccess = !!staffRecord
      }
    } else if (userRole === 'ENTERPRISE_OWNER') {
      // Check if location belongs to their organization
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('organization_id')
        .eq('id', locationId)
        .single()
      
      hasAccess = barbershop?.organization_id === profile.organization_id
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to this location' }, { status: 403 })
    }

    // Get all staff for this location
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        role,
        is_active,
        created_at,
        users:user_id (
          id,
          email,
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq('barbershop_id', locationId)
      .eq('is_active', true)

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
    }

    // Format the response
    const formattedStaff = (staff || []).map(member => ({
      id: member.id,
      user_id: member.user_id,
      role: member.role,
      is_active: member.is_active,
      created_at: member.created_at,
      users: member.users
    }))

    return NextResponse.json({
      staff: formattedStaff,
      success: true
    })

  } catch (error) {
    console.error('Error fetching location staff:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}