import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'

export async function GET() {
  try {
    const supabase = await createServiceRoleClient()
    
    // Simulate the exact ViewSwitcher logic for your user
    const yourUserId = null /* hardcoded ID removed for production */
    const yourShopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b' // Tomb45 Channelside
    
    // 1. What the enterprise/shops endpoint should return
    const { data: enterpriseShops } = await supabase
      .from('barbershops')
      .select('id, name, address, city, state, phone, email, created_at, location_status')
      .eq('id', yourShopId) // Using shop_id since you don't have organization_id
      
    const enterpriseData = (enterpriseShops || []).map(shop => ({
      id: shop.id,
      type: 'shop', 
      name: shop.name,
      role: 'Shop',
      location: shop.address || `${shop.city || ''}, ${shop.state || ''}`.trim() || 'Location not set'
    }))

    // 2. What the shop/barbers endpoint should return
    const { data: ownedShops } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', yourUserId)
      
    let barbersData = []
    if (ownedShops?.length > 0) {
      const shopIds = ownedShops.map(shop => shop.id)
      
      const { data: barberStaff } = await supabase
        .from('barbershop_staff')
        .select(`
          id,
          user_id,
          role,
          is_active
        `)
        .in('barbershop_id', shopIds)
        .eq('role', 'BARBER')
        .eq('is_active', true)
        
      // Get user details for each barber
      if (barberStaff?.length > 0) {
        const userIds = barberStaff.map(staff => staff.user_id)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds)
          
        barbersData = barberStaff.map(staff => {
          const user = users?.find(u => u.id === staff.user_id)
          return {
            id: staff.user_id || staff.id,
            type: 'barber',
            name: user?.full_name || user?.email || 'Unnamed Barber',
            role: 'Barber',
            email: user?.email
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'ViewSwitcher simulation complete',
      yourProfile: {
        id: yourUserId,
        email: null /* hardcoded ID removed for production */,
        role: 'ENTERPRISE_OWNER',
        shop_id: yourShopId
      },
      viewSwitcherResults: {
        // What you should see as ENTERPRISE_OWNER
        enterpriseShops: enterpriseData,
        // What you should see if you were SHOP_OWNER  
        shopBarbers: barbersData,
        // Summary
        shouldShowInViewSwitcher: enterpriseData.length > 0 ? 'Enterprise shops' : (barbersData.length > 0 ? 'Shop barbers' : 'Fallback dev data')
      },
      rawData: {
        enterpriseShopsQuery: enterpriseShops,
        ownedShopsQuery: ownedShops,
        barbersQuery: barbersData
      }
    })

  } catch (error) {
    console.error('ViewSwitcher simulation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}