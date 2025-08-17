import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const barbershop_id = searchParams.get('barbershop_id')
    const location_id = searchParams.get('location_id')
    const active_only = searchParams.get('active_only') !== 'false'

    // First, try to get the barbershop_id from user's profile if not provided
    let targetBarbershopId = barbershop_id
    
    if (!targetBarbershopId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', user.id)
        .single()
      
      targetBarbershopId = profile?.barbershop_id
    }
    
    // If location_id is provided and it's not 'default', use it as barbershop_id
    if (location_id && location_id !== 'default') {
      targetBarbershopId = location_id
    }

    // First try to get barbers from the barbers table (created during onboarding)
    let barbersQuery = supabase
      .from('barbers')
      .select('*')
      .order('name', { ascending: true })

    if (targetBarbershopId) {
      barbersQuery = barbersQuery.eq('shop_id', targetBarbershopId)
    }

    if (active_only) {
      barbersQuery = barbersQuery.eq('is_active', true)
    }

    const { data: barbers, error: barbersError } = await barbersQuery

    // If we found barbers in the barbers table, format and return them
    if (barbers && barbers.length > 0) {
      const formattedBarbers = barbers.map(barber => ({
        id: barber.id,
        name: barber.name || 'Unnamed Barber',
        email: barber.email,
        phone: barber.phone,
        avatar_url: barber.avatar_url,
        title: barber.specialties?.[0] || 'Barber',
        experience: `${barber.experience_years || 0} years`,
        rating: barber.rating || 4.5,
        bio: barber.bio || 'Professional barber',
        specialties: barber.specialties || [],
        availability: barber.availability || 'full_time',
        chair_number: barber.chair_number,
        instagram_handle: barber.instagram_handle,
        languages: barber.languages || ['English'],
        is_active: barber.is_active,
        barbershop_id: barber.shop_id
      }))

      return NextResponse.json({
        barbers: formattedBarbers,
        total: formattedBarbers.length,
        source: 'barbers_table'
      })
    }

    // Fallback to barbershop_staff table if no barbers found in barbers table
    let staffQuery = supabase
      .from('barbershop_staff')
      .select(`
        *,
        user:users(id, name, email, phone, avatar_url),
        barbershop:barbershops(id, name, business_hours)
      `)
      .in('role', ['BARBER', 'SHOP_OWNER'])
      .order('started_at', { ascending: true })

    if (targetBarbershopId) {
      staffQuery = staffQuery.eq('barbershop_id', targetBarbershopId)
    }

    if (active_only) {
      staffQuery = staffQuery.eq('is_active', true)
    }

    const { data: staff, error: staffError } = await staffQuery

    if (staffError) {
      console.error('Database query failed:', staffError.message)
      return NextResponse.json({ 
        error: 'Failed to fetch barbers',
        details: staffError.message 
      }, { status: 500 })
    }

    const formattedBarbers = (staff || []).map(staffMember => ({
      id: staffMember.user?.id || staffMember.id,
      name: staffMember.user?.name || 'Unnamed Staff',
      email: staffMember.user?.email,
      phone: staffMember.user?.phone,
      avatar_url: staffMember.user?.avatar_url,
      role: staffMember.role,
      commission_rate: staffMember.commission_rate,
      is_active: staffMember.is_active,
      started_at: staffMember.started_at,
      barbershop_id: staffMember.barbershop_id,
      barbershop_name: staffMember.barbershop?.name,
      business_hours: staffMember.barbershop?.business_hours
    }))

    return NextResponse.json({
      barbers: formattedBarbers,
      total: formattedBarbers.length,
      source: 'barbershop_staff_table'
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/barbers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}