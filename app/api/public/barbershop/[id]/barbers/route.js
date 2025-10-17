import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request, { params }) {
  try {
    const barbershopId = params.id
    
    if (!barbershopId) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop ID is required'
      }, { status: 400 })
    }
    

    // Use service client to bypass RLS for public API
    // First check environment variables explicitly for better error messages
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Public barbers API: Missing required environment variables')
      console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
      console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing')

      return NextResponse.json({
        success: false,
        error: 'Database configuration error',
        details: 'Required Supabase environment variables are not set',
        troubleshooting: [
          'Check that .env.local exists in the project root',
          'Verify NEXT_PUBLIC_SUPABASE_URL is set',
          'Verify SUPABASE_SERVICE_ROLE_KEY is set',
          'Restart the Next.js development server after adding variables'
        ]
      }, { status: 503 }) // Service Unavailable
    }

    const supabase = createServiceClient()

    if (!supabase) {
      console.error('❌ Public barbers API: Failed to create service client despite env vars being present')
      return NextResponse.json({
        success: false,
        error: 'Service initialization error',
        details: 'Failed to create database client',
        troubleshooting: [
          'Check Supabase service status',
          'Verify environment variable values are correct',
          'Check server logs for additional errors'
        ]
      }, { status: 503 })
    }
    
    // // Debug log removed for production
// Use the barbershop ID directly - no mock handling
    const actualbarbershopId = barbershopId
    
    // First check if barbershop exists and allows public booking
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('id, name, booking_settings')
      .eq('id', actualbarbershopId)
      .single()

    if (barbershopError || !barbershop) {
      console.error('❌ Public barbers API: Barbershop not found')
      console.error('   Barbershop ID:', barbershopId)
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

    // Get staff who can take appointments for this barbershop from profiles table
    // Using role-based filtering since capability columns don't exist yet
    const { data: staff, error: staffError } = await supabase
      .from('profiles')
      .select(`
        id,
        barbershop_id,
        role,
        is_active,
        first_name,
        last_name,
        full_name,
        avatar_url,
        bio,
        specialties,
        created_at
      `)
      .eq('barbershop_id', actualbarbershopId)
      .eq('is_active', true)
      .in('role', ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'MANAGER'])
      .order('created_at', { ascending: true })
    
    // // Debug log removed for production
if (staffError) {
      console.error('❌ Public barbers API: Error fetching staff')
      console.error('   Error details:', staffError)
      console.error('   Barbershop ID:', barbershopId)
      console.error('   Actual ID used:', actualbarbershopId)
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
        barbershop_id: barbershopId,
        barbershop_name: barbershop?.name || 'Unknown',
        message: 'No active staff found for this barbershop'
      })
    }

    // Transform profile data to staff format (we already have all the data from profiles table)
    const staffWithProfiles = staff.map(profile => {
      // Use profile data directly since we're querying profiles table
      // Note: metadata column doesn't exist in profiles table, using direct fields only
      const firstName = profile.first_name || ''
      const lastName = profile.last_name || ''
      let fullName = profile.full_name || ''
      
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
      
      // Final fallback based on role (but ANY role can now appear if capabilities allow)
      if (!displayName || displayName.trim() === '' || displayName === 'Staff Member') {
        displayName = `${profile.role === 'SHOP_OWNER' || profile.role === 'ENTERPRISE_OWNER' ? 'Owner' : 
                        profile.role === 'MANAGER' ? 'Manager' : 'Service Provider'}`
      }
      
      return {
        // Use profile.id as primary identifier for consistency
        id: profile.id,
        user_id: profile.id,
        staff_id: profile.id,
        barbershop_id: profile.barbershop_id,
        role: profile.role,
        is_active: profile.is_active,
        created_at: profile.created_at,
        first_name: finalFirstName,
        last_name: finalLastName,
        full_name: fullName,
        display_name: displayName,
        avatar_url: profile.avatar_url || null,
        // Use actual bio and specialties from database if available
        bio: profile.bio || `Professional ${profile.role.toLowerCase().replace('_', ' ')} providing quality service`,
        specialties: profile.specialties && profile.specialties.length > 0
          ? profile.specialties
          : ['Haircuts', 'Styling'],
        // Public-safe defaults for booking UI
        title: profile.role === 'SHOP_OWNER' || profile.role === 'ENTERPRISE_OWNER' ? 'Owner/Master Barber' :
               profile.role === 'MANAGER' ? 'Service Manager' : 'Service Provider',
        experience: '5+ years',
        rating: 4.8,
        reviewCount: 0,
        availability: 'Available'
      }
    })

    // Return the actual staff from database
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