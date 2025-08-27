import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-simple'

export async function GET() {
  try {
    const supabase = createServiceClient()
    
    // Test what the ViewSwitcher would see
    
    // 1. Check barbershops (for enterprise users)
    const { data: barbershops } = await supabase
      .from('barbershops')
      .select('id, name, address, city, state, phone, email, created_at, location_status')
      .order('name')

    // 2. Check if there are any barbers/staff (for shop owners)
    const { data: staff } = await supabase
      .from('barbershop_staff')
      .select(`
        id,
        user_id,
        role,
        is_active,
        barbershop_id
      `)
      .eq('role', 'BARBER')
      .eq('is_active', true)

    // 3. Check profiles for context
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, role, shop_id, barbershop_id')
      .in('role', ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'BARBER'])

    return NextResponse.json({
      success: true,
      viewSwitcherData: {
        // What enterprise users would see
        shops: (barbershops || []).map(shop => ({
          id: shop.id,
          type: 'shop',
          name: shop.name || `Shop ${shop.id}`,
          role: 'Shop',
          location: shop.address || `${shop.city || ''}, ${shop.state || ''}`.trim().replace(/^,\s*/, '') || 'Location not set',
          status: shop.location_status || 'active'
        })),
        
        // What shop owners would see (barbers)
        barbers: (staff || []).map(s => ({
          id: s.id,
          user_id: s.user_id,
          type: 'barber',
          role: 'Barber',
          barbershop_id: s.barbershop_id
        })),
        
        // User profile summary
        userProfiles: profiles || [],
        
        // Summary
        summary: {
          totalBarbershops: barbershops?.length || 0,
          totalStaff: staff?.length || 0,
          totalNonClientProfiles: profiles?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('ViewSwitcher test error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}