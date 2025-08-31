import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userRole = profile.role || 'CLIENT'
    
    // Check if user has permission to create locations
    if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)) {
      // Return upgrade prompt instead of just an error
      return NextResponse.json({ 
        error: 'Enterprise subscription required',
        requiresUpgrade: true,
        upgradeInfo: {
          title: '🚀 Unlock Multi-Location Management with Enterprise',
          message: 'Managing multiple locations requires an Enterprise subscription.',
          benefits: [
            '✅ Unlimited location management',
            '✅ Centralized reporting across all shops',
            '✅ Bulk staff management across locations',
            '✅ Advanced analytics and insights',
            '✅ Custom branding per location',
            '✅ Priority support and training'
          ],
          ctaText: 'Upgrade to Enterprise',
          ctaLink: '/dashboard/settings/billing?plan=enterprise',
          alternativeText: 'Learn More',
          alternativeLink: '/pricing#enterprise'
        }
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
      organization_id: profile.organization_id,
      location_status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Create the location
    const { data: newLocation, error: createError } = await supabase
      .from('barbershops')
      .insert([locationData])
      .select()
      .single()

    if (createError) {
      console.error('Error creating location:', createError)
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
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