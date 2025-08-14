import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Development bypass for testing
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Use the first shop owner for development testing
    let userId = user?.id
    if (isDevelopment && !userId) {
      const { data: devUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'SHOP_OWNER')
        .limit(1)
        .single()
      userId = devUser?.id
    }
    
    // Get the user's profile to check role (skip in development)
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    // Only shop owners and above can access shop info (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .select(`
        id,
        name,
        slug,
        custom_domain,
        address,
        city,
        state,
        zip_code,
        phone,
        email,
        website,
        description,
        opening_hours,
        social_links,
        logo_url,
        cover_image_url,
        is_active,
        created_at,
        total_clients,
        monthly_revenue,
        rating,
        total_reviews
      `)
      .eq('owner_id', userId)
      .single()
    
    if (shopError) {
      console.error('Error fetching shop:', shopError)
      
      // Return empty state instead of mock data - follow NO MOCK DATA policy
      return NextResponse.json({
        error: 'Shop not found',
        message: 'No barbershop is associated with this account. Please create or link a barbershop.',
        shop: null,
        setup_required: true
      }, { status: 404 })
    }
    
    return NextResponse.json(shop)
    
  } catch (error) {
    console.error('Error in /api/shop/info:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the request body
    const updates = await request.json()
    
    // Get the user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Only shop owners and above can update shop info
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Update the shop
    const { data: updatedShop, error: updateError } = await supabase
      .from('barbershops')
      .update(updates)
      .eq('owner_id', userId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating shop:', updateError)
      return NextResponse.json(
        { error: 'Failed to update shop' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(updatedShop)
    
  } catch (error) {
    console.error('Error in PUT /api/shop/info:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}