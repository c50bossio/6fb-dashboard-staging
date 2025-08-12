import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const isDevelopment = process.env.NODE_ENV === 'development'
    
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