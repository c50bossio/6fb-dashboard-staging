import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request, { params }) {
  try {
    const barberbarbershopId = params.id
    
    if (!barberbarbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }
    

    // Use service client to bypass RLS for public API
    const supabase = createServiceClient()
    
    if (!supabase) {
      console.error('❌ Public barbers API: Failed to create service client')
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }
    
    // // Debug log removed for production
// Use the barbershop ID directly - no mock handling
    const actualBarberbarbershopId = barberbarbershopId
    
    // First check if barbershop exists and allows public booking
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, booking_settings')
      .eq('id', actualBarberbarbershopId)
      .single()

    if (barbershopError || !barbershop) {
      console.error('❌ Public barbers API: Barbershop not found')
      console.error('   Barbershop ID:', barberbarbershopId)
      console.error('   Error:', barbershopError)
      
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found or not available for public booking'
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
    // // Debug log removed for production
const { data: staff, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        barberbarbershop_id,
        role,
        is_active,
        created_at,
        metadata
      `)
      .eq('barberbarbershop_id', actualBarberbarbershopId)  // Use actualBarberbarbershopId instead of barberbarbershopId
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    
    // // Debug log removed for production
if (staffError) {
      console.error('❌ Public barbers API: Error fetching staff')
      console.error('   Error details:', staffError)
      console.error('   Barbershop ID:', barberbarbershopId)
      console.error('   Actual ID used:', actualBarberbarbershopId)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch staff' 
      }, { status: 500 })
    }

    // If no staff found, return empty array
    if (!staff || staff.length === 0) {
      // // Debug log removed for production
return NextResponse.json({
        success: true,
        staff: [],
        count: 0,
        barberbarbershop_id: barberbarbershopId,
        barbershop_name: barbershop?.name || 'Unknown',
        message: 'No active staff found for this barbershop'
      })
    }

    // Get public profile details for each staff member (only public info)
    const userIds = staff.map(s => s.user_id).filter(Boolean)
    
    // Skip profile fetch if no user IDs
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        staff: [],
        count: 0,
        barberbarbershop_id: barberbarbershopId,
        barbershop_name: barbershop.name,
        message: 'No active staff found for this barbershop'
      })
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name, avatar_url')
      .in('id', userIds)

    if (profilesError) {
      console.error('Warning: Could not fetch profiles, using staff metadata:', profilesError)
      // Don't fail - we can use metadata from barbershop_staff table as fallback
    }

    // Combine staff data with public profile information
    const staffWithProfiles = staff.map(staffMember => {
      const profile = profiles?.find(p => p.id === staffMember.user_id) || {}
      const metadata = staffMember.metadata || {}
      
      // Use profile first, then metadata, then empty string
      const firstName = profile.first_name || metadata.first_name || ''
      const lastName = profile.last_name || metadata.last_name || ''
      let fullName = profile.full_name || metadata.full_name || ''
      
      // If we don't have full_name but have first/last names, combine them
      if (!fullName && (firstName || lastName)) {
        fullName = `${firstName} ${lastName}`.trim()
      }
      
      // If we still don't have a name but have full_name, split it
      let finalFirstName = firstName
      let finalLastName = lastName
      if ((!firstName || !lastName) && fullName && fullName.trim()) {
        const parts = fullName.trim().split(' ')
        if (!finalFirstName) finalFirstName = parts[0] || ''
        if (!finalLastName) finalLastName = parts.slice(1).join(' ') || ''
      }
      
      // Get display name with proper fallbacks
      let displayName = fullName || `${finalFirstName} ${finalLastName}`.trim() || 'Staff Member'
      
      // Final fallback based on role
      if (!displayName || displayName.trim() === '' || displayName === 'Staff Member') {
        displayName = `${staffMember.role === 'OWNER' ? 'Owner' : 'Barber'}`
      }
      
      return {
        // Use user_id as primary identifier for consistency
        id: staffMember.user_id,
        user_id: staffMember.user_id,
        staff_id: staffMember.id, // barbershop_staff.id for reference
        barberbarbershop_id: staffMember.barberbarbershop_id,
        role: staffMember.role,
        is_active: staffMember.is_active,
        created_at: staffMember.created_at,
        first_name: finalFirstName,
        last_name: finalLastName,
        full_name: fullName,
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

    // Return the actual staff from database
    return NextResponse.json({
      success: true,
      staff: staffWithProfiles,
      count: staffWithProfiles.length,
      barberbarbershop_id: barberbarbershopId,
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