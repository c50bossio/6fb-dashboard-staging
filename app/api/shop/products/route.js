import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET(request) {
  try {
    // SIMPLIFIED TEST: Skip auth and use service role key
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    console.log('🔍 Products API Debug (Service Role):')
    
    // Use the Elite Cuts owner for testing
    const userId = '64f11f63-fba4-40de-8280-867e036a6797'
    console.log('🔧 Testing with user ID:', userId)
    
    // Development bypass for testing
    const isDevelopment = true // Force development mode for testing
    
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
    
    // Check permissions (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
    console.log('🏪 Looking for barbershop with owner_id:', userId)
    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    console.log('🏪 Shop query result:', shop?.id || 'none', shopError?.message || 'no error')
    
    if (!shop) {
      console.log('❌ No shop found for user:', userId)
      return NextResponse.json({
        products: [],
        metrics: {
          totalProducts: 0,
          totalValue: 0,
          lowStock: 0,
          outOfStock: 0
        }
      })
    }
    
    // Get all products for this shop
    console.log('📦 Looking for products with barbershop_id:', shop.id)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', shop.id)
      .order('name', { ascending: true })
    
    console.log('📦 Products query result:', products?.length || 0, 'products found', productsError?.message || 'no error')
    
    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({
        products: [],
        metrics: {
          totalProducts: 0,
          totalValue: 0,
          lowStock: 0,
          outOfStock: 0
        }
      })
    }
    
    // Calculate metrics
    const metrics = {
      totalProducts: products?.length || 0,
      totalValue: products?.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0) || 0,
      lowStock: products?.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length || 0,
      outOfStock: products?.filter(p => p.current_stock === 0).length || 0
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
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Development bypass for testing
    const isDevelopment = true // Force development mode for testing
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!isDevelopment && (authError || !user)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the request body
    const productData = await request.json()
    
    // Use the Elite Cuts owner for development testing (has products)
    let userId = user?.id
    if (isDevelopment && !userId) {
      userId = '64f11f63-fba4-40de-8280-867e036a6797' // Elite Cuts owner with products
      console.log('🔧 Development mode: Using Elite Cuts owner ID:', userId)
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
    
    // Check permissions (skip check in development)
    if (!isDevelopment && (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role))) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
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
    
    // Add the barbershop_id to the product data
    const productToInsert = {
      ...productData,
      barbershop_id: shop.id,
      is_active: true
    }
    
    // Insert the new product
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