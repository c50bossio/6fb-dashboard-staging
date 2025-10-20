/**
 * Public Staff Profile API
 * Feature: 011-holistic-staff-management
 *
 * GET /api/book/[staffSlug]
 * Returns public staff profile information for booking page
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

    // Fetch staff profile by booking slug
    // Note: Using barbershop_id!inner to explicitly specify the foreign key relationship
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        bio,
        specialties,
        avatar_url,
        phone,
        barbershop_id,
        barbershops!barbershop_id (
          id,
          name,
          address,
          city,
          state,
          zip_code,
          phone
        )
      `)
      .eq('booking_slug', staffSlug)
      .eq('role', 'BARBER') // Only barbers have public booking pages
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    // Return sanitized public profile
    return NextResponse.json({
      id: profile.id,
      name: profile.full_name, // Map full_name to name for frontend compatibility
      bio: profile.bio,
      specialties: profile.specialties || [],
      image: profile.avatar_url, // Map avatar_url to image for frontend compatibility
      phone: profile.phone,
      barbershop: profile.barbershops
    })
  } catch (error) {
    console.error('Error fetching staff profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff profile' },
      { status: 500 }
    )
  }
}
