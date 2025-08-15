import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile || !['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be an enterprise owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('owner_id', user.id)
    
    let shops = []
    
    if (organizations && organizations.length > 0) {
      const orgIds = organizations.map(org => org.id)
      
      const { data: orgShops, error: orgShopsError } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          phone,
          email,
          total_clients,
          monthly_revenue
        `)
        .in('organization_id', orgIds)
      
      if (!orgShopsError && orgShops) {
        shops = orgShops
      }
    }
    
    const { data: directShops, error: directShopsError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        address,
        city,
        state,
        phone,
        email,
        total_clients,
        monthly_revenue
      `)
      .eq('owner_id', user.id)
    
    if (!directShopsError && directShops) {
      const existingIds = shops.map(s => s.id)
      const uniqueDirectShops = directShops.filter(s => !existingIds.includes(s.id))
      shops = [...shops, ...uniqueDirectShops]
    }
    
    const formattedShops = shops.map(shop => ({
      id: shop.id,
      type: 'shop',
      name: shop.name,
      location: shop.city && shop.state ? `${shop.city}, ${shop.state}` : 'Location not set',
      metrics: {
        clients: shop.total_clients || 0,
        monthlyRevenue: shop.monthly_revenue || 0
      }
    }))
    
    return NextResponse.json({ shops: formattedShops })
    
  } catch (error) {
    console.error('Error in /api/enterprise/shops:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}