import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/shop/analytics/products
 * 
 * Retrieves comprehensive product analytics data including:
 * - Top selling products
 * - Category performance
 * - Revenue by product
 * - Stock levels
 * - Profit margins
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Authentication check
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's shop ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = profile.shop_id
    const { searchParams } = new URL(request.url)
    const periodDays = parseInt(searchParams.get('period_days') || '30')
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

    // Get products with sales data
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        brand,
        retail_price,
        cost_price,
        current_stock,
        min_stock_level,
        max_stock_level,
        is_active,
        created_at
      `)
      .eq('barbershop_id', shopId)
      .eq('is_active', true)
      .order('name')

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Get product sales data for the period
    const { data: salesData, error: salesError } = await supabase
      .from('product_sales')
      .select(`
        product_id,
        quantity,
        unit_price,
        total_amount,
        sale_date,
        products (
          name,
          category,
          brand,
          cost_price,
          retail_price
        )
      `)
      .eq('barbershop_id', shopId)
      .gte('sale_date', startDate.toISOString())
      .order('sale_date', { ascending: false })

    if (salesError) {
      console.error('Error fetching sales data:', salesError)
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
    }

    // Calculate analytics
    const analytics = calculateProductAnalytics(products || [], salesData || [], periodDays)

    return NextResponse.json({
      success: true,
      period_days: periodDays,
      date_range: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      ...analytics,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateProductAnalytics(products, salesData, periodDays) {
  // Create product lookup map
  const productMap = new Map(products.map(p => [p.id, p]))
  
  // Aggregate sales by product
  const productSales = new Map()
  let totalRevenue = 0
  let totalCost = 0
  
  salesData.forEach(sale => {
    const productId = sale.product_id
    if (!productSales.has(productId)) {
      productSales.set(productId, {
        product_id: productId,
        product_name: sale.products?.name || 'Unknown Product',
        category: sale.products?.category || 'uncategorized',
        brand: sale.products?.brand || '',
        total_quantity: 0,
        total_revenue: 0,
        total_cost: 0,
        sales_count: 0,
        avg_price: 0,
        profit_margin: 0
      })
    }
    
    const existing = productSales.get(productId)
    const cost = (sale.products?.cost_price || 0) * sale.quantity
    
    existing.total_quantity += sale.quantity
    existing.total_revenue += sale.total_amount
    existing.total_cost += cost
    existing.sales_count += 1
    existing.avg_price = existing.total_revenue / existing.total_quantity
    existing.profit_margin = existing.total_cost > 0 
      ? ((existing.total_revenue - existing.total_cost) / existing.total_revenue) * 100 
      : 0

    totalRevenue += sale.total_amount
    totalCost += cost
  })

  // Convert to arrays for easier manipulation
  const salesArray = Array.from(productSales.values())

  // Top selling products (by quantity)
  const topSellingProducts = salesArray
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      product_id: item.product_id,
      name: item.product_name,
      category: item.category,
      brand: item.brand,
      quantity_sold: item.total_quantity,
      revenue: item.total_revenue,
      avg_price: Math.round(item.avg_price * 100) / 100,
      profit_margin: Math.round(item.profit_margin * 10) / 10,
      sales_count: item.sales_count
    }))

  // Top revenue products
  const topRevenueProducts = salesArray
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
    .map((item, index) => ({
      rank: index + 1,
      product_id: item.product_id,
      name: item.product_name,
      category: item.category,
      revenue: item.total_revenue,
      quantity_sold: item.total_quantity,
      profit_margin: Math.round(item.profit_margin * 10) / 10
    }))

  // Category performance
  const categoryStats = new Map()
  salesArray.forEach(item => {
    if (!categoryStats.has(item.category)) {
      categoryStats.set(item.category, {
        category: item.category,
        total_products: 0,
        total_revenue: 0,
        total_quantity: 0,
        avg_margin: 0
      })
    }
    
    const cat = categoryStats.get(item.category)
    cat.total_products += 1
    cat.total_revenue += item.total_revenue
    cat.total_quantity += item.total_quantity
  })

  // Calculate average margins for categories
  categoryStats.forEach((cat, key) => {
    const categoryProducts = salesArray.filter(p => p.category === key)
    cat.avg_margin = categoryProducts.length > 0
      ? categoryProducts.reduce((sum, p) => sum + p.profit_margin, 0) / categoryProducts.length
      : 0
    cat.avg_margin = Math.round(cat.avg_margin * 10) / 10
  })

  const categoryPerformance = Array.from(categoryStats.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)

  // Stock levels analysis
  const stockAnalysis = products.map(product => {
    const sales = productSales.get(product.id)
    const dailyAverage = sales ? sales.total_quantity / periodDays : 0
    const daysOfStock = dailyAverage > 0 ? product.current_stock / dailyAverage : Infinity
    
    let stockStatus = 'healthy'
    if (product.current_stock <= product.min_stock_level) {
      stockStatus = 'low'
    } else if (product.current_stock <= product.min_stock_level * 1.5) {
      stockStatus = 'warning'
    }

    return {
      product_id: product.id,
      name: product.name,
      category: product.category,
      current_stock: product.current_stock,
      min_stock_level: product.min_stock_level,
      max_stock_level: product.max_stock_level,
      stock_status: stockStatus,
      daily_average_sales: Math.round(dailyAverage * 10) / 10,
      estimated_days_left: daysOfStock === Infinity ? null : Math.round(daysOfStock),
      quantity_sold_period: sales?.total_quantity || 0,
      revenue_period: sales?.total_revenue || 0
    }
  }).sort((a, b) => {
    // Sort by stock status priority, then by days left
    const statusPriority = { 'low': 0, 'warning': 1, 'healthy': 2 }
    if (statusPriority[a.stock_status] !== statusPriority[b.stock_status]) {
      return statusPriority[a.stock_status] - statusPriority[b.stock_status]
    }
    if (a.estimated_days_left === null) return 1
    if (b.estimated_days_left === null) return -1
    return a.estimated_days_left - b.estimated_days_left
  })

  // Summary metrics
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.is_active).length
  const productsWithSales = productSales.size
  const averageMargin = salesArray.length > 0
    ? salesArray.reduce((sum, p) => sum + p.profit_margin, 0) / salesArray.length
    : 0

  // Low stock alerts
  const lowStockProducts = stockAnalysis.filter(p => p.stock_status === 'low').length
  const warningStockProducts = stockAnalysis.filter(p => p.stock_status === 'warning').length

  return {
    summary: {
      total_products: totalProducts,
      active_products: activeProducts,
      products_with_sales: productsWithSales,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      total_profit: Math.round((totalRevenue - totalCost) * 100) / 100,
      average_margin: Math.round(averageMargin * 10) / 10,
      low_stock_alerts: lowStockProducts,
      warning_stock_alerts: warningStockProducts
    },
    top_selling_products: topSellingProducts,
    top_revenue_products: topRevenueProducts,
    category_performance: categoryPerformance,
    stock_analysis: stockAnalysis.slice(0, 20), // Limit to top 20 for performance
    trends: {
      best_performing_category: categoryPerformance[0]?.category || null,
      highest_margin_product: salesArray.sort((a, b) => b.profit_margin - a.profit_margin)[0]?.product_name || null,
      fastest_moving_product: salesArray.sort((a, b) => b.total_quantity - a.total_quantity)[0]?.product_name || null
    }
  }
}