import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POS Products API - Single Source of Truth
 *
 * This endpoint queries the SAME 'products' table as /api/shop/products
 * to ensure data consistency between the POS system and inventory dashboard.
 *
 * Query Parameters:
 * - barbershop_id: Required - Filter products by shop
 * - in_stock_only: Optional - Only return products with stock > 0
 * - category: Optional - Filter by product category
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id')
    const inStockOnly = searchParams.get('in_stock_only') === 'true'
    const category = searchParams.get('category')

    // Validate required parameter
    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershop_id is required' },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // Verify user has access to this barbershop
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, barbershop_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check authorization: User must have BARBER role or higher
    const allowedRoles = ['BARBER', 'SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
    if (!allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }

    // Build query for products table (SINGLE SOURCE OF TRUTH)
    let query = supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true) // Only active products
      .order('name', { ascending: true })

    // Apply POS-specific filters
    if (inStockOnly) {
      query = query.gt('current_stock', 0)
    }

    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    const { data: products, error: productsError } = await query

    if (productsError) {
      console.error('Error fetching POS products:', productsError)
      return NextResponse.json(
        { error: 'Failed to load products', details: productsError.message },
        { status: 500 }
      )
    }

    // Map database fields to POS interface expected format
    // The POS expects 'price' but database has 'retail_price'
    const posProducts = (products || []).map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.retail_price, // Map retail_price → price for POS
      current_stock: product.current_stock,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      image_url: product.image_url,
      thumbnail_url: product.thumbnail_url,
      tax_rate: product.tax_rate || 0,
      commission_rate: product.commission_rate || 0,
      // Include additional fields that POS might need
      brand: product.brand,
      min_stock_level: product.min_stock_level,
      max_stock_level: product.max_stock_level,
      reorder_point: product.reorder_point,
      cost_price: product.cost_price // For profit calculations
    }))

    return NextResponse.json(posProducts)

  } catch (error) {
    console.error('Error in /api/pos/products:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
