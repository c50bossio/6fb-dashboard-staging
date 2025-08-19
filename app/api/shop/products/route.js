import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get the authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }
    
    const userId = user.id
    const isDevelopment = process.env.NODE_ENV === 'development'
    
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
    
    const { data: shop, error: shopError } = await supabase
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
    const supabase = createClient()
    
    // Get the authenticated user from the session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }
    
    const productData = await request.json()
    const userId = user.id
    
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