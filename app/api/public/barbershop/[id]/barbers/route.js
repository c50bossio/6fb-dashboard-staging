import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  try {
    const barbershopId = params.id
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }

    // Use simple client for public API - no auth needed
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // First check if barbershop exists and allows public booking
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, booking_settings')
      .eq('id', barbershopId)
      .single()

    if (barbershopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    // Check if public booking is enabled
    const bookingSettings = barbershop.booking_settings || {}
    const isPublicBookingEnabled = bookingSettings.allowPublicBooking !== false

    if (!isPublicBookingEnabled) {
      return NextResponse.json({
        success: false,
        error: 'Public booking is not available for this barbershop'
      }, { status: 403 })
    }

    // Get active staff for this barbershop
    const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barbershop_id,
        role,
        is_active,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (staffError) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch staff' 
      }, { status: 500 })
    }

    // If no staff, return empty array
    if (!staff || staff.length === 0) {
      return NextResponse.json({
        success: true,
        staff: [],
        count: 0,
        message: 'No active staff found for this barbershop'
      })
    }

    // Get public profile details for each staff member (only public info)
    const userIds = staff.map(s => s.user_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Error fetching staff profiles:', profilesError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch staff details' 
      }, { status: 500 })
    }

    // Combine staff data with public profile information
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles?.find(p => p.id === staffMember.user_id) || {}
      
      // Get display name from full_name or provide default
      let displayName = profile.full_name || 'Staff Member'
      
      // If full_name exists, use it directly; otherwise create a fallback
      if (!displayName || displayName.trim() === '') {
        displayName = `${staffMember.role === 'OWNER' ? 'Owner' : 'Barber'}`
      }
      
      return {
        // Use user_id as primary identifier for consistency
        id: staffMember.user_id,
        user_id: staffMember.user_id,
        staff_id: staffMember.id, // barbershop_staff.id for reference
        barbershop_id: staffMember.barbershop_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        created_at: staffMember.created_at,
        full_name: profile.full_name || '',
        display_name: displayName,
        avatar_url: profile.avatar_url || null,
        // Public-safe defaults for booking UI
        title: staffMember.role === 'OWNER' ? 'Owner/Master Barber' : 'Barber',
        experience: '5+ years',
        rating: 4.8,
        reviewCount: 0,
        specialties: ['Haircuts', 'Styling'],
        availability: 'Available',
        bio: `Professional ${staffMember.role.toLowerCase()} providing quality service`
      }
    })

    return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      count: staffWithProfiles.length,
      barbershop_id: barbershopId,
      barbershop_name: barbershop.name
    })

  } catch (error) {
    console.error('Public barbers API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}