import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

// GET /api/barbers - Fetch barbers/staff
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const active_only = searchParams.get('active_only') !== 'false'

    // Fetch from database
    let query = supabase
      .from('barbershop_staff')
      .select(`
        *,
        user:users(id, name, email, phone, avatar_url),
        barbershop:barbershops(id, name, business_hours)
      `)
      .in('role', ['BARBER', 'SHOP_OWNER'])
      .order('started_at', { ascending: true })

    if (barbershop_id) {
      query = query.eq('barbershop_id', barbershop_id)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    const { data: staff, error } = await query

    if (error) {
      console.error('Database query failed:', error.message)
      return NextResponse.json({ 
        error: 'Failed to fetch barbers',
        details: error.message 
      }, { status: 500 })
    }

    // Format the response to make it easier to work with
    const formattedBarbers = staff.map(staffMember => ({
      id: staffMember.user.id,
      name: staffMember.user.name,
      email: staffMember.user.email,
      phone: staffMember.user.phone,
      avatar_url: staffMember.user.avatar_url,
      role: staffMember.role,
      commission_rate: staffMember.commission_rate,
      is_active: staffMember.is_active,
      started_at: staffMember.started_at,
      barbershop_id: staffMember.barbershop_id,
      barbershop_name: staffMember.barbershop.name,
      business_hours: staffMember.barbershop.business_hours
    }))

    return NextResponse.json({
      barbers: formattedBarbers,
      total: formattedBarbers.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/barbers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}