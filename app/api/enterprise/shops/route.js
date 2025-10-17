import { cookies } from 'next/headers'
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

    // Get user's profile and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // Check if user has enterprise access
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions - Must be Enterprise Owner' }, { status: 403 })
    }

    let shops = []

    // Get real shops data - try organization_id first, then fallback to owner_id for single shops
    if (profile?.organization_id) {
      const { data: barbershops, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, created_at')
        .eq('organization_id', profile.organization_id)
        .order('name')
        
      if (shopError) {
        console.error('Error fetching organization shops:', shopError)
        return NextResponse.json(
          { error: 'Failed to fetch organization shops' },
          { status: 500 }
        )
      }
      
      shops = (barbershops || []).map(shop => ({
        id: shop.id,
        type: 'shop',
        name: shop.name || `Shop ${shop.id}`,
        role: 'Shop',
        location: shop.address || `${shop.city || ''}, ${shop.state || ''}`.trim().replace(/^,\s*/, '') || 'Location not set',
        status: 'active', // Default status since location_status column doesn't exist
        city: shop.city,
        state: shop.state,
        phone: shop.phone,
        email: shop.email,
        created_at: shop.created_at
      }))
    } else if (profile?.barbershop_id) {
      // Fallback: Single shop owner - get their shop
      const { data: barbershops, error: shopError } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, created_at')
        .eq('id', profile.barbershop_id)
        .order('name')

      if (shopError) {
        console.error('Error fetching single shop:', shopError)
        return NextResponse.json(
          { error: 'Failed to fetch shop' },
          { status: 500 }
        )
      }

      // Transform barbershops data to shops format expected by ViewSwitcher
      shops = (barbershops || []).map(shop => ({
        id: shop.id,
        type: 'shop',
        name: shop.name || `Shop ${shop.id}`,
        role: 'Shop',
        location: shop.address || `${shop.city || ''}, ${shop.state || ''}`.trim().replace(/^,\s*/, '') || 'Location not set',
        status: 'active', // Default status since location_status column doesn't exist
        city: shop.city,
        state: shop.state,
        phone: shop.phone,
        email: shop.email,
        created_at: shop.created_at
      }))
    }

    // If no real shops found, return development test data
    if (shops.length === 0) {
      shops = [
        {
          id: 'dev-shop-1',
          type: 'shop',
          name: 'Dev Test Barbershop - Downtown',
          role: 'Shop',
          location: 'Downtown Test Location',
          status: 'active'
        },
        {
          id: 'dev-shop-2', 
          type: 'shop',
          name: 'Dev Test Barbershop - Uptown',
          role: 'Shop',
          location: 'Uptown Test Location',
          status: 'active'
        }
      ]
    }

    return NextResponse.json({ 
      shops,
      total: shops.length,
      organizationId: profile?.organization_id || null
    })

  } catch (error) {
    console.error('Error in /api/enterprise/shops:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}