import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/**
 * GET /api/shop/analytics/performance-charts
 * 
 * Retrieves performance chart data for dashboard visualizations:
 * - Revenue over time (daily/weekly/monthly)
 * - Product sales trends
 * - Category performance over time
 * - Inventory turnover rates
 * - Profit margin trends
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
      .select('barbershop_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.shop_id) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const barbershopId = profile.shop_id
    const { searchParams } = new URL(request.url)
    const periodDays = parseInt(searchParams.get('period_days') || '30')
    const granularity = searchParams.get('granularity') || 'daily' // daily, weekly, monthly
    
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)
    const endDate = new Date()

    // Get comprehensive sales data with product details
    const { data: salesData, error: salesError } = await supabase
      .from('product_sales')
      .select(`
        id,
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
      .eq('barbershop_id', barbershopId)
      .gte('sale_date', startDate.toISOString())
      .lte('sale_date', endDate.toISOString())
      .order('sale_date', { ascending: true })

    if (salesError) {
      console.error('Error fetching sales data:', salesError)
      return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
    }

    // Get current inventory levels
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        category,
        current_stock,
        cost_price,
        retail_price,
        created_at
      `)
      .eq('barbershop_id', barbershopId)
      .eq('is_active', true)

    if (inventoryError) {
      console.error('Error fetching inventory data:', inventoryError)
      return NextResponse.json({ error: 'Failed to fetch inventory data' }, { status: 500 })
    }

    // Calculate chart data
    const chartData = calculatePerformanceCharts(
      salesData || [], 
      inventoryData || [], 
      startDate, 
      endDate, 
      granularity
    )

    return NextResponse.json({
      success: true,
      period_days: periodDays,
      granularity: granularity,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      ...chartData,
      last_updated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in GET /api/shop/analytics/performance-charts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculatePerformanceCharts(salesData, inventoryData, startDate, endDate, granularity) {
  // Generate date periods based on granularity
  const periods = generateDatePeriods(startDate, endDate, granularity)
  
  // Revenue over time chart
  const revenueChart = calculateRevenueOverTime(salesData, periods, granularity)
  
  // Product sales trends (top 10 products)
  const productTrends = calculateProductSalesTrends(salesData, periods, granularity)
  
  // Category performance over time
  const categoryTrends = calculateCategoryTrends(salesData, periods, granularity)
  
  // Inventory turnover rates
  const inventoryTurnover = calculateInventoryTurnover(salesData, inventoryData, periods)
  
  // Profit margin trends
  const profitMarginTrends = calculateProfitMarginTrends(salesData, periods, granularity)
  
  // Performance summary for period comparison
  const performanceSummary = calculatePerformanceSummary(salesData, periods)

  return {
    charts: {
      revenue_over_time: revenueChart,
      top_product_trends: productTrends,
      category_performance: categoryTrends,
      inventory_turnover: inventoryTurnover,
      profit_margin_trends: profitMarginTrends
    },
    summary: performanceSummary
  }
}

function generateDatePeriods(startDate, endDate, granularity) {
  const periods = []
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const periodStart = new Date(current)
    let periodEnd, label, key
    
    switch (granularity) {
      case 'weekly':
        periodEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)
        label = `Week of ${current.toLocaleDateString()}`
        key = `${current.getFullYear()}-W${getWeekNumber(current)}`
        current.setDate(current.getDate() + 7)
        break
      case 'monthly':
        periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59)
        label = current.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
        current.setMonth(current.getMonth() + 1, 1)
        break
      default: // daily
        periodEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000 - 1)
        label = current.toLocaleDateString()
        key = current.toISOString().split('T')[0]
        current.setDate(current.getDate() + 1)
        break
    }
    
    if (periodEnd > endDate) periodEnd = endDate
    
    periods.push({
      start: new Date(periodStart),
      end: new Date(periodEnd),
      label: label,
      key: key
    })
    
    if (periodEnd >= endDate) break
  }
  
  return periods
}

function calculateRevenueOverTime(salesData, periods, granularity) {
  const revenueByPeriod = new Map()
  
  // Initialize all periods with 0
  periods.forEach(period => {
    revenueByPeriod.set(period.key, {
      period: period.label,
      date: period.key,
      revenue: 0,
      profit: 0,
      quantity: 0,
      transactions: 0
    })
  })
  
  // Aggregate sales data by period
  salesData.forEach(sale => {
    const saleDate = new Date(sale.sale_date)
    const period = periods.find(p => saleDate >= p.start && saleDate <= p.end)
    
    if (period) {
      const existing = revenueByPeriod.get(period.key)
      const cost = (sale.products?.cost_price || 0) * sale.quantity
      const profit = sale.total_amount - cost
      
      existing.revenue += sale.total_amount
      existing.profit += profit
      existing.quantity += sale.quantity
      existing.transactions += 1
    }
  })
  
  return Array.from(revenueByPeriod.values()).map(item => ({
    ...item,
    revenue: Math.round(item.revenue * 100) / 100,
    profit: Math.round(item.profit * 100) / 100,
    avg_transaction_value: item.transactions > 0 ? Math.round((item.revenue / item.transactions) * 100) / 100 : 0
  }))
}

function calculateProductSalesTrends(salesData, periods, granularity) {
  // Find top 10 products by total sales
  const productSales = new Map()
  
  salesData.forEach(sale => {
    const productKey = `${sale.product_id}-${sale.products?.name || 'Unknown'}`
    if (!productSales.has(productKey)) {
      productSales.set(productKey, {
        product_id: sale.product_id,
        name: sale.products?.name || 'Unknown Product',
        category: sale.products?.category || 'uncategorized',
        total_quantity: 0,
        total_revenue: 0
      })
    }
    
    const existing = productSales.get(productKey)
    existing.total_quantity += sale.quantity
    existing.total_revenue += sale.total_amount
  })
  
  // Get top 10 products
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)
  
  // Calculate trends for each top product
  return topProducts.map(product => {
    const productPeriodData = new Map()
    
    // Initialize periods
    periods.forEach(period => {
      productPeriodData.set(period.key, {
        period: period.label,
        date: period.key,
        quantity: 0,
        revenue: 0
      })
    })
    
    // Aggregate sales for this product
    salesData
      .filter(sale => sale.product_id === product.product_id)
      .forEach(sale => {
        const saleDate = new Date(sale.sale_date)
        const period = periods.find(p => saleDate >= p.start && saleDate <= p.end)
        
        if (period) {
          const existing = productPeriodData.get(period.key)
          existing.quantity += sale.quantity
          existing.revenue += sale.total_amount
        }
      })
    
    return {
      product_id: product.product_id,
      name: product.name,
      category: product.category,
      total_revenue: Math.round(product.total_revenue * 100) / 100,
      total_quantity: product.total_quantity,
      data: Array.from(productPeriodData.values()).map(item => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100
      }))
    }
  })
}

function calculateCategoryTrends(salesData, periods, granularity) {
  // Find all categories
  const categories = [...new Set(salesData.map(sale => sale.products?.category || 'uncategorized'))]
  
  return categories.map(category => {
    const categoryPeriodData = new Map()
    
    // Initialize periods
    periods.forEach(period => {
      categoryPeriodData.set(period.key, {
        period: period.label,
        date: period.key,
        quantity: 0,
        revenue: 0,
        profit: 0,
        transactions: 0
      })
    })
    
    // Aggregate sales for this category
    salesData
      .filter(sale => (sale.products?.category || 'uncategorized') === category)
      .forEach(sale => {
        const saleDate = new Date(sale.sale_date)
        const period = periods.find(p => saleDate >= p.start && saleDate <= p.end)
        
        if (period) {
          const existing = categoryPeriodData.get(period.key)
          const cost = (sale.products?.cost_price || 0) * sale.quantity
          const profit = sale.total_amount - cost
          
          existing.quantity += sale.quantity
          existing.revenue += sale.total_amount
          existing.profit += profit
          existing.transactions += 1
        }
      })
    
    const totalRevenue = Array.from(categoryPeriodData.values())
      .reduce((sum, item) => sum + item.revenue, 0)
    
    return {
      category: category,
      total_revenue: Math.round(totalRevenue * 100) / 100,
      data: Array.from(categoryPeriodData.values()).map(item => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        profit: Math.round(item.profit * 100) / 100,
        profit_margin: item.revenue > 0 ? Math.round(((item.profit / item.revenue) * 100) * 10) / 10 : 0
      }))
    }
  }).sort((a, b) => b.total_revenue - a.total_revenue)
}

function calculateInventoryTurnover(salesData, inventoryData, periods) {
  return inventoryData.map(product => {
    const productSales = salesData.filter(sale => sale.product_id === product.id)
    const totalQuantitySold = productSales.reduce((sum, sale) => sum + sale.quantity, 0)
    const averageInventory = product.current_stock || 1 // Avoid division by zero
    
    // Calculate turnover rate (sales / average inventory)
    const turnoverRate = totalQuantitySold / averageInventory
    
    // Calculate days to sell current inventory
    const periodDays = (periods[periods.length - 1]?.end.getTime() - periods[0]?.start.getTime()) / (24 * 60 * 60 * 1000)
    const dailyAverageSales = totalQuantitySold / periodDays
    const daysToSellInventory = dailyAverageSales > 0 ? product.current_stock / dailyAverageSales : Infinity
    
    // Velocity classification
    let velocityClass = 'slow'
    if (turnoverRate > 2) velocityClass = 'fast'
    else if (turnoverRate > 1) velocityClass = 'medium'
    
    return {
      product_id: product.id,
      name: product.name,
      category: product.category,
      current_stock: product.current_stock,
      quantity_sold: totalQuantitySold,
      turnover_rate: Math.round(turnoverRate * 100) / 100,
      days_to_sell_inventory: daysToSellInventory === Infinity ? null : Math.round(daysToSellInventory),
      velocity_class: velocityClass,
      revenue_generated: Math.round(productSales.reduce((sum, sale) => sum + sale.total_amount, 0) * 100) / 100
    }
  }).sort((a, b) => b.turnover_rate - a.turnover_rate)
}

function calculateProfitMarginTrends(salesData, periods, granularity) {
  const marginByPeriod = new Map()
  
  // Initialize all periods
  periods.forEach(period => {
    marginByPeriod.set(period.key, {
      period: period.label,
      date: period.key,
      total_revenue: 0,
      total_cost: 0,
      profit_margin: 0,
      transactions: 0
    })
  })
  
  // Aggregate by period
  salesData.forEach(sale => {
    const saleDate = new Date(sale.sale_date)
    const period = periods.find(p => saleDate >= p.start && saleDate <= p.end)
    
    if (period) {
      const existing = marginByPeriod.get(period.key)
      const cost = (sale.products?.cost_price || 0) * sale.quantity
      
      existing.total_revenue += sale.total_amount
      existing.total_cost += cost
      existing.transactions += 1
    }
  })
  
  // Calculate profit margins
  return Array.from(marginByPeriod.values()).map(item => ({
    ...item,
    total_revenue: Math.round(item.total_revenue * 100) / 100,
    total_cost: Math.round(item.total_cost * 100) / 100,
    profit: Math.round((item.total_revenue - item.total_cost) * 100) / 100,
    profit_margin: item.total_revenue > 0 
      ? Math.round(((item.total_revenue - item.total_cost) / item.total_revenue * 100) * 10) / 10 
      : 0
  }))
}

function calculatePerformanceSummary(salesData, periods) {
  if (periods.length < 2) {
    return {
      current_period_revenue: 0,
      previous_period_revenue: 0,
      revenue_growth: 0,
      current_period_transactions: 0,
      previous_period_transactions: 0,
      transaction_growth: 0
    }
  }
  
  const midpoint = Math.floor(periods.length / 2)
  const firstHalf = periods.slice(0, midpoint)
  const secondHalf = periods.slice(midpoint)
  
  const firstHalfSales = salesData.filter(sale => {
    const saleDate = new Date(sale.sale_date)
    return firstHalf.some(period => saleDate >= period.start && saleDate <= period.end)
  })
  
  const secondHalfSales = salesData.filter(sale => {
    const saleDate = new Date(sale.sale_date)
    return secondHalf.some(period => saleDate >= period.start && saleDate <= period.end)
  })
  
  const firstHalfRevenue = firstHalfSales.reduce((sum, sale) => sum + sale.total_amount, 0)
  const secondHalfRevenue = secondHalfSales.reduce((sum, sale) => sum + sale.total_amount, 0)
  
  const revenueGrowth = firstHalfRevenue > 0 
    ? ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 
    : 0
  
  const transactionGrowth = firstHalfSales.length > 0 
    ? ((secondHalfSales.length - firstHalfSales.length) / firstHalfSales.length) * 100 
    : 0
  
  return {
    previous_period_revenue: Math.round(firstHalfRevenue * 100) / 100,
    current_period_revenue: Math.round(secondHalfRevenue * 100) / 100,
    revenue_growth: Math.round(revenueGrowth * 10) / 10,
    previous_period_transactions: firstHalfSales.length,
    current_period_transactions: secondHalfSales.length,
    transaction_growth: Math.round(transactionGrowth * 10) / 10
  }
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}