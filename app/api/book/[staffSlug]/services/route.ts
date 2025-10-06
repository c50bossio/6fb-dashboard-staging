/**
 * Public Staff Services API
 * Feature: 011-holistic-staff-management
 *
 * GET /api/book/[staffSlug]/services
 * Returns available services for this staff member
 * No authentication required - public endpoint
 */

import { createClient } from '@/lib/supabase/client'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { staffSlug: string } }
) {
  try {
    const supabase = createClient()
    const { staffSlug } = params

    // 1. Get staff member by slug
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, barbershop_id')
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // 2. Get all active services for this barbershop
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(`
        id,
        name,
        description,
        duration_minutes,
        price_cents,
        category
      `)
      .eq('barbershop_id', profile.barbershop_id)
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (servicesError) {
      console.error('Error fetching services:', servicesError)
      return NextResponse.json(
        { error: 'Failed to fetch services' },
        { status: 500 }
      )
    }

    // 3. Format response with price in dollars
    const formattedServices = services?.map(service => ({
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.duration_minutes,
      price: (service.price_cents / 100).toFixed(2),
      priceCents: service.price_cents,
      category: service.category
    })) || []

    return NextResponse.json({
      barberId: profile.id,
      services: formattedServices
    })
  } catch (error) {
    console.error('Error fetching services:', error)
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    )
  }
}
