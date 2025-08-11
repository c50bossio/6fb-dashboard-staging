import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
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
    
    // Get the user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check permissions
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
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
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get the request body
    const productData = await request.json()
    
    // Get the user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    // Check permissions
    if (!profile || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Must be a shop owner or admin' },
        { status: 403 }
      )
    }
    
    // Get the shop owned by this user
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
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