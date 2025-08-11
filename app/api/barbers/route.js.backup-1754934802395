'use server'

import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

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

    // For demo/development, return mock data when database tables don't exist
    const mockBarbers = [
      {
        id: 'barber-001',
        name: 'John Smith',
        email: 'john@barbershop.com',
        phone: '555-0101',
        avatar_url: null,
        role: 'BARBER',
        barbershop_id: barbershop_id || 'demo-shop-001',
        specialties: ['Haircut', 'Beard Trim', 'Shave'],
        is_active: true,
        rating: 4.8,
        business_hours: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '18:00' },
          friday: { start: '09:00', end: '18:00' },
          saturday: { start: '10:00', end: '16:00' },
          sunday: null
        }
      },
      {
        id: 'barber-002',
        name: 'Mike Johnson',
        email: 'mike@barbershop.com',
        phone: '555-0102',
        avatar_url: null,
        role: 'BARBER',
        barbershop_id: barbershop_id || 'demo-shop-001',
        specialties: ['Fade', 'Design', 'Color'],
        is_active: true,
        rating: 4.9,
        business_hours: {
          monday: { start: '10:00', end: '19:00' },
          tuesday: { start: '10:00', end: '19:00' },
          wednesday: { start: '10:00', end: '19:00' },
          thursday: { start: '10:00', end: '19:00' },
          friday: { start: '10:00', end: '19:00' },
          saturday: { start: '09:00', end: '17:00' },
          sunday: null
        }
      },
      {
        id: 'barber-003',
        name: 'Sarah Williams',
        email: 'sarah@barbershop.com',
        phone: '555-0103',
        avatar_url: null,
        role: 'BARBER',
        barbershop_id: barbershop_id || 'demo-shop-001',
        specialties: ['Style', 'Coloring', 'Extensions'],
        is_active: true,
        rating: 5.0,
        business_hours: {
          monday: null,
          tuesday: { start: '11:00', end: '19:00' },
          wednesday: { start: '11:00', end: '19:00' },
          thursday: { start: '11:00', end: '19:00' },
          friday: { start: '11:00', end: '20:00' },
          saturday: { start: '10:00', end: '18:00' },
          sunday: { start: '12:00', end: '17:00' }
        }
      }
    ]

    // Filter by active status
    const barbers = active_only ? mockBarbers.filter(b => b.is_active) : mockBarbers
    
    // Try to fetch from database, fallback to mock data
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
      console.warn('Database query failed, using mock data:', error.message)
      return NextResponse.json({ barbers }, { status: 200 })
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
      barbers,
      total: barbers.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/barbers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}