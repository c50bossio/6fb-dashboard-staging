import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * GET /api/shop/analytics/inventory-insights
 * 
 * Provides detailed inventory insights including:
 * - Stock level alerts and recommendations
 * - Inventory turnover analysis
 * - Dead stock identification
 * - Reorder recommendations
 * - Seasonal trends
 * - ABC analysis (high/medium/low value products)
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
    const periodDays = parseInt(searchParams.get('period_days') || '90') // Longer period for inventory analysis
    const includeInactive = searchParams.get('include_inactive') === 'true'
    
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

    // Get all products with current inventory
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        brand,
        sku,
        retail_price,
        cost_price,
        current_stock,
        min_stock_level,
        max_stock_level,
        is_active,
        track_inventory,
        created_at
      `)
      .eq('barbershop_id', shopId)
      .eq('is_active', includeInactive ? undefined : true)

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }

    // Get historical sales data
    const { data: salesHistory, error: salesError } = await supabase
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
          cost_price,
          retail_price
        )
      `)
      .eq('barbershop_id', shopId)
      .gte('sale_date', startDate.toISOString())
      .order('sale_date', { ascending: true })

    if (salesError) {
      console.error('Error fetching sales history:', salesError)
      return NextResponse.json({ error: 'Failed to fetch sales history' }, { status: 500 })
    }

    // Calculate inventory insights
    const insights = calculateInventoryInsights(
      products || [], 
      salesHistory || [], 
      periodDays
    )

    return NextResponse.json({
      success: true,
      period_days: periodDays,
      analysis_date: new Date().toISOString(),
      date_range: {
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      ...insights,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/inventory-insights:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateInventoryInsights(products, salesHistory, periodDays) {
  // Create product lookup and sales aggregation
  const productMap = new Map(products.map(p => [p.id, p]))
  const productSales = aggregateProductSales(salesHistory)
  
  // Calculate insights for each product
  const productInsights = products.map(product => 
    calculateProductInventoryInsight(product, productSales.get(product.id) || [], periodDays)
  )

  // Generate different types of analysis
  const stockAlerts = generateStockAlerts(productInsights)
  const abcAnalysis = performABCAnalysis(productInsights)
  const turnoverAnalysis = analyzeTurnoverRates(productInsights)
  const reorderRecommendations = generateReorderRecommendations(productInsights)
  const deadStockAnalysis = identifyDeadStock(productInsights, periodDays)
  const seasonalTrends = analyzeSeasonalTrends(salesHistory, productMap)
  const inventoryValuation = calculateInventoryValuation(productInsights)

  // Generate actionable insights and recommendations
  const actionableInsights = generateActionableInsights(productInsights, periodDays)

  return {
    summary: generateInventorySummary(productInsights),
    stock_alerts: stockAlerts,
    abc_analysis: abcAnalysis,
    turnover_analysis: turnoverAnalysis,
    reorder_recommendations: reorderRecommendations,
    dead_stock_analysis: deadStockAnalysis,
    seasonal_trends: seasonalTrends,
    inventory_valuation: inventoryValuation,
    actionable_insights: actionableInsights,
    detailed_products: productInsights.slice(0, 50) // Limit for performance
  }
}

function aggregateProductSales(salesHistory) {
  const salesByProduct = new Map()
  
  salesHistory.forEach(sale => {
    if (!salesByProduct.has(sale.product_id)) {
      salesByProduct.set(sale.product_id, [])
    }
    salesByProduct.get(sale.product_id).push({
      quantity: sale.quantity,
      revenue: sale.total_amount,
      cost: (sale.products?.cost_price || 0) * sale.quantity,
      date: new Date(sale.sale_date)
    })
  })
  
  return salesByProduct
}

function calculateProductInventoryInsight(product, salesData, periodDays) {
  const totalQuantitySold = salesData.reduce((sum, sale) => sum + sale.quantity, 0)
  const totalRevenue = salesData.reduce((sum, sale) => sum + sale.revenue, 0)
  const totalCost = salesData.reduce((sum, sale) => sum + sale.cost, 0)
  const salesTransactions = salesData.length
  
  // Calculate velocity metrics
  const dailyAverageSales = totalQuantitySold / periodDays
  const weeklyAverageSales = dailyAverageSales * 7
  const monthlyAverageSales = dailyAverageSales * 30
  
  // Stock duration analysis
  const daysOfStockRemaining = dailyAverageSales > 0 ? product.current_stock / dailyAverageSales : Infinity
  const weeksOfStockRemaining = daysOfStockRemaining / 7
  
  // Turnover rate (sales / average inventory)
  const averageInventory = Math.max(product.current_stock, 1) // Avoid division by zero
  const turnoverRate = totalQuantitySold / averageInventory
  const annualizedTurnover = turnoverRate * (365 / periodDays)
  
  // Stock status determination
  let stockStatus = 'healthy'
  let stockPriority = 'low'
  
  if (product.current_stock <= 0) {
    stockStatus = 'out_of_stock'
    stockPriority = 'critical'
  } else if (product.current_stock <= product.min_stock_level) {
    stockStatus = 'low'
    stockPriority = 'high'
  } else if (product.current_stock <= product.min_stock_level * 1.5) {
    stockStatus = 'warning'
    stockPriority = 'medium'
  } else if (product.current_stock >= product.max_stock_level) {
    stockStatus = 'overstock'
    stockPriority = 'medium'
  }
  
  // Velocity classification
  let velocityClass = 'slow'
  if (annualizedTurnover > 12) velocityClass = 'fast'      // More than monthly turnover
  else if (annualizedTurnover > 4) velocityClass = 'medium' // Quarterly turnover
  else if (annualizedTurnover > 1) velocityClass = 'slow'   // Annual turnover
  else velocityClass = 'dead'                               // Less than annual
  
  // Profit analysis
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
  const profitPerUnit = totalQuantitySold > 0 ? (totalRevenue - totalCost) / totalQuantitySold : 0
  
  // Value classification for ABC analysis
  const inventoryValue = product.current_stock * (product.cost_price || 0)
  const revenueValue = totalRevenue
  
  return {
    product_id: product.id,
    name: product.name,
    category: product.category,
    brand: product.brand || '',
    sku: product.sku || '',
    
    // Current inventory
    current_stock: product.current_stock,
    min_stock_level: product.min_stock_level,
    max_stock_level: product.max_stock_level,
    
    // Sales performance
    quantity_sold: totalQuantitySold,
    revenue_generated: Math.round(totalRevenue * 100) / 100,
    profit_generated: Math.round((totalRevenue - totalCost) * 100) / 100,
    sales_transactions: salesTransactions,
    
    // Velocity metrics
    daily_average_sales: Math.round(dailyAverageSales * 100) / 100,
    weekly_average_sales: Math.round(weeklyAverageSales * 100) / 100,
    monthly_average_sales: Math.round(monthlyAverageSales * 100) / 100,
    
    // Stock duration
    days_of_stock_remaining: daysOfStockRemaining === Infinity ? null : Math.round(daysOfStockRemaining),
    weeks_of_stock_remaining: daysOfStockRemaining === Infinity ? null : Math.round(weeksOfStockRemaining * 10) / 10,
    
    // Turnover analysis
    turnover_rate: Math.round(turnoverRate * 100) / 100,
    annualized_turnover: Math.round(annualizedTurnover * 100) / 100,
    
    // Classifications
    stock_status: stockStatus,
    stock_priority: stockPriority,
    velocity_class: velocityClass,
    
    // Financial metrics
    profit_margin: Math.round(profitMargin * 10) / 10,
    profit_per_unit: Math.round(profitPerUnit * 100) / 100,
    inventory_value: Math.round(inventoryValue * 100) / 100,
    revenue_value: Math.round(revenueValue * 100) / 100,
    
    // Pricing
    retail_price: product.retail_price || 0,
    cost_price: product.cost_price || 0,
    
    // Recommendations
    needs_reorder: stockStatus === 'low' || stockStatus === 'out_of_stock',
    is_dead_stock: velocityClass === 'dead' && product.current_stock > 0,
    is_overstock: stockStatus === 'overstock'
  }
}

function generateStockAlerts(productInsights) {
  const alerts = {
    critical: [], // Out of stock
    high: [],     // Low stock
    medium: [],   // Warning level or overstock
    low: []       // General alerts
  }
  
  productInsights.forEach(product => {
    const alert = {
      product_id: product.product_id,
      name: product.name,
      category: product.category,
      current_stock: product.current_stock,
      stock_status: product.stock_status,
      days_remaining: product.days_of_stock_remaining,
      recommended_action: ''
    }
    
    switch (product.stock_priority) {
      case 'critical':
        alert.recommended_action = 'Reorder immediately - Out of stock'
        alerts.critical.push(alert)
        break
      case 'high':
        alert.recommended_action = 'Reorder soon - Low stock'
        alerts.high.push(alert)
        break
      case 'medium':
        if (product.stock_status === 'overstock') {
          alert.recommended_action = 'Consider promotion or discount'
        } else {
          alert.recommended_action = 'Monitor closely'
        }
        alerts.medium.push(alert)
        break
    }
  })
  
  return {
    total_alerts: alerts.critical.length + alerts.high.length + alerts.medium.length,
    critical_count: alerts.critical.length,
    high_count: alerts.high.length,
    medium_count: alerts.medium.length,
    alerts: alerts
  }
}

function performABCAnalysis(productInsights) {
  // Sort by revenue value descending
  const sortedByRevenue = [...productInsights]
    .filter(p => p.revenue_value > 0)
    .sort((a, b) => b.revenue_value - a.revenue_value)
  
  const totalRevenue = sortedByRevenue.reduce((sum, p) => sum + p.revenue_value, 0)
  let cumulativeRevenue = 0
  
  const analysis = sortedByRevenue.map((product, index) => {
    cumulativeRevenue += product.revenue_value
    const cumulativePercent = (cumulativeRevenue / totalRevenue) * 100
    
    let classification = 'C'
    if (cumulativePercent <= 80) classification = 'A'      // Top 80% of revenue
    else if (cumulativePercent <= 95) classification = 'B' // Next 15% of revenue
    else classification = 'C'                              // Bottom 5% of revenue
    
    return {
      product_id: product.product_id,
      name: product.name,
      category: product.category,
      classification: classification,
      revenue_value: product.revenue_value,
      cumulative_percent: Math.round(cumulativePercent * 10) / 10,
      inventory_value: product.inventory_value,
      turnover_rate: product.turnover_rate
    }
  })
  
  // Summary statistics
  const classA = analysis.filter(p => p.classification === 'A')
  const classB = analysis.filter(p => p.classification === 'B')
  const classC = analysis.filter(p => p.classification === 'C')
  
  return {
    total_products: analysis.length,
    classification_summary: {
      class_a: {
        count: classA.length,
        percentage: Math.round((classA.length / analysis.length) * 100),
        revenue_contribution: Math.round(classA.reduce((sum, p) => sum + p.revenue_value, 0) * 100) / 100
      },
      class_b: {
        count: classB.length,
        percentage: Math.round((classB.length / analysis.length) * 100),
        revenue_contribution: Math.round(classB.reduce((sum, p) => sum + p.revenue_value, 0) * 100) / 100
      },
      class_c: {
        count: classC.length,
        percentage: Math.round((classC.length / analysis.length) * 100),
        revenue_contribution: Math.round(classC.reduce((sum, p) => sum + p.revenue_value, 0) * 100) / 100
      }
    },
    products: analysis.slice(0, 50) // Top 50 products
  }
}

function analyzeTurnoverRates(productInsights) {
  const productsWithSales = productInsights.filter(p => p.quantity_sold > 0)
  
  if (productsWithSales.length === 0) {
    return {
      average_turnover: 0,
      fast_movers: [],
      slow_movers: [],
      summary: {
        fast_count: 0,
        medium_count: 0,
        slow_count: 0,
        dead_count: 0
      }
    }
  }
  
  const averageTurnover = productsWithSales.reduce((sum, p) => sum + p.annualized_turnover, 0) / productsWithSales.length
  
  const fastMovers = productsWithSales
    .filter(p => p.velocity_class === 'fast')
    .sort((a, b) => b.annualized_turnover - a.annualized_turnover)
    .slice(0, 20)
    .map(p => ({
      product_id: p.product_id,
      name: p.name,
      category: p.category,
      annualized_turnover: p.annualized_turnover,
      current_stock: p.current_stock,
      days_of_stock_remaining: p.days_of_stock_remaining
    }))
  
  const slowMovers = productsWithSales
    .filter(p => p.velocity_class === 'slow' || p.velocity_class === 'dead')
    .sort((a, b) => a.annualized_turnover - b.annualized_turnover)
    .slice(0, 20)
    .map(p => ({
      product_id: p.product_id,
      name: p.name,
      category: p.category,
      annualized_turnover: p.annualized_turnover,
      current_stock: p.current_stock,
      inventory_value: p.inventory_value
    }))
  
  const summary = {
    fast_count: productInsights.filter(p => p.velocity_class === 'fast').length,
    medium_count: productInsights.filter(p => p.velocity_class === 'medium').length,
    slow_count: productInsights.filter(p => p.velocity_class === 'slow').length,
    dead_count: productInsights.filter(p => p.velocity_class === 'dead').length
  }
  
  return {
    average_turnover: Math.round(averageTurnover * 100) / 100,
    fast_movers: fastMovers,
    slow_movers: slowMovers,
    summary: summary
  }
}

function generateReorderRecommendations(productInsights) {
  const reorderNeeded = productInsights
    .filter(p => p.needs_reorder)
    .sort((a, b) => {
      // Sort by priority: out of stock first, then by days remaining
      if (a.stock_status === 'out_of_stock' && b.stock_status !== 'out_of_stock') return -1
      if (b.stock_status === 'out_of_stock' && a.stock_status !== 'out_of_stock') return 1
      return (a.days_of_stock_remaining || 0) - (b.days_of_stock_remaining || 0)
    })
    .map(product => {
      // Calculate suggested reorder quantity
      const suggestedReorderQuantity = Math.max(
        product.monthly_average_sales * 2, // 2 months supply
        product.min_stock_level || 0,
        10 // Minimum order quantity
      )
      
      const estimatedCost = suggestedReorderQuantity * (product.cost_price || 0)
      
      return {
        product_id: product.product_id,
        name: product.name,
        category: product.category,
        current_stock: product.current_stock,
        stock_status: product.stock_status,
        days_of_stock_remaining: product.days_of_stock_remaining,
        monthly_average_sales: product.monthly_average_sales,
        suggested_reorder_quantity: Math.round(suggestedReorderQuantity),
        estimated_cost: Math.round(estimatedCost * 100) / 100,
        priority: product.stock_priority,
        urgency_days: product.days_of_stock_remaining
      }
    })
  
  const totalEstimatedCost = reorderNeeded.reduce((sum, item) => sum + item.estimated_cost, 0)
  
  return {
    total_products_need_reorder: reorderNeeded.length,
    total_estimated_cost: Math.round(totalEstimatedCost * 100) / 100,
    critical_reorders: reorderNeeded.filter(p => p.priority === 'critical').length,
    high_priority_reorders: reorderNeeded.filter(p => p.priority === 'high').length,
    recommendations: reorderNeeded.slice(0, 30) // Top 30 most urgent
  }
}

function identifyDeadStock(productInsights, periodDays) {
  const deadStockProducts = productInsights
    .filter(p => p.is_dead_stock)
    .sort((a, b) => b.inventory_value - a.inventory_value)
    .map(product => ({
      product_id: product.product_id,
      name: product.name,
      category: product.category,
      current_stock: product.current_stock,
      inventory_value: product.inventory_value,
      days_since_last_sale: product.quantity_sold === 0 ? periodDays : null,
      annualized_turnover: product.annualized_turnover,
      recommended_action: product.inventory_value > 100 ? 'Discount/Promotion' : 'Consider discontinuing'
    }))
  
  const totalDeadStockValue = deadStockProducts.reduce((sum, p) => sum + p.inventory_value, 0)
  
  return {
    total_dead_stock_products: deadStockProducts.length,
    total_dead_stock_value: Math.round(totalDeadStockValue * 100) / 100,
    high_value_dead_stock: deadStockProducts.filter(p => p.inventory_value > 100).length,
    products: deadStockProducts.slice(0, 20)
  }
}

function analyzeSeasonalTrends(salesHistory, productMap) {
  // Group sales by month for seasonal analysis
  const salesByMonth = new Map()
  
  salesHistory.forEach(sale => {
    const saleDate = new Date(sale.sale_date)
    const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`
    
    if (!salesByMonth.has(monthKey)) {
      salesByMonth.set(monthKey, {
        month: monthKey,
        total_quantity: 0,
        total_revenue: 0,
        unique_products: new Set()
      })
    }
    
    const monthData = salesByMonth.get(monthKey)
    monthData.total_quantity += sale.quantity
    monthData.total_revenue += sale.total_amount
    monthData.unique_products.add(sale.product_id)
  })
  
  const monthlyData = Array.from(salesByMonth.values()).map(data => ({
    month: data.month,
    total_quantity: data.total_quantity,
    total_revenue: Math.round(data.total_revenue * 100) / 100,
    unique_products_sold: data.unique_products.size
  })).sort((a, b) => a.month.localeCompare(b.month))
  
  return {
    monthly_trends: monthlyData,
    analysis: monthlyData.length > 1 ? generateSeasonalAnalysis(monthlyData) : null
  }
}

function generateSeasonalAnalysis(monthlyData) {
  if (monthlyData.length < 2) return null
  
  const averageRevenue = monthlyData.reduce((sum, m) => sum + m.total_revenue, 0) / monthlyData.length
  const averageQuantity = monthlyData.reduce((sum, m) => sum + m.total_quantity, 0) / monthlyData.length
  
  const bestMonth = monthlyData.reduce((best, current) => 
    current.total_revenue > best.total_revenue ? current : best
  )
  
  const worstMonth = monthlyData.reduce((worst, current) => 
    current.total_revenue < worst.total_revenue ? current : worst
  )
  
  return {
    average_monthly_revenue: Math.round(averageRevenue * 100) / 100,
    average_monthly_quantity: Math.round(averageQuantity),
    best_performing_month: bestMonth.month,
    best_month_revenue: bestMonth.total_revenue,
    worst_performing_month: worstMonth.month,
    worst_month_revenue: worstMonth.total_revenue,
    seasonal_variance: Math.round(((bestMonth.total_revenue - worstMonth.total_revenue) / averageRevenue) * 100)
  }
}

function calculateInventoryValuation(productInsights) {
  const totalInventoryValue = productInsights.reduce((sum, p) => sum + p.inventory_value, 0)
  const totalRevenuePotential = productInsights.reduce((sum, p) => sum + (p.current_stock * (p.retail_price || 0)), 0)
  
  const categoryValuation = new Map()
  productInsights.forEach(product => {
    if (!categoryValuation.has(product.category)) {
      categoryValuation.set(product.category, {
        category: product.category,
        inventory_value: 0,
        retail_value: 0,
        product_count: 0
      })
    }
    
    const cat = categoryValuation.get(product.category)
    cat.inventory_value += product.inventory_value
    cat.retail_value += product.current_stock * (product.retail_price || 0)
    cat.product_count += 1
  })
  
  const categoryBreakdown = Array.from(categoryValuation.values())
    .map(cat => ({
      ...cat,
      inventory_value: Math.round(cat.inventory_value * 100) / 100,
      retail_value: Math.round(cat.retail_value * 100) / 100,
      percentage_of_total: Math.round((cat.inventory_value / totalInventoryValue) * 100 * 10) / 10
    }))
    .sort((a, b) => b.inventory_value - a.inventory_value)
  
  return {
    total_inventory_value: Math.round(totalInventoryValue * 100) / 100,
    total_retail_value: Math.round(totalRevenuePotential * 100) / 100,
    potential_markup: totalInventoryValue > 0 ? Math.round(((totalRevenuePotential - totalInventoryValue) / totalInventoryValue) * 100) : 0,
    category_breakdown: categoryBreakdown
  }
}

function generateActionableInsights(productInsights, periodDays) {
  const insights = []
  
  // Critical stock insights
  const criticalStock = productInsights.filter(p => p.stock_priority === 'critical')
  if (criticalStock.length > 0) {
    insights.push({
      type: 'critical',
      title: `${criticalStock.length} products are out of stock`,
      description: 'These products need immediate reordering to avoid lost sales.',
      action: 'Review reorder recommendations and place urgent orders.',
      priority: 1,
      products_affected: criticalStock.length
    })
  }
  
  // Dead stock insights
  const deadStock = productInsights.filter(p => p.is_dead_stock && p.inventory_value > 50)
  if (deadStock.length > 0) {
    const deadStockValue = deadStock.reduce((sum, p) => sum + p.inventory_value, 0)
    insights.push({
      type: 'optimization',
      title: `$${Math.round(deadStockValue)} in dead stock inventory`,
      description: 'Consider promotions or discontinuing slow-moving products to free up capital.',
      action: 'Create discount campaigns for high-value dead stock items.',
      priority: 2,
      products_affected: deadStock.length,
      financial_impact: Math.round(deadStockValue)
    })
  }
  
  // Fast movers running low
  const fastMoversLow = productInsights.filter(p => p.velocity_class === 'fast' && p.stock_status === 'warning')
  if (fastMoversLow.length > 0) {
    insights.push({
      type: 'opportunity',
      title: `${fastMoversLow.length} fast-moving products need reorder soon`,
      description: 'These high-velocity products could cause lost sales if they run out.',
      action: 'Increase safety stock levels for fast-moving products.',
      priority: 2,
      products_affected: fastMoversLow.length
    })
  }
  
  // Overstock insight
  const overstock = productInsights.filter(p => p.is_overstock)
  if (overstock.length > 0) {
    const overstockValue = overstock.reduce((sum, p) => sum + p.inventory_value, 0)
    insights.push({
      type: 'optimization',
      title: `${overstock.length} products are overstocked`,
      description: 'Excess inventory ties up capital and storage space.',
      action: 'Review and adjust maximum stock levels.',
      priority: 3,
      products_affected: overstock.length,
      financial_impact: Math.round(overstockValue)
    })
  }
  
  return insights.sort((a, b) => a.priority - b.priority)
}

function generateInventorySummary(productInsights) {
  const totalProducts = productInsights.length
  const activeProducts = productInsights.filter(p => p.current_stock > 0).length
  const totalInventoryValue = productInsights.reduce((sum, p) => sum + p.inventory_value, 0)
  
  const stockAlertCounts = {
    critical: productInsights.filter(p => p.stock_priority === 'critical').length,
    high: productInsights.filter(p => p.stock_priority === 'high').length,
    medium: productInsights.filter(p => p.stock_priority === 'medium').length
  }
  
  const velocityDistribution = {
    fast: productInsights.filter(p => p.velocity_class === 'fast').length,
    medium: productInsights.filter(p => p.velocity_class === 'medium').length,
    slow: productInsights.filter(p => p.velocity_class === 'slow').length,
    dead: productInsights.filter(p => p.velocity_class === 'dead').length
  }
  
  const averageTurnover = productInsights.length > 0 
    ? productInsights.reduce((sum, p) => sum + p.annualized_turnover, 0) / productInsights.length 
    : 0
  
  return {
    total_products: totalProducts,
    active_products: activeProducts,
    total_inventory_value: Math.round(totalInventoryValue * 100) / 100,
    average_turnover_rate: Math.round(averageTurnover * 100) / 100,
    stock_alerts: stockAlertCounts,
    velocity_distribution: velocityDistribution,
    health_score: calculateInventoryHealthScore(productInsights)
  }
}

function calculateInventoryHealthScore(productInsights) {
  if (productInsights.length === 0) return 0
  
  let score = 100
  
  // Deduct for stock issues
  const criticalStock = productInsights.filter(p => p.stock_priority === 'critical').length
  const highPriorityStock = productInsights.filter(p => p.stock_priority === 'high').length
  
  score -= (criticalStock * 10) // -10 points per critical item
  score -= (highPriorityStock * 5) // -5 points per high priority item
  
  // Deduct for dead stock
  const deadStock = productInsights.filter(p => p.is_dead_stock).length
  score -= (deadStock * 3) // -3 points per dead stock item
  
  // Bonus for good turnover
  const fastMovers = productInsights.filter(p => p.velocity_class === 'fast').length
  const bonusPoints = Math.min(20, (fastMovers / productInsights.length) * 20)
  score += bonusPoints
  
  return Math.max(0, Math.min(100, Math.round(score)))
}