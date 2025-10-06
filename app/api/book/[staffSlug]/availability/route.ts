/**
 * Public Staff Availability API
 * Feature: 011-holistic-staff-management
 *
 * GET /api/book/[staffSlug]/availability?serviceId=xxx&startDate=2024-01-01&endDate=2024-01-31
 * Returns available time slots for booking
 * No authentication required - public endpoint
 */

import { createClient } from '@/lib/supabase/client'
import { calculateAvailableSlots } from '@/lib/availability-calculator'
import { NextRequest, NextResponse } from 'next/server'
import { addDays, parseISO } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { staffSlug: string } }
) {
  try {
    const supabase = createClient()
    const { staffSlug } = params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const serviceId = searchParams.get('serviceId')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'serviceId is required' },
        { status: 400 }
      )
    }

    // Get staff member by slug
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER')
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Parse dates (default: today to +30 days)
    const startDate = startDateParam ? parseISO(startDateParam) : new Date()
    const endDate = endDateParam ? parseISO(endDateParam) : addDays(new Date(), 30)

    // Calculate available slots using utility
    const slots = await calculateAvailableSlots(
      profile.id,
      serviceId,
      startDate,
      endDate,
      30 // 30-minute intervals
    )

    // Format response
    const formattedSlots = slots.map(slot => ({
      start: slot.start.toISOString(),
      end: slot.end.toISOString(),
      available: slot.available
    }))

    return NextResponse.json({
      barberId: profile.id,
      serviceId,
      slots: formattedSlots,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    })
  } catch (error) {
    console.error('Error calculating availability:', error)
    return NextResponse.json(
      { error: 'Failed to calculate availability' },
      { status: 500 }
    )
  }
}
