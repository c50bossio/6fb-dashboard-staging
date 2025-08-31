import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to determine their role and access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role, barbershop_id, barbershop_id, organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ 
        locations: [],
        message: 'No profile found' 
      })
    }

    let locations = []

    // If user has direct shop access
    if (profile.shop_id || profile.barbershop_id) {
      const barbershopId = profile.shop_id || profile.barbershop_id
      
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('id, name, address')
        .eq('id', barbershopId)
        .single()
      
      if (barbershop) {
        locations.push({
          id: barbershop.id,
          name: barbershop.name,
          address: barbershop.address,
          type: 'barbershop',
          access_type: 'owner'
        })
      }
    }

    // Check if user is staff at any barbershop
    if (locations.length === 0) {
      const { data: staffAssignments } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
      
      if (staffAssignments && staffAssignments.length > 0) {
        // Get all barbershops where user is staff
        const barbershopIds = staffAssignments.map(s => s.barbershop_id)
        
        const { data: barbershops } = await supabase
          .from('barbershops')
          .select('id, name, address')
          .in('id', barbershopIds)
        
        if (barbershops) {
          locations = barbershops.map(shop => ({
            id: shop.id,
            name: shop.name,
            address: shop.address,
            type: 'barbershop',
            access_type: 'staff'
          }))
        }
      }
    }

    // Check for organization-level access
    if (profile.organization_id) {
      const { data: orgLocations } = await supabase
        .from('organization_locations')
        .select(`
          location_id,
          barbershops (
            id,
            name,
            address
          )
        `)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
      
      if (orgLocations && orgLocations.length > 0) {
        const orgShops = orgLocations
          .filter(loc => loc.barbershops)
          .map(loc => ({
            id: loc.barbershops.id,
            name: loc.barbershops.name,
            address: loc.barbershops.address,
            type: 'barbershop',
            access_type: 'organization'
          }))
        
        // Merge with existing locations, avoiding duplicates
        orgShops.forEach(shop => {
          if (!locations.find(l => l.id === shop.id)) {
            locations.push(shop)
          }
        })
      }
    }

    // If still no locations, provide a default for demo purposes
    if (locations.length === 0) {
      locations.push({
        id: 'demo-location',
        name: 'My Barbershop',
        address: 'Demo Location',
        type: 'barbershop',
        access_type: 'demo'
      })
    }

    return NextResponse.json({
      locations,
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        role: profile.role
      }
    })

  } catch (error) {
    console.error('Error fetching user locations:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch locations',
      locations: []
    }, { status: 500 })
  }
}