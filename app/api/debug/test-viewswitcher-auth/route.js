import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-simple'

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Simulate what ViewSwitcher does for your user (c50bossio@gmail.com)
    const testUserId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5' // Your user ID from the data
    
    // Get user profile (what auth would return)
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role, shop_id, barbershop_id, email')
      .eq('id', testUserId)
      .single()

    const result = {
      userProfile: profile,
      viewSwitcherData: {
        enterpriseShops: [],
        shopBarbers: []
      }
    }

    // Test ENTERPRISE_OWNER path (for your role)
    if (profile?.role === 'ENTERPRISE_OWNER') {
      // Try organization_id first
      if (profile.organization_id) {
        const { data: orgShops } = await supabase
          .from('barbershops')
          .select('id, name, address, city, state, phone, email, created_at, location_status')
          .eq('organization_id', profile.organization_id)
          .order('name')
        
        result.viewSwitcherData.enterpriseShops = (orgShops || []).map(shop => ({
          id: shop.id,
          type: 'shop',
          name: shop.name || `Shop ${shop.id}`,
          role: 'Shop',
          location: shop.address || 'Location not set'
        }))
      } 
      // Fallback to shop_id (single shop owner)
      else if (profile.shop_id) {
        const { data: singleShop } = await supabase
          .from('barbershops')
          .select('id, name, address, city, state, phone, email, created_at, location_status')
          .eq('id', profile.shop_id)
          .order('name')
        
        result.viewSwitcherData.enterpriseShops = (singleShop || []).map(shop => ({
          id: shop.id,
          type: 'shop',
          name: shop.name || `Shop ${shop.id}`,
          role: 'Shop',
          location: shop.address || 'Location not set'
        }))
      }
    }

    // Test SHOP_OWNER path
    if (profile?.role === 'SHOP_OWNER') {
      // Get barbershops owned by this user
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('owner_id', testUserId)

      if (ownedShops?.length > 0) {
        const shopIds = ownedShops.map(shop => shop.id)
        
        const { data: barberStaff } = await supabase
          .from('barbershop_staff')
          .select(`
            id,
            user_id,
            role,
            is_active,
            users:user_id (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .in('barbershop_id', shopIds)
          .eq('role', 'BARBER')
          .eq('is_active', true)

        result.viewSwitcherData.shopBarbers = (barberStaff || []).map(staff => ({
          id: staff.user_id || staff.id,
          type: 'barber',
          name: staff.users?.full_name || staff.users?.email || 'Unnamed Barber',
          role: 'Barber',
          email: staff.users?.email
        }))
      }
    }

    return NextResponse.json({
      success: true,
      message: `ViewSwitcher test for ${profile?.email} (${profile?.role})`,
      ...result
    })

  } catch (error) {
    console.error('ViewSwitcher auth test error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}