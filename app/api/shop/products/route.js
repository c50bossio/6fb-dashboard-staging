import { authenticateShopOwnerStrict } from '@/lib/shop-auth'
import { success, serverError } from '@/lib/api-response'

export const runtime = 'edge'

export async function GET(request) {
  try {
    // NEW PATTERN: Single function replaces 40+ lines of auth boilerplate
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Get all products for this shop
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', shop.id)
      .order('name', { ascending: true })

    if (productsError) {
      console.error('[Products API] Database query failed:', productsError)
      return serverError('Failed to fetch products', productsError)
    }

    // Calculate metrics
    const metrics = {
      totalProducts: products?.length || 0,
      totalValue: products?.reduce((sum, p) => sum + (p.current_stock * p.retail_price), 0) || 0,
      lowStock: products?.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length || 0,
      outOfStock: products?.filter(p => p.current_stock === 0).length || 0
    }

    return success({
      products: products || [],
      metrics
    })

  } catch (error) {
    // Errors from authenticateShopOwnerStrict are already HTTP responses
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Products API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

export async function POST(request) {
  try {
    // NEW PATTERN: Single function replaces 40+ lines of auth boilerplate
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Get the request body
    const productData = await request.json()

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
      console.error('[Products API] Insert failed:', insertError)
      return serverError('Failed to create product', insertError)
    }

    return success(newProduct, { status: 201 })

  } catch (error) {
    // Errors from authenticateShopOwnerStrict are already HTTP responses
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Products API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}
