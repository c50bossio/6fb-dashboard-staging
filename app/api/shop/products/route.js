import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    // Check if we're in development mode for bypass
    const isDevelopment = process.env.NODE_ENV === 'development'
    const devBypass = request.headers.get('x-dev-bypass') === 'true' || isDevelopment
    
    let supabase
    let user = null
    let userId
    
    // In development, use service role client to bypass RLS
    if (devBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      // Use mock user for development - use actual user ID from database
      user = {
        id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5', // Actual user c50bossio@gmail.com
        email: 'c50bossio@gmail.com'
      }
      userId = user.id
      console.log('🔧 Using development bypass for product fetch')
    } else {
      // Production path - use normal client
      supabase = createClient()
      
      // Get the authenticated user from the session
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('Authentication failed in product fetch:', authError)
        return NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        )
      }
      
      user = authUser
      userId = user.id
    }
    
    // Get user profile with shop_id/barbershop_id
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, shop_id, barbershop_id')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Find the barbershop - check profile first (like Cin7 sync does)
    let shop = null
    
    // Method 1: Check profile for shop_id or barbershop_id (most reliable)
    if (profile && (profile.shop_id || profile.barbershop_id)) {
      const shopId = profile.shop_id || profile.barbershop_id
      const { data: profileShop } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('id', shopId)
        .single()
      
      if (profileShop) {
        shop = profileShop
        console.log('Found barbershop via profile shop_id:', profileShop.name)
      }
    }
    
    // Method 2: Check if user owns a barbershop (fallback)
    if (!shop) {
      const { data: ownedShop } = await supabase
        .from('barbershops')
        .select('id, name')
        .eq('owner_id', userId)
        .single()
      
      if (ownedShop) {
        shop = ownedShop
        console.log('Found barbershop via ownership:', ownedShop.name)
      }
    }
    
    if (!shop) {
      console.log('No barbershop found for user:', userId, 'profile:', profile)
      return NextResponse.json({
        products: [],
        metrics: {
          totalProducts: 0,
          totalValue: 0,
          totalCost: 0,
          potentialProfit: 0,
          averageMargin: 0,
          lowStock: 0,
          outOfStock: 0,
          needsReorder: 0
        }
      })
    }
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', shop.id)
      .order('name', { ascending: true })
    
    
    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({
        products: [],
        metrics: {
          totalProducts: 0,
          totalValue: 0,
          totalCost: 0,
          potentialProfit: 0,
          averageMargin: 0,
          lowStock: 0,
          outOfStock: 0,
          needsReorder: 0
        }
      })
    }
    
    // Enhanced POS-relevant metrics
    const totalCost = products?.reduce((sum, p) => {
      const cost = p.cost_price || (p.retail_price * 0.6) // Assume 40% margin if no cost
      return sum + (p.current_stock * cost)
    }, 0) || 0
    
    const totalRetailValue = products?.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0) || 0
    
    const averageMargin = products?.length > 0 
      ? products.reduce((sum, p) => {
          const cost = p.cost_price || (p.retail_price * 0.6)
          const margin = ((p.retail_price - cost) / p.retail_price) * 100
          return sum + margin
        }, 0) / products.length
      : 0
    
    const metrics = {
      totalProducts: products?.length || 0,
      totalValue: totalRetailValue,
      totalCost: totalCost,
      potentialProfit: totalRetailValue - totalCost,
      averageMargin: Math.round(averageMargin * 10) / 10, // Round to 1 decimal
      lowStock: products?.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length || 0,
      outOfStock: products?.filter(p => p.current_stock === 0).length || 0,
      needsReorder: products?.filter(p => p.current_stock <= p.reorder_point).length || 0
    }
    
    return NextResponse.json({
      products: products || [],
      metrics
    })
    
  } catch (error) {
    console.error('Error in /api/shop/products:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


export async function POST(request) {
  try {
    // Check if we're in development mode for bypass
    const isDevelopment = process.env.NODE_ENV === 'development'
    const devBypass = request.headers.get('x-dev-bypass') === 'true' || isDevelopment
    
    let supabase
    let user = null
    let userId
    
    // In development, use service role client to bypass RLS
    if (devBypass && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js')
      supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      
      // Use mock user for development
      user = {
        id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5', // Actual user c50bossio@gmail.com
        email: 'c50bossio@gmail.com'
      }
      userId = user.id
    } else {
      // Production path - use normal client
      supabase = createClient()
      
      // Get the authenticated user from the session
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        return NextResponse.json(
          { error: 'Unauthorized - Please log in' },
          { status: 401 }
        )
      }
      
      user = authUser
      userId = user.id
    }
    
    const productData = await request.json()
    
    let profile = null
    if (userId) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      profile = profileData
    }
    
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) {
      return NextResponse.json(
        { error: 'No shop found for this user' },
        { status: 404 }
      )
    }
    
    const productToInsert = {
      ...productData,
      barbershop_id: shop.id,
      is_active: true
    }
    
    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(productToInsert)
      .select()
      .single()
    
    if (insertError) {
      console.error('Error inserting product:', insertError)
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(newProduct)
    
  } catch (error) {
    console.error('Error in POST /api/shop/products:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}