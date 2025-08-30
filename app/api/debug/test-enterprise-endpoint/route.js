import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET() {
  try {
    const supabase = await createServiceRoleClient()
    
    // Simulate exactly what the fixed enterprise/shops endpoint should do
    const yourUserId = null /* hardcoded ID removed for production */
    
    // Get user's profile  
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role, barbershop_id, barberbarbershop_id, email')
      .eq('id', yourUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found', yourUserId }, { status: 404 })
    }
    
    if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions', role: profile.role }, { status: 403 })
    }

    let shops = []

    // Try organization_id first (for multi-location enterprises)
    if (profile?.organization_id) {
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, created_at, location_status')
        .eq('organization_id', profile.organization_id)
        .order('name')
      
      shops = (barbershops || []).map(shop => ({
        id: shop.id,
        type: 'shop',
        name: shop.name || `Shop ${shop.id}`,
        role: 'Shop',
        location: shop.address || 'Location not set'
      }))
    } 
    // Fallback for single-shop enterprise owners
    else if (profile?.shop_id) {
      const { data: barbershops } = await supabase
        .from('barbershops')
        .select('id, name, address, city, state, phone, email, created_at, location_status')
        .eq('id', profile.shop_id)
        .order('name')
      
      shops = (barbershops || []).map(shop => ({
        id: shop.id,
        type: 'shop',
        name: shop.name || `Shop ${shop.id}`,
        role: 'Shop', 
        location: shop.address || 'Location not set'
      }))
    }

    // If no real shops found, return development test data (original fallback)
    if (shops.length === 0) {
      shops = [
        {
          id: 'dev-shop-1',
          type: 'shop',
          name: 'Dev Test Barbershop - Downtown',
          role: 'Shop',
          location: 'Downtown Test Location',
          status: 'active'
        }
      ]
    }

    return NextResponse.json({ 
      shops,
      total: shops.length,
      organizationId: profile?.organization_id || null,
      profile: profile
    })

  } catch (error) {
    console.error('Enterprise endpoint test error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}