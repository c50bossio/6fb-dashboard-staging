import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Calendar user-locations request for user:', user.email)

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    let locations = []

    // First, check if user has a direct barbershop association
    let barbershopId = profile.shop_id || profile.barbershop_id

    if (barbershopId) {
      // User has direct barbershop - get that barbershop
      const { data: barbershop, error: shopError } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          phone,
          email,
          business_hours,
          timezone,
          created_at
        `)
        .eq('id', barbershopId)
        .single()

      if (!shopError && barbershop) {
        locations.push({
          id: barbershop.id,
          name: barbershop.name || 'Main Location',
          address: barbershop.address || '',
          phone: barbershop.phone || '',
          email: barbershop.email || '',
          business_hours: barbershop.business_hours || {},
          timezone: barbershop.timezone || 'America/New_York',
          role: 'owner',
          is_primary: true,
          created_at: barbershop.created_at
        })
      }
    }

    // Also check if user owns any barbershops
    const { data: ownedShops, error: ownedError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        address,
        phone,
        email,
        business_hours,
        timezone,
        created_at
      `)
      .eq('owner_id', profile.id)

    if (!ownedError && ownedShops && ownedShops.length > 0) {
      // Add owned shops (avoiding duplicates)
      const existingIds = locations.map(l => l.id)
      
      ownedShops.forEach(shop => {
        if (!existingIds.includes(shop.id)) {
          locations.push({
            id: shop.id,
            name: shop.name || 'Barbershop',
            address: shop.address || '',
            phone: shop.phone || '',
            email: shop.email || '',
            business_hours: shop.business_hours || {},
            timezone: shop.timezone || 'America/New_York',
            role: 'owner',
            is_primary: locations.length === 0,
            created_at: shop.created_at
          })
        }
      })
    }

    // Check if user is staff at any barbershops
    const { data: staffPositions, error: staffError } = await supabase
      .from('barbershop_staff')
      .select(`
        barbershop_id,
        role,
        is_active,
        created_at
      `)
      .eq('user_id', profile.id)
      .eq('is_active', true)

    if (!staffError && staffPositions && staffPositions.length > 0) {
      const staffShopIds = staffPositions.map(s => s.barbershop_id)
      
      // Get barbershop details for staff positions
      const { data: staffShops, error: staffShopsError } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          phone,
          email,
          business_hours,
          timezone,
          created_at
        `)
        .in('id', staffShopIds)

      if (!staffShopsError && staffShops) {
        const existingIds = locations.map(l => l.id)
        
        staffShops.forEach(shop => {
          if (!existingIds.includes(shop.id)) {
            const staffPosition = staffPositions.find(s => s.barbershop_id === shop.id)
            
            locations.push({
              id: shop.id,
              name: shop.name || 'Barbershop',
              address: shop.address || '',
              phone: shop.phone || '',
              email: shop.email || '',
              business_hours: shop.business_hours || {},
              timezone: shop.timezone || 'America/New_York',
              role: staffPosition?.role || 'staff',
              is_primary: locations.length === 0,
              created_at: shop.created_at
            })
          }
        })
      }
    }

    // If no locations found, this might be a new user
    if (locations.length === 0) {
      return NextResponse.json({
        success: true,
        locations: [],
        message: 'No locations found - barbershop setup required',
        user_profile: {
          id: profile.id,
          email: profile.email,
          role: profile.role || 'user',
          needs_setup: true
        }
      })
    }

    // Sort locations by creation date (newest first) and ensure primary is first
    locations.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })

    return NextResponse.json({
      success: true,
      locations: locations,
      user_profile: {
        id: profile.id,
        email: profile.email,
        role: profile.role || 'user',
        primary_location: locations[0]?.id || null
      },
      count: locations.length
    })

  } catch (error) {
    console.error('Calendar user-locations API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  // Support POST method for compatibility
  return GET(request)
}