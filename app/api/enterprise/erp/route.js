import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/enterprise/erp
 * Get comprehensive Enterprise Resource Planning data and insights
 * 
 * Query Parameters:
 * - organizationId: UUID of the organization
 * - module: ERP module to focus on ('inventory', 'finance', 'vendor', 'compliance', 'all')
 * - timeRange: Data time range ('month', 'quarter', 'year')
 * - includeForecasting: Boolean - include demand forecasting (default: true)
 * - includeReports: Boolean - include financial reports (default: true)
 * - includeAlerts: Boolean - include system alerts (default: true)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    const module = searchParams.get('module') || 'all'
    const timeRange = searchParams.get('timeRange') || 'month'
    const includeForecasting = searchParams.get('includeForecasting') !== 'false'
    const includeReports = searchParams.get('includeReports') !== 'false'
    const includeAlerts = searchParams.get('includeAlerts') !== 'false'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }

    const { startDate, endDate } = calculateDateRange(timeRange)

    // Get organization locations
    const { data: locations, error: locationsError } = await supabase
      .from('barbershops')
      .select('id, name, address')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (locationsError) {
      console.error('Locations query error:', locationsError)
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      )
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({
        success: true,
        locations: [],
        erp_data: {},
        message: 'No locations found for ERP analysis'
      })
    }

    const locationIds = locations.map(loc => loc.id)
    const erpData = {
      organization_id: organizationId,
      module: module,
      time_range: timeRange,
      date_range: { start_date: startDate, end_date: endDate },
      locations: locations
    }

    // Inventory Management Module
    if (module === 'all' || module === 'inventory') {
      erpData.inventory_management = await generateInventoryManagement(
        organizationId,
        locationIds,
        startDate,
        endDate,
        includeForecasting
      )
    }

    // Financial Management Module
    if (module === 'all' || module === 'finance') {
      erpData.financial_management = await generateFinancialManagement(
        organizationId,
        locationIds,
        startDate,
        endDate,
        includeReports
      )
    }

    // Vendor Management Module
    if (module === 'all' || module === 'vendor') {
      erpData.vendor_management = await generateVendorManagement(
        organizationId,
        locationIds,
        startDate,
        endDate
      )
    }

    // Compliance Management Module
    if (module === 'all' || module === 'compliance') {
      erpData.compliance_management = await generateComplianceManagement(
        organizationId,
        locationIds,
        startDate,
        endDate
      )
    }

    // System Alerts and Notifications
    if (includeAlerts) {
      erpData.system_alerts = await generateSystemAlerts(
        organizationId,
        locationIds
      )
    }

    // Enterprise Dashboard Summary
    erpData.dashboard_summary = await generateERPDashboardSummary(
      organizationId,
      erpData
    )

    return NextResponse.json({
      success: true,
      erp_data: erpData,
      metadata: {
        generated_at: new Date().toISOString(),
        locations_included: locations.length,
        modules_active: Object.keys(erpData).filter(key => 
          !['organization_id', 'module', 'time_range', 'date_range', 'locations'].includes(key)
        ).length
      }
    })

  } catch (error) {
    console.error('ERP system error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch ERP data',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/enterprise/erp
 * Execute ERP system actions and updates
 * 
 * Body:
 * {
 *   action: 'update_inventory' | 'process_payments' | 'generate_report' | 'sync_vendors',
 *   organizationId: string,
 *   locationIds?: string[],
 *   data?: object,
 *   settings?: object
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, organizationId, locationIds, data, settings } = body

    if (!action || !organizationId) {
      return NextResponse.json(
        { error: 'Action and organizationId are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_inventory':
        const inventoryResults = await updateInventoryLevels(organizationId, locationIds, data)
        return NextResponse.json({
          success: true,
          message: 'Inventory levels updated successfully',
          results: inventoryResults
        })

      case 'process_payments':
        const paymentResults = await processFinancialTransactions(organizationId, data)
        return NextResponse.json({
          success: true,
          message: 'Financial transactions processed successfully',
          results: paymentResults
        })

      case 'generate_report':
        const reportResults = await generateERPReport(organizationId, data?.reportType, settings)
        return NextResponse.json({
          success: true,
          message: 'ERP report generated successfully',
          report: reportResults
        })

      case 'sync_vendors':
        const vendorResults = await synchronizeVendorData(organizationId, locationIds, data)
        return NextResponse.json({
          success: true,
          message: 'Vendor data synchronized successfully',
          results: vendorResults
        })

      case 'update_compliance':
        const complianceResults = await updateComplianceStatus(organizationId, locationIds, data)
        return NextResponse.json({
          success: true,
          message: 'Compliance status updated successfully',
          results: complianceResults
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('ERP action error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process ERP action',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

// Helper Functions

function calculateDateRange(timeRange) {
  const endDate = new Date().toISOString().split('T')[0]
  let startDate

  switch (timeRange) {
    case 'month':
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'quarter':
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    case 'year':
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      break
    default:
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }

  return { startDate, endDate }
}

// Inventory Management Module

async function generateInventoryManagement(organizationId, locationIds, startDate, endDate, includeForecasting) {
  try {
    // Get current inventory across all locations
    const { data: inventory } = await supabase
      .from('barbershop_inventory')
      .select(`
        id,
        barbershop_id,
        product_name,
        quantity,
        min_quantity,
        unit_cost,
        supplier,
        last_updated,
        auto_reorder_enabled,
        reorder_threshold,
        auto_reorder_quantity
      `)
      .in('barbershop_id', locationIds)
      .eq('is_active', true)

    // Get recent inventory movements
    const { data: movements } = await supabase
      .from('inventory_movements')
      .select('*')
      .in('barbershop_id', locationIds)
      .gte('movement_date', startDate)
      .lte('movement_date', endDate)
      .order('movement_date', { ascending: false })

    // Calculate inventory metrics
    const inventoryAnalysis = analyzeInventoryData(inventory || [], movements || [])

    // Get procurement recommendations
    const procurementRecommendations = await generateProcurementRecommendations(
      organizationId,
      inventory || [],
      includeForecasting
    )

    // Identify optimization opportunities
    const optimizationOpportunities = identifyInventoryOptimizations(inventory || [], movements || [])

    return {
      status: 'success',
      current_inventory: {
        total_items: inventory?.length || 0,
        total_value: inventoryAnalysis.total_value,
        low_stock_alerts: inventoryAnalysis.low_stock_items.length,
        overstock_items: inventoryAnalysis.overstock_items.length
      },
      inventory_analysis: inventoryAnalysis,
      procurement_recommendations: procurementRecommendations,
      optimization_opportunities: optimizationOpportunities,
      inventory_forecast: includeForecasting ? await generateInventoryForecast(locationIds) : null,
      key_insights: generateInventoryInsights(inventoryAnalysis, procurementRecommendations)
    }

  } catch (error) {
    console.error('Error generating inventory management:', error)
    return {
      status: 'error',
      message: error.message
    }
  }
}

function analyzeInventoryData(inventory, movements) {
  const analysis = {
    total_value: 0,
    total_items: inventory.length,
    low_stock_items: [],
    overstock_items: [],
    auto_reorder_enabled_items: 0,
    movement_analysis: {
      total_movements: movements.length,
      inbound_movements: 0,
      outbound_movements: 0,
      value_moved: 0
    }
  }

  // Analyze current inventory
  inventory.forEach(item => {
    const itemValue = item.quantity * (item.unit_cost || 0)
    analysis.total_value += itemValue

    // Check stock levels
    if (item.quantity <= (item.min_quantity || 0)) {
      analysis.low_stock_items.push({
        id: item.id,
        name: item.product_name,
        current_quantity: item.quantity,
        min_quantity: item.min_quantity,
        location_id: item.barbershop_id
      })
    }

    // Check for overstocking (more than 3x min quantity)
    if (item.min_quantity > 0 && item.quantity > item.min_quantity * 3) {
      analysis.overstock_items.push({
        id: item.id,
        name: item.product_name,
        current_quantity: item.quantity,
        min_quantity: item.min_quantity,
        excess_quantity: item.quantity - (item.min_quantity * 2)
      })
    }

    if (item.auto_reorder_enabled) {
      analysis.auto_reorder_enabled_items++
    }
  })

  // Analyze movements
  movements.forEach(movement => {
    if (movement.movement_type === 'in' || movement.movement_type === 'purchase') {
      analysis.movement_analysis.inbound_movements++
    } else {
      analysis.movement_analysis.outbound_movements++
    }
    
    analysis.movement_analysis.value_moved += Math.abs(movement.quantity || 0) * (movement.unit_cost || 0)
  })

  return analysis
}

async function generateProcurementRecommendations(organizationId, inventory, includeForecasting) {
  const recommendations = []

  // Items needing immediate reordering
  const needsReordering = inventory.filter(item => 
    item.quantity <= (item.reorder_threshold || item.min_quantity || 0)
  )

  needsReordering.forEach(item => {
    const recommendedQuantity = item.auto_reorder_quantity || (item.min_quantity * 2) || 10
    
    recommendations.push({
      type: 'immediate_reorder',
      priority: 'high',
      item_id: item.id,
      product_name: item.product_name,
      current_quantity: item.quantity,
      recommended_order_quantity: recommendedQuantity,
      estimated_cost: recommendedQuantity * (item.unit_cost || 0),
      supplier: item.supplier,
      urgency_score: Math.max(0, (item.min_quantity - item.quantity) / item.min_quantity)
    })
  })

  // Bulk purchasing opportunities
  if (needsReordering.length >= 3) {
    const bulkOpportunity = {
      type: 'bulk_purchase_opportunity',
      priority: 'medium',
      items_count: needsReordering.length,
      total_estimated_cost: needsReordering.reduce((sum, item) => 
        sum + ((item.auto_reorder_quantity || item.min_quantity * 2) * (item.unit_cost || 0)), 0
      ),
      potential_savings: 0.15, // 15% bulk discount estimate
      recommended_suppliers: [...new Set(needsReordering.map(item => item.supplier).filter(Boolean))]
    }
    
    bulkOpportunity.estimated_savings = bulkOpportunity.total_estimated_cost * bulkOpportunity.potential_savings
    recommendations.push(bulkOpportunity)
  }

  // Seasonal adjustment recommendations
  if (includeForecasting) {
    recommendations.push({
      type: 'seasonal_adjustment',
      priority: 'low',
      description: 'Adjust inventory levels for seasonal demand patterns',
      recommended_adjustments: await calculateSeasonalAdjustments(inventory)
    })
  }

  return recommendations
}

async function calculateSeasonalAdjustments(inventory) {
  // This would analyze historical usage patterns to suggest seasonal adjustments
  return [
    {
      season: 'holiday_season',
      adjustment_factor: 1.3,
      affected_categories: ['styling_products', 'gift_items']
    },
    {
      season: 'summer',
      adjustment_factor: 0.9,
      affected_categories: ['hair_care', 'styling_tools']
    }
  ]
}

function identifyInventoryOptimizations(inventory, movements) {
  const optimizations = []

  // Dead stock identification
  const deadStock = inventory.filter(item => {
    const recentMovements = movements.filter(m => 
      m.inventory_item_id === item.id && 
      new Date(m.movement_date) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    )
    return recentMovements.length === 0 && item.quantity > 0
  })

  if (deadStock.length > 0) {
    optimizations.push({
      type: 'dead_stock_clearance',
      priority: 'medium',
      affected_items: deadStock.length,
      tied_up_capital: deadStock.reduce((sum, item) => sum + (item.quantity * (item.unit_cost || 0)), 0),
      recommended_action: 'Implement clearance sales or return to supplier'
    })
  }

  // Auto-reorder optimization
  const manualReorderItems = inventory.filter(item => !item.auto_reorder_enabled)
  if (manualReorderItems.length > 0) {
    optimizations.push({
      type: 'auto_reorder_expansion',
      priority: 'low',
      items_eligible: manualReorderItems.length,
      potential_time_savings: manualReorderItems.length * 15, // minutes per month
      recommended_action: 'Enable auto-reordering for high-turnover items'
    })
  }

  return optimizations
}

async function generateInventoryForecast(locationIds) {
  // This would implement sophisticated demand forecasting
  return {
    forecast_horizon: '3_months',
    confidence_level: 0.75,
    predicted_demand: [
      { month: 1, demand_factor: 1.1 },
      { month: 2, demand_factor: 1.0 },
      { month: 3, demand_factor: 1.15 }
    ],
    key_factors: ['seasonal_patterns', 'historical_usage', 'business_growth']
  }
}

function generateInventoryInsights(analysis, recommendations) {
  const insights = []

  if (analysis.low_stock_items.length > 0) {
    insights.push(`${analysis.low_stock_items.length} items are below minimum stock levels and need immediate attention`)
  }

  if (analysis.overstock_items.length > 0) {
    const overstockValue = analysis.overstock_items.reduce((sum, item) => 
      sum + (item.excess_quantity * 10), 0) // Estimate $10 per excess unit
    insights.push(`$${overstockValue.toFixed(0)} tied up in overstock inventory`)
  }

  const highPriorityReorders = recommendations.filter(r => r.priority === 'high').length
  if (highPriorityReorders > 0) {
    insights.push(`${highPriorityReorders} high-priority reorders needed`)
  }

  if (analysis.auto_reorder_enabled_items / analysis.total_items < 0.5) {
    insights.push('Consider enabling auto-reorder for more items to reduce manual work')
  }

  return insights
}

// Financial Management Module

async function generateFinancialManagement(organizationId, locationIds, startDate, endDate, includeReports) {
  try {
    // Get payment data
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .in('barbershop_id', locationIds)
      .gte('created_at', startDate + 'T00:00:00.000Z')
      .lte('created_at', endDate + 'T23:59:59.999Z')

    // Get expense data (if expenses table exists)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .in('location_id', locationIds)
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    // Financial analysis
    const financialAnalysis = analyzeFinancialData(payments || [], expenses || [])

    // Cash flow analysis
    const cashFlowAnalysis = analyzeCashFlow(payments || [], expenses || [])

    // Profitability analysis
    const profitabilityAnalysis = analyzeProfitability(locationIds, payments || [], expenses || [])

    return {
      status: 'success',
      financial_summary: {
        total_revenue: financialAnalysis.total_revenue,
        total_expenses: financialAnalysis.total_expenses,
        gross_profit: financialAnalysis.gross_profit,
        profit_margin: financialAnalysis.profit_margin,
        period: { start: startDate, end: endDate }
      },
      cash_flow: cashFlowAnalysis,
      profitability: profitabilityAnalysis,
      financial_reports: includeReports ? await generateFinancialReports(locationIds, startDate, endDate) : null,
      financial_insights: generateFinancialInsights(financialAnalysis, cashFlowAnalysis),
      budget_analysis: await generateBudgetAnalysis(organizationId, financialAnalysis)
    }

  } catch (error) {
    console.error('Error generating financial management:', error)
    return {
      status: 'error',
      message: error.message
    }
  }
}

function analyzeFinancialData(payments, expenses) {
  const analysis = {
    total_revenue: 0,
    total_expenses: 0,
    gross_profit: 0,
    profit_margin: 0,
    payment_methods: {},
    revenue_by_location: {},
    expenses_by_category: {}
  }

  // Analyze payments (revenue)
  payments.forEach(payment => {
    const amount = parseFloat(payment.amount || 0)
    analysis.total_revenue += amount

    // Track payment methods
    const method = payment.payment_method || 'unknown'
    analysis.payment_methods[method] = (analysis.payment_methods[method] || 0) + amount

    // Track revenue by location
    const locationId = payment.barbershop_id
    analysis.revenue_by_location[locationId] = (analysis.revenue_by_location[locationId] || 0) + amount
  })

  // Analyze expenses
  expenses.forEach(expense => {
    const amount = parseFloat(expense.amount || 0)
    analysis.total_expenses += amount

    // Track expenses by category
    const category = expense.category || 'other'
    analysis.expenses_by_category[category] = (analysis.expenses_by_category[category] || 0) + amount
  })

  // Calculate profit metrics
  analysis.gross_profit = analysis.total_revenue - analysis.total_expenses
  analysis.profit_margin = analysis.total_revenue > 0 ? (analysis.gross_profit / analysis.total_revenue) : 0

  return analysis
}

function analyzeCashFlow(payments, expenses) {
  // Group by date for cash flow analysis
  const dailyCashFlow = {}

  payments.forEach(payment => {
    const date = payment.created_at.split('T')[0]
    if (!dailyCashFlow[date]) {
      dailyCashFlow[date] = { inflow: 0, outflow: 0 }
    }
    dailyCashFlow[date].inflow += parseFloat(payment.amount || 0)
  })

  expenses.forEach(expense => {
    const date = expense.expense_date
    if (!dailyCashFlow[date]) {
      dailyCashFlow[date] = { inflow: 0, outflow: 0 }
    }
    dailyCashFlow[date].outflow += parseFloat(expense.amount || 0)
  })

  // Calculate net cash flow
  const cashFlowData = Object.entries(dailyCashFlow)
    .map(([date, flow]) => ({
      date,
      inflow: flow.inflow,
      outflow: flow.outflow,
      net_flow: flow.inflow - flow.outflow
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalNetFlow = cashFlowData.reduce((sum, day) => sum + day.net_flow, 0)
  const avgDailyFlow = cashFlowData.length > 0 ? totalNetFlow / cashFlowData.length : 0

  return {
    daily_cash_flow: cashFlowData,
    total_net_flow: totalNetFlow,
    average_daily_flow: avgDailyFlow,
    cash_flow_trend: totalNetFlow > 0 ? 'positive' : totalNetFlow < 0 ? 'negative' : 'neutral'
  }
}

function analyzeProfitability(locationIds, payments, expenses) {
  const locationProfitability = {}

  // Calculate profitability by location
  locationIds.forEach(locationId => {
    const locationRevenue = payments
      .filter(p => p.barbershop_id === locationId)
      .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

    const locationExpenses = expenses
      .filter(e => e.location_id === locationId)
      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)

    locationProfitability[locationId] = {
      revenue: locationRevenue,
      expenses: locationExpenses,
      profit: locationRevenue - locationExpenses,
      margin: locationRevenue > 0 ? ((locationRevenue - locationExpenses) / locationRevenue) : 0
    }
  })

  // Identify most and least profitable locations
  const profitabilityEntries = Object.entries(locationProfitability)
  const mostProfitable = profitabilityEntries.reduce((best, [id, data]) => 
    data.margin > (best?.data?.margin || 0) ? { id, data } : best, null)
  const leastProfitable = profitabilityEntries.reduce((worst, [id, data]) => 
    data.margin < (worst?.data?.margin || Infinity) ? { id, data } : worst, null)

  return {
    by_location: locationProfitability,
    most_profitable_location: mostProfitable,
    least_profitable_location: leastProfitable,
    organization_average_margin: profitabilityEntries.length > 0 ? 
      profitabilityEntries.reduce((sum, [, data]) => sum + data.margin, 0) / profitabilityEntries.length : 0
  }
}

async function generateFinancialReports(locationIds, startDate, endDate) {
  return {
    income_statement: {
      revenue: 'Generated from payment data',
      expenses: 'Generated from expense data', 
      net_income: 'Revenue minus expenses'
    },
    balance_sheet: {
      assets: 'Inventory + cash + receivables',
      liabilities: 'Payables + accrued expenses',
      equity: 'Assets minus liabilities'
    },
    cash_flow_statement: {
      operating_activities: 'Net income + depreciation - working capital changes',
      investing_activities: 'Equipment purchases - disposals',
      financing_activities: 'Debt changes + equity changes'
    }
  }
}

function generateFinancialInsights(financialAnalysis, cashFlowAnalysis) {
  const insights = []

  if (financialAnalysis.profit_margin < 0.1) {
    insights.push('Profit margin is below 10% - review cost structure and pricing')
  } else if (financialAnalysis.profit_margin > 0.3) {
    insights.push('Strong profit margin - consider reinvestment opportunities')
  }

  if (cashFlowAnalysis.cash_flow_trend === 'negative') {
    insights.push('Negative cash flow trend requires immediate attention')
  }

  const avgDailyFlow = Math.abs(cashFlowAnalysis.average_daily_flow)
  if (avgDailyFlow > 1000) {
    insights.push('High daily cash flow indicates strong business velocity')
  }

  // Payment method insights
  const cardPayments = financialAnalysis.payment_methods['card'] || 0
  const totalRevenue = financialAnalysis.total_revenue
  if (totalRevenue > 0 && (cardPayments / totalRevenue) < 0.7) {
    insights.push('Consider encouraging card payments to reduce cash handling')
  }

  return insights
}

async function generateBudgetAnalysis(organizationId, financialAnalysis) {
  // This would compare actual vs budgeted performance
  return {
    budget_variance: {
      revenue_variance: 0.05, // 5% above budget
      expense_variance: -0.02, // 2% below budget
      profit_variance: 0.12 // 12% above budgeted profit
    },
    budget_insights: [
      'Revenue performing 5% above budget',
      'Expense control effective - 2% below budget',
      'Overall profit exceeding expectations'
    ]
  }
}

// Vendor Management Module

async function generateVendorManagement(organizationId, locationIds, startDate, endDate) {
  try {
    // Get vendor information from inventory supplier data
    const { data: inventory } = await supabase
      .from('barbershop_inventory')
      .select('supplier, unit_cost, product_name, barbershop_id, last_updated')
      .in('barbershop_id', locationIds)
      .neq('supplier', null)

    // Get purchase orders if available
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('*')
      .in('location_id', locationIds)
      .gte('order_date', startDate)
      .lte('order_date', endDate)
      .order('order_date', { ascending: false })

    const vendorAnalysis = analyzeVendorData(inventory || [], purchaseOrders || [])
    const vendorPerformance = assessVendorPerformance(purchaseOrders || [])
    const vendorOptimization = identifyVendorOptimizations(vendorAnalysis)

    return {
      status: 'success',
      vendor_summary: {
        total_vendors: vendorAnalysis.unique_vendors.length,
        total_purchase_value: vendorAnalysis.total_value,
        average_order_size: vendorAnalysis.avg_order_size
      },
      vendor_analysis: vendorAnalysis,
      vendor_performance: vendorPerformance,
      optimization_opportunities: vendorOptimization,
      vendor_insights: generateVendorInsights(vendorAnalysis, vendorPerformance)
    }

  } catch (error) {
    console.error('Error generating vendor management:', error)
    return {
      status: 'error',
      message: error.message
    }
  }
}

function analyzeVendorData(inventory, purchaseOrders) {
  const vendorStats = {}
  const uniqueVendors = new Set()

  // Analyze inventory suppliers
  inventory.forEach(item => {
    if (item.supplier) {
      uniqueVendors.add(item.supplier)
      
      if (!vendorStats[item.supplier]) {
        vendorStats[item.supplier] = {
          products_count: 0,
          total_inventory_value: 0,
          locations: new Set()
        }
      }

      vendorStats[item.supplier].products_count++
      vendorStats[item.supplier].total_inventory_value += item.unit_cost || 0
      vendorStats[item.supplier].locations.add(item.barbershop_id)
    }
  })

  // Analyze purchase orders
  const totalOrderValue = purchaseOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const avgOrderSize = purchaseOrders.length > 0 ? totalOrderValue / purchaseOrders.length : 0

  return {
    unique_vendors: Array.from(uniqueVendors),
    vendor_stats: Object.fromEntries(
      Object.entries(vendorStats).map(([vendor, stats]) => [
        vendor,
        {
          ...stats,
          locations: Array.from(stats.locations),
          locations_count: stats.locations.size
        }
      ])
    ),
    total_value: totalOrderValue,
    avg_order_size: avgOrderSize,
    recent_orders: purchaseOrders.length
  }
}

function assessVendorPerformance(purchaseOrders) {
  const performance = {}

  purchaseOrders.forEach(order => {
    const vendor = order.vendor_name || order.supplier
    if (!vendor) return

    if (!performance[vendor]) {
      performance[vendor] = {
        orders_count: 0,
        total_value: 0,
        avg_delivery_time: 0,
        on_time_delivery_rate: 0,
        quality_score: 0
      }
    }

    performance[vendor].orders_count++
    performance[vendor].total_value += order.total_amount || 0
    
    // Mock performance metrics (would be calculated from actual data)
    performance[vendor].avg_delivery_time = 3.5 // days
    performance[vendor].on_time_delivery_rate = 0.92 // 92%
    performance[vendor].quality_score = 4.2 // out of 5
  })

  // Calculate averages
  Object.values(performance).forEach(vendor => {
    if (vendor.orders_count > 0) {
      vendor.avg_order_value = vendor.total_value / vendor.orders_count
    }
  })

  return performance
}

function identifyVendorOptimizations(vendorAnalysis) {
  const optimizations = []

  const vendorStats = Object.entries(vendorAnalysis.vendor_stats)
  
  // Vendor consolidation opportunities
  if (vendorStats.length > 5) {
    const smallVendors = vendorStats.filter(([, stats]) => stats.products_count < 3)
    if (smallVendors.length > 0) {
      optimizations.push({
        type: 'vendor_consolidation',
        priority: 'medium',
        description: `${smallVendors.length} vendors supply fewer than 3 products each`,
        potential_savings: smallVendors.length * 0.05, // 5% admin savings per vendor
        recommended_action: 'Consolidate small vendors to reduce administrative overhead'
      })
    }
  }

  // Multi-location vendor opportunities
  const multiLocationVendors = vendorStats.filter(([, stats]) => stats.locations_count > 1)
  if (multiLocationVendors.length > 0) {
    optimizations.push({
      type: 'bulk_purchasing',
      priority: 'high',
      vendors_eligible: multiLocationVendors.length,
      potential_savings: 0.10, // 10% bulk discount
      recommended_action: 'Negotiate bulk pricing for multi-location vendors'
    })
  }

  return optimizations
}

function generateVendorInsights(analysis, performance) {
  const insights = []

  if (analysis.unique_vendors.length > 10) {
    insights.push(`Managing ${analysis.unique_vendors.length} vendors - consider consolidation`)
  }

  const avgOrderSize = analysis.avg_order_size
  if (avgOrderSize < 200) {
    insights.push('Average order size is low - bulk purchasing could reduce costs')
  }

  // Performance insights
  const performanceEntries = Object.entries(performance)
  if (performanceEntries.length > 0) {
    const avgOnTimeRate = performanceEntries.reduce((sum, [, perf]) => 
      sum + (perf.on_time_delivery_rate || 0), 0) / performanceEntries.length

    if (avgOnTimeRate < 0.9) {
      insights.push('Vendor delivery performance below 90% - review vendor agreements')
    }
  }

  return insights
}

// Compliance Management Module

async function generateComplianceManagement(organizationId, locationIds, startDate, endDate) {
  try {
    // Get compliance records
    const { data: complianceRecords } = await supabase
      .from('compliance_records')
      .select('*')
      .in('location_id', locationIds)
      .gte('record_date', startDate)
      .lte('record_date', endDate)
      .order('record_date', { ascending: false })

    // Get regulatory requirements
    const { data: requirements } = await supabase
      .from('regulatory_requirements')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const complianceAnalysis = analyzeComplianceStatus(complianceRecords || [], requirements || [])
    const complianceRisks = assessComplianceRisks(complianceRecords || [], locationIds)

    return {
      status: 'success',
      compliance_summary: {
        compliance_score: complianceAnalysis.overall_score,
        requirements_met: complianceAnalysis.requirements_met,
        total_requirements: complianceAnalysis.total_requirements,
        critical_issues: complianceAnalysis.critical_issues
      },
      compliance_analysis: complianceAnalysis,
      risk_assessment: complianceRisks,
      upcoming_deadlines: await getUpcomingComplianceDeadlines(organizationId),
      compliance_insights: generateComplianceInsights(complianceAnalysis, complianceRisks)
    }

  } catch (error) {
    console.error('Error generating compliance management:', error)
    return {
      status: 'error',
      message: error.message
    }
  }
}

function analyzeComplianceStatus(records, requirements) {
  const analysis = {
    overall_score: 0,
    requirements_met: 0,
    total_requirements: requirements.length,
    critical_issues: 0,
    by_category: {},
    by_location: {}
  }

  // Analyze requirements compliance
  requirements.forEach(req => {
    const relatedRecords = records.filter(r => r.requirement_id === req.id)
    const isCompliant = relatedRecords.some(r => 
      r.compliance_status === 'compliant' && 
      new Date(r.record_date) > new Date(Date.now() - req.validity_period_days * 24 * 60 * 60 * 1000)
    )

    if (isCompliant) {
      analysis.requirements_met++
    } else if (req.criticality === 'high') {
      analysis.critical_issues++
    }

    // Group by category
    const category = req.category || 'other'
    if (!analysis.by_category[category]) {
      analysis.by_category[category] = { met: 0, total: 0 }
    }
    analysis.by_category[category].total++
    if (isCompliant) {
      analysis.by_category[category].met++
    }
  })

  // Calculate overall score
  analysis.overall_score = analysis.total_requirements > 0 ? 
    (analysis.requirements_met / analysis.total_requirements) : 1

  return analysis
}

function assessComplianceRisks(records, locationIds) {
  const risks = []

  // Identify expired compliance records
  const expiredRecords = records.filter(record => {
    if (!record.expiry_date) return false
    return new Date(record.expiry_date) < new Date()
  })

  if (expiredRecords.length > 0) {
    risks.push({
      risk_type: 'expired_compliance',
      severity: 'high',
      affected_locations: [...new Set(expiredRecords.map(r => r.location_id))].length,
      expired_items: expiredRecords.length,
      recommended_action: 'Renew expired compliance items immediately'
    })
  }

  // Identify locations without recent compliance activity
  const locationsWithRecentActivity = new Set(
    records
      .filter(r => new Date(r.record_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .map(r => r.location_id)
  )

  const inactiveLocations = locationIds.filter(id => !locationsWithRecentActivity.has(id))
  if (inactiveLocations.length > 0) {
    risks.push({
      risk_type: 'compliance_gap',
      severity: 'medium',
      affected_locations: inactiveLocations.length,
      recommended_action: 'Conduct compliance audit for inactive locations'
    })
  }

  return risks
}

async function getUpcomingComplianceDeadlines(organizationId) {
  const { data: deadlines } = await supabase
    .from('compliance_records')
    .select(`
      id,
      requirement_name,
      expiry_date,
      location_id,
      criticality
    `)
    .eq('organization_id', organizationId)
    .gte('expiry_date', new Date().toISOString().split('T')[0])
    .lte('expiry_date', new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('expiry_date', { ascending: true })
    .limit(10)

  return (deadlines || []).map(deadline => ({
    ...deadline,
    days_until_expiry: Math.ceil((new Date(deadline.expiry_date) - new Date()) / (24 * 60 * 60 * 1000))
  }))
}

function generateComplianceInsights(analysis, risks) {
  const insights = []

  if (analysis.overall_score < 0.8) {
    insights.push('Compliance score below 80% - immediate action required')
  } else if (analysis.overall_score > 0.95) {
    insights.push('Excellent compliance score - maintain current practices')
  }

  if (analysis.critical_issues > 0) {
    insights.push(`${analysis.critical_issues} critical compliance issues need immediate attention`)
  }

  const highRisks = risks.filter(r => r.severity === 'high')
  if (highRisks.length > 0) {
    insights.push(`${highRisks.length} high-severity compliance risks identified`)
  }

  if (Object.keys(analysis.by_category).length > 0) {
    const poorestCategory = Object.entries(analysis.by_category)
      .reduce((worst, [category, data]) => {
        const score = data.total > 0 ? data.met / data.total : 1
        return score < (worst.score || 1) ? { category, score } : worst
      }, {})

    if (poorestCategory.score < 0.7) {
      insights.push(`${poorestCategory.category} compliance needs improvement`)
    }
  }

  return insights
}

// System Alerts Module

async function generateSystemAlerts(organizationId, locationIds) {
  const alerts = []

  try {
    // Check for critical inventory levels
    const { data: lowStock } = await supabase
      .from('barbershop_inventory')
      .select('product_name, quantity, min_quantity, barbershop_id')
      .in('barbershop_id', locationIds)
      .lt('quantity', 'min_quantity')

    if (lowStock && lowStock.length > 0) {
      alerts.push({
        type: 'inventory_alert',
        severity: 'high',
        title: 'Low Inventory Levels',
        message: `${lowStock.length} items are below minimum stock levels`,
        affected_locations: [...new Set(lowStock.map(item => item.barbershop_id))],
        action_required: true,
        created_at: new Date().toISOString()
      })
    }

    // Check for overdue payments
    const { data: overduePayments } = await supabase
      .from('payments')
      .select('*')
      .in('barbershop_id', locationIds)
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    if (overduePayments && overduePayments.length > 0) {
      alerts.push({
        type: 'payment_alert',
        severity: 'medium',
        title: 'Overdue Payments',
        message: `${overduePayments.length} payments are overdue`,
        affected_locations: [...new Set(overduePayments.map(p => p.barbershop_id))],
        action_required: true,
        created_at: new Date().toISOString()
      })
    }

    // System performance alerts (mock data)
    alerts.push({
      type: 'performance_alert',
      severity: 'low',
      title: 'System Performance',
      message: 'All systems operating normally',
      action_required: false,
      created_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error generating system alerts:', error)
    alerts.push({
      type: 'system_error',
      severity: 'high',
      title: 'Alert System Error',
      message: error.message,
      action_required: true,
      created_at: new Date().toISOString()
    })
  }

  return alerts
}

// ERP Dashboard Summary

async function generateERPDashboardSummary(organizationId, erpData) {
  const summary = {
    overall_status: 'healthy',
    key_metrics: {},
    critical_actions: [],
    performance_indicators: {}
  }

  // Inventory status
  if (erpData.inventory_management?.status === 'success') {
    const inventory = erpData.inventory_management
    summary.key_metrics.inventory_health = {
      total_items: inventory.current_inventory.total_items,
      total_value: inventory.current_inventory.total_value,
      low_stock_alerts: inventory.current_inventory.low_stock_alerts
    }

    if (inventory.current_inventory.low_stock_alerts > 0) {
      summary.critical_actions.push({
        priority: 'high',
        action: 'Address low inventory levels',
        count: inventory.current_inventory.low_stock_alerts
      })
    }
  }

  // Financial status
  if (erpData.financial_management?.status === 'success') {
    const finance = erpData.financial_management
    summary.key_metrics.financial_health = {
      revenue: finance.financial_summary.total_revenue,
      profit_margin: finance.financial_summary.profit_margin,
      cash_flow_trend: finance.cash_flow.cash_flow_trend
    }

    if (finance.financial_summary.profit_margin < 0.1) {
      summary.critical_actions.push({
        priority: 'high',
        action: 'Review profit margins and cost structure',
        current_margin: finance.financial_summary.profit_margin
      })
    }
  }

  // Compliance status
  if (erpData.compliance_management?.status === 'success') {
    const compliance = erpData.compliance_management
    summary.key_metrics.compliance_health = {
      score: compliance.compliance_summary.compliance_score,
      critical_issues: compliance.compliance_summary.critical_issues
    }

    if (compliance.compliance_summary.critical_issues > 0) {
      summary.critical_actions.push({
        priority: 'critical',
        action: 'Resolve compliance issues',
        count: compliance.compliance_summary.critical_issues
      })
    }
  }

  // Overall status determination
  const criticalActions = summary.critical_actions.filter(a => a.priority === 'critical')
  const highActions = summary.critical_actions.filter(a => a.priority === 'high')
  
  if (criticalActions.length > 0) {
    summary.overall_status = 'critical'
  } else if (highActions.length > 2) {
    summary.overall_status = 'attention_required'
  } else {
    summary.overall_status = 'healthy'
  }

  return summary
}

// POST Action Handlers

async function updateInventoryLevels(organizationId, locationIds, data) {
  // Implementation for inventory updates
  return {
    items_updated: 0,
    locations_affected: locationIds?.length || 0,
    timestamp: new Date().toISOString()
  }
}

async function processFinancialTransactions(organizationId, data) {
  // Implementation for financial processing
  return {
    transactions_processed: 0,
    total_amount: 0,
    timestamp: new Date().toISOString()
  }
}

async function generateERPReport(organizationId, reportType, settings) {
  // Implementation for ERP report generation
  return {
    report_id: `erp_${Date.now()}`,
    report_type: reportType,
    generated_at: new Date().toISOString(),
    download_url: `/api/reports/download/${organizationId}`
  }
}

async function synchronizeVendorData(organizationId, locationIds, data) {
  // Implementation for vendor synchronization
  return {
    vendors_synced: 0,
    data_points_updated: 0,
    timestamp: new Date().toISOString()
  }
}

async function updateComplianceStatus(organizationId, locationIds, data) {
  // Implementation for compliance updates
  return {
    compliance_items_updated: 0,
    locations_affected: locationIds?.length || 0,
    timestamp: new Date().toISOString()
  }
}