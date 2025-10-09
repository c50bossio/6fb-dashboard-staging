import { authenticateShopOwnerStrict } from '@/lib/shop-auth'
import { success, badRequest, serverError } from '@/lib/api-response'

export const runtime = 'edge'

/**
 * POST /api/shop/pos - Create a product sale transaction
 *
 * Request Body:
 * {
 *   items: [{ product_id, quantity, unit_price }],
 *   barber_id: string (optional),
 *   customer_id: string (optional),
 *   payment_method: 'cash' | 'card' | 'digital',
 *   notes: string (optional)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   sales: [{ sale_id, product_name, quantity, total_amount, commission_amount }],
 *   totals: { subtotal, total_commission, item_count }
 * }
 */
export async function POST(request) {
  try {
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Parse request body
    const {
      items,
      barber_id,
      customer_id,
      payment_method,
      notes
    } = await request.json()

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return badRequest('Items array is required and must not be empty')
    }

    if (!payment_method || !['cash', 'card', 'digital'].includes(payment_method)) {
      return badRequest('Valid payment_method required (cash, card, or digital)')
    }

    // Get commission rate for product sales from financial arrangements
    let commission_rate = 0
    if (barber_id) {
      const { data: arrangement } = await supabase
        .from('financial_arrangements')
        .select('commission_rate_product')
        .eq('barbershop_id', shop.id)
        .eq('barber_id', barber_id)
        .eq('is_active', true)
        .single()

      if (arrangement) {
        commission_rate = arrangement.commission_rate_product || 0
      }
    }

    // Process each item and create product_sales records
    const salesResults = []
    const errors = []

    for (const item of items) {
      const { product_id, quantity, unit_price } = item

      if (!product_id || !quantity || quantity <= 0) {
        errors.push({ product_id, error: 'Invalid product_id or quantity' })
        continue
      }

      // Verify product exists and has sufficient stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, current_stock, retail_price')
        .eq('id', product_id)
        .eq('barbershop_id', shop.id)
        .eq('is_active', true)
        .single()

      if (productError || !product) {
        errors.push({ product_id, error: 'Product not found or inactive' })
        continue
      }

      // Check inventory
      if (product.current_stock < quantity) {
        errors.push({
          product_id,
          product_name: product.name,
          error: `Insufficient inventory. Available: ${product.current_stock}, Requested: ${quantity}`
        })
        continue
      }

      // Calculate sale amounts
      const sale_unit_price = unit_price || product.retail_price
      const total_amount = parseFloat((quantity * sale_unit_price).toFixed(2))
      const commission_amount = parseFloat(
        (total_amount * (commission_rate / 100)).toFixed(2)
      )

      // Create product_sales record
      const { data: sale, error: saleError } = await supabase
        .from('product_sales')
        .insert({
          barbershop_id: shop.id,
          product_id,
          barber_id: barber_id || null,
          customer_id: customer_id || null,
          quantity,
          unit_price: sale_unit_price,
          total_amount,
          commission_rate,
          commission_amount,
          payment_method,
          sale_date: new Date().toISOString().split('T')[0],
          notes: notes || null
        })
        .select()
        .single()

      if (saleError) {
        console.error('[POS API] Sale creation failed:', saleError)
        errors.push({ product_id, error: 'Failed to create sale record' })
        continue
      }

      // Update product stock
      const { error: stockError } = await supabase
        .from('products')
        .update({
          current_stock: product.current_stock - quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', product_id)

      if (stockError) {
        console.error('[POS API] Stock update failed:', stockError)
        // Note: This is a critical error but sale is already recorded
        // In production, consider implementing a transaction rollback mechanism
      }

      salesResults.push({
        sale_id: sale.id,
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: sale_unit_price,
        total_amount,
        commission_amount
      })
    }

    // Calculate totals
    const subtotal = salesResults.reduce((sum, s) => sum + s.total_amount, 0)
    const total_commission = salesResults.reduce((sum, s) => sum + s.commission_amount, 0)

    // Return results
    if (salesResults.length === 0 && errors.length > 0) {
      return badRequest('All items failed to process', { errors })
    }

    return success({
      sales: salesResults,
      errors: errors.length > 0 ? errors : undefined,
      totals: {
        subtotal: parseFloat(subtotal.toFixed(2)),
        total_commission: parseFloat(total_commission.toFixed(2)),
        item_count: salesResults.length,
        commission_rate
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[POS API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}

/**
 * GET /api/shop/pos - Get sales history
 *
 * Query Parameters:
 * - start_date: ISO date string (optional, defaults to 30 days ago)
 * - end_date: ISO date string (optional, defaults to today)
 * - barber_id: UUID (optional, filter by barber)
 * - product_id: UUID (optional, filter by product)
 * - payment_method: string (optional, filter by payment method)
 * - page: number (optional, default 1)
 * - limit: number (optional, default 50, max 200)
 *
 * Response:
 * {
 *   sales: [{ id, product_name, barber_name, quantity, total_amount, commission_amount, payment_method, sale_date, customer_name }],
 *   pagination: { page, limit, total_count, total_pages },
 *   summary: { total_sales, total_revenue, total_commissions }
 * }
 */
export async function GET(request) {
  try {
    const { shop, supabase } = await authenticateShopOwnerStrict(request, {
      allowDevBypass: true
    })

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const barber_id = searchParams.get('barber_id')
    const product_id = searchParams.get('product_id')
    const payment_method = searchParams.get('payment_method')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    // Date range (default to last 30 days)
    const end_date = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
    const start_date = searchParams.get('start_date') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Build query
    let query = supabase
      .from('product_sales')
      .select(`
        id,
        product_id,
        quantity,
        unit_price,
        total_amount,
        commission_rate,
        commission_amount,
        payment_method,
        sale_date,
        notes,
        products!inner(name),
        barber:profiles!product_sales_barber_id_fkey(id, full_name),
        customer:customers(id, name)
      `, { count: 'exact' })
      .eq('barbershop_id', shop.id)
      .gte('sale_date', start_date)
      .lte('sale_date', end_date)
      .order('sale_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (barber_id) {
      query = query.eq('barber_id', barber_id)
    }
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    if (payment_method) {
      query = query.eq('payment_method', payment_method)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Execute query
    const { data: sales, error: salesError, count } = await query

    if (salesError) {
      console.error('[POS API] Sales query failed:', salesError)
      return serverError('Failed to fetch sales history', salesError)
    }

    // Transform data
    const transformedSales = sales.map(sale => ({
      id: sale.id,
      product_id: sale.product_id,
      product_name: sale.products?.name || 'Unknown Product',
      barber_id: sale.barber?.id || null,
      barber_name: sale.barber?.full_name || null,
      customer_id: sale.customer?.id || null,
      customer_name: sale.customer?.name || null,
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      total_amount: sale.total_amount,
      commission_rate: sale.commission_rate,
      commission_amount: sale.commission_amount,
      payment_method: sale.payment_method,
      sale_date: sale.sale_date,
      notes: sale.notes
    }))

    // Calculate summary
    const total_sales = transformedSales.length
    const total_revenue = transformedSales.reduce((sum, s) => sum + parseFloat(s.total_amount), 0)
    const total_commissions = transformedSales.reduce((sum, s) => sum + parseFloat(s.commission_amount), 0)

    return success({
      sales: transformedSales,
      pagination: {
        page,
        limit,
        total_count: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      },
      summary: {
        total_sales,
        total_revenue: parseFloat(total_revenue.toFixed(2)),
        total_commissions: parseFloat(total_commissions.toFixed(2))
      },
      filters: {
        start_date,
        end_date,
        barber_id,
        product_id,
        payment_method
      }
    })

  } catch (error) {
    if (error instanceof Response || error?.status) {
      return error
    }

    console.error('[POS API] Unexpected error:', error)
    return serverError('Internal server error', error)
  }
}
