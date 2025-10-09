import { authenticateShopOwnerStrict } from '@/lib/shop-auth'
import { success, badRequest, notFound, serverError } from '@/lib/api-response'

export const runtime = 'edge'

/**
 * POST /api/shop/inventory - Create an inventory adjustment
 *
 * Request Body:
 * {
 *   product_id: string (required),
 *   adjustment_type: 'restock' | 'damage' | 'theft' | 'correction' | 'return' (required),
 *   quantity_change: number (required, positive or negative),
 *   reason: string (required, min 10 characters),
 *   cost_impact: number (optional)
 * }
 *
 * Response:
 * {
 *   adjustment: { id, product_id, product_name, adjustment_type, quantity_change, previous_quantity, new_quantity, reason, adjustment_date },
 *   updated_product: { id, name, current_stock }
 * }
 */
export async function POST(request) {
  try {
    const { shop, profile, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Parse request body
    const {
      product_id,
      adjustment_type,
      quantity_change,
      reason,
      cost_impact
    } = await request.json()

    // Validation: required fields
    if (!product_id) {
      return badRequest('product_id is required')
    }

    if (!adjustment_type || !['restock', 'damage', 'theft', 'correction', 'return'].includes(adjustment_type)) {
      return badRequest('Valid adjustment_type required (restock, damage, theft, correction, or return)')
    }

    if (quantity_change === undefined || quantity_change === null || quantity_change === 0) {
      return badRequest('quantity_change is required and cannot be zero')
    }

    if (!reason || reason.trim().length < 10) {
      return badRequest('reason is required and must be at least 10 characters')
    }

    // Get current product stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, current_stock')
      .eq('id', product_id)
      .eq('barbershop_id', shop.id)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return notFound('Product not found or inactive')
    }

    const previous_quantity = product.current_stock
    const new_quantity = previous_quantity + quantity_change

    // Validation: new_quantity must equal previous_quantity + quantity_change (always true by construction)
    // Validation: new_quantity cannot be negative
    if (new_quantity < 0) {
      return badRequest(
        `Invalid adjustment: would result in negative stock (current: ${previous_quantity}, change: ${quantity_change}, result: ${new_quantity})`
      )
    }

    // Create inventory adjustment record
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('inventory_adjustments')
      .insert({
        barbershop_id: shop.id,
        product_id,
        adjustment_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        adjusted_by: profile.id,
        reason: reason.trim(),
        cost_impact: cost_impact || null,
        adjustment_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (adjustmentError) {
      console.error('[Inventory API] Adjustment creation failed:', adjustmentError)
      return serverError('Failed to create inventory adjustment', adjustmentError)
    }

    // Update product stock
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        current_stock: new_quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select('id, name, current_stock')
      .single()

    if (updateError) {
      console.error('[Inventory API] Stock update failed:', updateError)
      // Note: This is critical - adjustment recorded but stock not updated
      // In production, consider implementing rollback or alerting
      return serverError('Adjustment recorded but stock update failed', updateError)
    }

    return success({
      adjustment: {
        id: adjustment.id,
        product_id: adjustment.product_id,
        product_name: product.name,
        adjustment_type: adjustment.adjustment_type,
        quantity_change: adjustment.quantity_change,
        previous_quantity: adjustment.previous_quantity,
        new_quantity: adjustment.new_quantity,
        reason: adjustment.reason,
        cost_impact: adjustment.cost_impact,
        adjustment_date: adjustment.adjustment_date,
        adjusted_by: adjustment.adjusted_by
      },
      updated_product: updatedProduct
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Inventory API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

/**
 * GET /api/shop/inventory - Get inventory adjustment history
 *
 * Query Parameters:
 * - product_id: UUID (optional, filter by product)
 * - adjustment_type: string (optional, filter by type)
 * - start_date: ISO date string (optional, defaults to 90 days ago)
 * - end_date: ISO date string (optional, defaults to today)
 * - page: number (optional, default 1)
 * - limit: number (optional, default 50, max 200)
 *
 * Response:
 * {
 *   adjustments: [{ id, product_name, adjustment_type, quantity_change, previous_quantity, new_quantity, reason, adjusted_by_name, adjustment_date }],
 *   pagination: { page, limit, total_count, total_pages },
 *   summary: { total_adjustments, by_type: { restock, damage, theft, correction, return } }
 * }
 */
export async function GET(request) {
  try {
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const product_id = searchParams.get('product_id')
    const adjustment_type = searchParams.get('adjustment_type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    // Check for low-stock query
    const lowStockOnly = searchParams.get('low_stock') === 'true'

    // If requesting low-stock products, return different response
    if (lowStockOnly) {
      const { data: lowStockProducts, error: lowStockError } = await supabase
        .from('products')
        .select('id, name, sku, brand, current_stock, min_stock_level, retail_price')
        .eq('barbershop_id', shop.id)
        .eq('is_active', true)
        .lte('current_stock', supabase.raw('min_stock_level'))
        .order('current_stock', { ascending: true })

      if (lowStockError) {
        console.error('[Inventory API] Low stock query failed:', lowStockError)
        return serverError('Failed to fetch low-stock products', lowStockError)
      }

      return success({
        low_stock_products: lowStockProducts || [],
        count: lowStockProducts?.length || 0
      })
    }

    // Date range (default to last 90 days)
    const end_date = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const start_date = searchParams.get('start_date') ||
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Build adjustment history query
    let query = supabase
      .from('inventory_adjustments')
      .select(`
        id,
        product_id,
        adjustment_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        reason,
        cost_impact,
        adjustment_date,
        products!inner(name, sku),
        adjusted_by_profile:profiles!inventory_adjustments_adjusted_by_fkey(id, full_name)
      `, { count: 'exact' })
      .eq('barbershop_id', shop.id)
      .gte('adjustment_date', start_date)
      .lte('adjustment_date', end_date)
      .order('adjustment_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (adjustment_type) {
      query = query.eq('adjustment_type', adjustment_type)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: adjustments, error: adjustmentsError, count } = await query

    if (adjustmentsError) {
      console.error('[Inventory API] Adjustments query failed:', adjustmentsError)
      return serverError('Failed to fetch adjustment history', adjustmentsError)
    }

    // Transform data
    const transformedAdjustments = adjustments.map(adj => ({
      id: adj.id,
      product_id: adj.product_id,
      product_name: adj.products?.name || 'Unknown Product',
      product_sku: adj.products?.sku || null,
      adjustment_type: adj.adjustment_type,
      quantity_change: adj.quantity_change,
      previous_quantity: adj.previous_quantity,
      new_quantity: adj.new_quantity,
      reason: adj.reason,
      cost_impact: adj.cost_impact,
      adjusted_by_name: adj.adjusted_by_profile?.full_name || 'Unknown',
      adjustment_date: adj.adjustment_date
    }))

    // Calculate summary statistics
    const summary = {
      total_adjustments: transformedAdjustments.length,
      by_type: {
        restock: transformedAdjustments.filter(a => a.adjustment_type === 'restock').length,
        damage: transformedAdjustments.filter(a => a.adjustment_type === 'damage').length,
        theft: transformedAdjustments.filter(a => a.adjustment_type === 'theft').length,
        correction: transformedAdjustments.filter(a => a.adjustment_type === 'correction').length,
        return: transformedAdjustments.filter(a => a.adjustment_type === 'return').length
      }
    }

    return success({
      adjustments: transformedAdjustments,
      pagination: {
        page,
        limit,
        total_count: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      summary,
      filters: {
        start_date,
        end_date,
        product_id,
        adjustment_type
      }
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[Inventory API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}
