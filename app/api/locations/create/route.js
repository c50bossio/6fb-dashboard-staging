import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    const body = await request.json()
    
    console.log('🔍 Location creation attempt:', { body })
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('🔍 Auth check:', { user: user?.id, authError: authError?.message })
    
    if (authError || !user) {
      console.log('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    console.log('🔍 Profile check:', { profile, profileError: profileError?.message })

    if (!profile) {
      console.log('❌ Profile not found for user:', user.id)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userRole = profile.role || 'CLIENT'
    console.log('🔍 User role:', userRole)
    
    // Check if user has permission to create locations
    // Allow SHOP_OWNER to create locations for their business
    if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN', 'SHOP_OWNER'].includes(userRole)) {
      return NextResponse.json({ 
        error: 'Insufficient permissions to create locations',
        message: 'You need to be a shop owner or have enterprise permissions to create locations.'
      }, { status: 403 })
    }

    // Validate required fields
    const { name, address, city, state, phone, email } = body
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }

    // Prepare location data
    const locationData = {
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      owner_id: user.id,
      organization_id: profile.organization_id || null, // Allow null for individual shop owners
      is_active: true, // Use is_active instead of location_status
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('🔍 Attempting to create location with data:', locationData)

    // Create the location
    const { data: newLocation, error: createError } = await supabase
      .from('barbershops')
      .insert([locationData])
      .select()
      .single()

    console.log('🔍 Database result:', { newLocation, createError })

    if (createError) {
      console.error('❌ Error creating location:', createError)
      return NextResponse.json({ 
        error: 'Failed to create location', 
        details: createError.message,
        hint: createError.hint 
      }, { status: 500 })
    }

    // Format response to match expected structure
    const formattedLocation = {
      id: newLocation.id,
      name: newLocation.name,
      location: `${newLocation.city || ''}, ${newLocation.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Location not set',
      address: newLocation.address,
      city: newLocation.city,
      state: newLocation.state,
      phone: newLocation.phone,
      email: newLocation.email
    }

    return NextResponse.json({
      success: true,
      location: formattedLocation,
      message: 'Location created successfully'
    })

  } catch (error) {
    console.error('Error in create location API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}