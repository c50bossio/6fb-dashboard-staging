/**
 * RBAC-Aware Bookings API
 * Feature: 011-holistic-staff-management
 *
 * GET /api/bookings - Fetch bookings filtered by user role
 * - Barbers: Only see their own bookings
 * - Managers: See bookings for managed locations
 * - Admins/Receptionists: See all bookings for their barbershop
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, filterBookingsByRole, unauthorizedResponse } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  try {
    // Authenticate and get user with role
    const user = await requireAuth(request)

    if (!user) {
      return unauthorizedResponse()
    }

    const supabase = createClient()
    const { searchParams } = new URL(request.url)

    // Extract query parameters
    const barbershopId = searchParams.get('barbershop_id') || user.barbershop_id
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const status = searchParams.get('status')

    // Base query with all bookings info
    let query = supabase
      .from('bookings')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        status,
        booking_source,
        total_amount_cents,
        customer_name,
        customer_email,
        customer_phone,
        barber:profiles!bookings_barber_id_fkey(
          id,
          name,
          image,
          booking_slug
        ),
        service:services(
          id,
          name,
          duration_minutes,
          price_cents
        )
      `)
      .order('scheduled_at', { ascending: true })

    // Apply RBAC filtering based on user role
    query = filterBookingsByRole(query, user, barbershopId)

    // Apply date filters
    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }
    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }
    if (status) {
      query = query.eq('status', status.toUpperCase())
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    // Return bookings with metadata
    return NextResponse.json({
      bookings: bookings || [],
      userRole: user.role,
      filter: {
        barbershopId,
        role: user.role,
        managedLocations: user.managed_locations
      }
    })
  } catch (error) {
    console.error('Error in bookings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
