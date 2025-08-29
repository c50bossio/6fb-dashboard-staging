import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/inventory/alerts
 * Get smart inventory alerts for a barbershop
 * 
 * Query Parameters:
 * - shopId: UUID of the barbershop
 * - alertType: Filter by type (low_stock, reorder_needed, overstock, etc.)
 * - severity: Filter by severity (low, medium, high, critical)
 * - status: Filter by status (active, acknowledged, resolved, dismissed)
 * - limit: Number of alerts to return (default: 50)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const alertType = searchParams.get('alertType')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status') || 'active'
    const limit = parseInt(searchParams.get('limit')) || 50

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      )
    }

    // Build alerts query
    let query = supabase
      .from('inventory_alerts')
      .select(`
        id,
        product_id,
        alert_type,
        severity,
        title,
        message,
        current_value,
        threshold_value,
        recommended_action,
        status,
        priority_score,
        triggered_at,
        acknowledged_at,
        resolved_at,
        dismissed_at,
        products:product_id (
          id,
          name,
          category,
          description,
          current_stock,
          cost_price,
          price,
          image_url
        )
      `)
      .eq('shop_id', shopId)

    if (alertType) {
      query = query.eq('alert_type', alertType)
    }

    if (severity) {
      query = query.eq('severity', severity)
    }

    query = query
      .eq('status', status)
      .order('priority_score', { ascending: false })
      .order('triggered_at', { ascending: false })
      .limit(limit)

    const { data: alerts, error } = await query

    if (error) {
      console.error('Inventory alerts query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      )
    }

    // Process alerts to add additional insights
    const processedAlerts = alerts?.map(alert => {
      const timeSinceTriggered = Date.now() - new Date(alert.triggered_at).getTime()
      const hoursSinceTriggered = Math.floor(timeSinceTriggered / (1000 * 60 * 60))

      // Calculate age-based urgency boost
      let ageUrgencyBoost = 0
      if (alert.severity === 'critical' && hoursSinceTriggered > 24) {
        ageUrgencyBoost = 20
      } else if (alert.severity === 'high' && hoursSinceTriggered > 48) {
        ageUrgencyBoost = 10
      }

      return {
        ...alert,
        insights: {
          hours_since_triggered: hoursSinceTriggered,
          age_category: hoursSinceTriggered < 24 ? 'new' : 
                      hoursSinceTriggered < 72 ? 'recent' : 'old',
          effective_priority: alert.priority_score + ageUrgencyBoost,
          needs_immediate_attention: alert.severity === 'critical' && hoursSinceTriggered < 6,
          estimated_impact: calculateAlertImpact(alert),
          auto_resolvable: checkAutoResolvable(alert)
        }
      }
    }) || []

    // Calculate summary statistics
    const summary = {
      total_alerts: processedAlerts.length,
      by_severity: {
        critical: processedAlerts.filter(a => a.severity === 'critical').length,
        high: processedAlerts.filter(a => a.severity === 'high').length,
        medium: processedAlerts.filter(a => a.severity === 'medium').length,
        low: processedAlerts.filter(a => a.severity === 'low').length
      },
      by_type: processedAlerts.reduce((acc, alert) => {
        acc[alert.alert_type] = (acc[alert.alert_type] || 0) + 1
        return acc
      }, {}),
      immediate_attention_needed: processedAlerts.filter(a => a.insights.needs_immediate_attention).length,
      auto_resolvable: processedAlerts.filter(a => a.insights.auto_resolvable).length,
      categories_affected: [...new Set(processedAlerts.map(a => a.products?.category).filter(Boolean))]
    }

    return NextResponse.json({
      success: true,
      alerts: processedAlerts,
      summary,
      filters: {
        shop_id: shopId,
        alert_type: alertType || 'all',
        severity: severity || 'all',
        status,
        limit
      }
    })

  } catch (error) {
    console.error('Inventory alerts error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch inventory alerts',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory/alerts
 * Create new alerts or update existing ones
 * 
 * Body:
 * {
 *   action: 'create' | 'acknowledge' | 'resolve' | 'dismiss' | 'generate',
 *   alertIds?: string[], // For acknowledge/resolve/dismiss actions
 *   shopId: string, // For create/generate actions
 *   alertData?: object // For create action
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, alertIds, shopId, alertData } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'acknowledge':
        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { error: 'alertIds array is required for acknowledge action' },
            { status: 400 }
          )
        }

        const { data: acknowledgedAlerts, error: ackError } = await supabase
          .from('inventory_alerts')
          .update({
            status: 'acknowledged',
            acknowledged_at: new Date().toISOString()
          })
          .in('id', alertIds)
          .eq('status', 'active')
          .select('id, alert_type, severity')

        if (ackError) {
          return NextResponse.json(
            { error: 'Failed to acknowledge alerts' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${acknowledgedAlerts.length} alerts acknowledged`,
          acknowledged_alerts: acknowledgedAlerts
        })

      case 'resolve':
        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { error: 'alertIds array is required for resolve action' },
            { status: 400 }
          )
        }

        const { data: resolvedAlerts, error: resolveError } = await supabase
          .from('inventory_alerts')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString()
          })
          .in('id', alertIds)
          .in('status', ['active', 'acknowledged'])
          .select('id, alert_type, severity')

        if (resolveError) {
          return NextResponse.json(
            { error: 'Failed to resolve alerts' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${resolvedAlerts.length} alerts resolved`,
          resolved_alerts: resolvedAlerts
        })

      case 'dismiss':
        if (!alertIds || !Array.isArray(alertIds)) {
          return NextResponse.json(
            { error: 'alertIds array is required for dismiss action' },
            { status: 400 }
          )
        }

        const { data: dismissedAlerts, error: dismissError } = await supabase
          .from('inventory_alerts')
          .update({
            status: 'dismissed',
            dismissed_at: new Date().toISOString()
          })
          .in('id', alertIds)
          .in('status', ['active', 'acknowledged'])
          .select('id, alert_type, severity')

        if (dismissError) {
          return NextResponse.json(
            { error: 'Failed to dismiss alerts' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${dismissedAlerts.length} alerts dismissed`,
          dismissed_alerts: dismissedAlerts
        })

      case 'create':
        if (!shopId || !alertData) {
          return NextResponse.json(
            { error: 'shopId and alertData are required for create action' },
            { status: 400 }
          )
        }

        const newAlert = {
          shop_id: shopId,
          product_id: alertData.product_id,
          alert_type: alertData.alert_type,
          severity: alertData.severity || 'medium',
          title: alertData.title,
          message: alertData.message,
          current_value: alertData.current_value,
          threshold_value: alertData.threshold_value,
          recommended_action: alertData.recommended_action,
          priority_score: alertData.priority_score || 50,
          status: 'active'
        }

        const { data: createdAlert, error: createError } = await supabase
          .from('inventory_alerts')
          .insert(newAlert)
          .select('id, alert_type, severity, title')

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create alert' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'Alert created successfully',
          created_alert: createdAlert[0]
        })

      case 'generate':
        if (!shopId) {
          return NextResponse.json(
            { error: 'shopId is required for generate action' },
            { status: 400 }
          )
        }

        const generatedAlerts = await generateInventoryAlerts(shopId)

        return NextResponse.json({
          success: true,
          message: `Generated ${generatedAlerts.length} new alerts`,
          generated_alerts: generatedAlerts
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Inventory alerts action error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process inventory alert action',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to calculate alert impact
 */
function calculateAlertImpact(alert) {
  const baseImpact = {
    low_stock: { financial: 100, operational: 70 },
    reorder_needed: { financial: 200, operational: 80 },
    overstock: { financial: 50, operational: 30 },
    dead_stock: { financial: 300, operational: 10 },
    price_opportunity: { financial: 150, operational: 20 },
    seasonal_prep: { financial: 100, operational: 60 },
    expiry_warning: { financial: 400, operational: 90 }
  }

  const impact = baseImpact[alert.alert_type] || { financial: 50, operational: 50 }
  
  // Adjust based on severity
  const severityMultiplier = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    critical: 2.0
  }

  const multiplier = severityMultiplier[alert.severity] || 1.0

  return {
    financial_impact: Math.round(impact.financial * multiplier),
    operational_impact: Math.round(impact.operational * multiplier),
    overall_score: Math.round((impact.financial + impact.operational) * multiplier / 2)
  }
}

/**
 * Helper function to check if alert can be auto-resolved
 */
function checkAutoResolvable(alert) {
  // Simple rules for auto-resolution
  if (alert.alert_type === 'low_stock' && alert.products?.current_stock > alert.threshold_value) {
    return true
  }
  
  if (alert.alert_type === 'overstock' && alert.products?.current_stock <= alert.threshold_value) {
    return true
  }

  return false
}

/**
 * Helper function to generate alerts based on current inventory status
 */
async function generateInventoryAlerts(shopId) {
  const alerts = []

  // Get current inventory levels
  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, current_stock, min_stock_level, max_stock_level, cost_price, price')
    .eq('shop_id', shopId)
    .eq('is_active', true)

  if (!products) return alerts

  // Check for low stock alerts
  for (const product of products) {
    const minStock = product.min_stock_level || 5
    const maxStock = product.max_stock_level || 100

    // Low stock alert
    if (product.current_stock <= minStock) {
      const severity = product.current_stock === 0 ? 'critical' : 
                     product.current_stock <= minStock * 0.5 ? 'high' : 'medium'

      alerts.push({
        shop_id: shopId,
        product_id: product.id,
        alert_type: 'low_stock',
        severity,
        title: `Low Stock: ${product.name}`,
        message: `Only ${product.current_stock} units remaining. Minimum stock level is ${minStock}.`,
        current_value: product.current_stock,
        threshold_value: minStock,
        recommended_action: {
          action: 'reorder',
          suggested_quantity: minStock * 2,
          urgency: severity
        },
        priority_score: severity === 'critical' ? 90 : 
                       severity === 'high' ? 70 : 50
      })
    }

    // Overstock alert
    if (product.current_stock >= maxStock * 1.5) {
      alerts.push({
        shop_id: shopId,
        product_id: product.id,
        alert_type: 'overstock',
        severity: 'medium',
        title: `Overstock: ${product.name}`,
        message: `Current stock (${product.current_stock}) is significantly above maximum level (${maxStock}).`,
        current_value: product.current_stock,
        threshold_value: maxStock,
        recommended_action: {
          action: 'reduce_ordering',
          excess_units: product.current_stock - maxStock,
          holding_cost_impact: (product.current_stock - maxStock) * product.cost_price * 0.25
        },
        priority_score: 40
      })
    }
  }

  // Insert alerts into database
  if (alerts.length > 0) {
    const { data: insertedAlerts, error } = await supabase
      .from('inventory_alerts')
      .insert(alerts)
      .select('id, alert_type, severity, title')

    if (!error) {
      return insertedAlerts
    }
  }

  return []
}