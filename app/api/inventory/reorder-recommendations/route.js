import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/inventory/reorder-recommendations
 * Get smart reorder recommendations for a barbershop
 * 
 * Query Parameters:
 * - barbershopId: UUID of the barbershop
 * - status: Filter by status (pending, approved, ordered, etc.)
 * - urgency: Filter by urgency (high, medium, low)
 * - limit: Number of recommendations to return (default: 20)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId')
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')
    const limit = parseInt(searchParams.get('limit')) || 20

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershopId is required' },
        { status: 400 }
      )
    }

    // Build query for reorder recommendations
    let query = supabase
      .from('inventory_reorder_recommendations')
      .select(`
        id,
        product_id,
        current_stock_level,
        reorder_point,
        recommended_order_quantity,
        safety_stock_level,
        predicted_stockout_date,
        recommended_order_date,
        expected_delivery_date,
        lead_time_days,
        carrying_cost_per_unit,
        stockout_cost_estimate,
        order_cost,
        total_cost_optimization,
        demand_variability,
        seasonality_impact,
        confidence_score,
        status,
        created_at,
        updated_at,
        products:product_id (
          id,
          name,
          category,
          description,
          current_stock,
          cost_price,
          price,
          image_url,
          supplier_info
        )
      `)
      .eq('barbershop_id', barbershopId)

    if (status) {
      query = query.eq('status', status)
    }

    // Apply urgency filter based on stockout date
    if (urgency) {
      const now = new Date()
      if (urgency === 'high') {
        // High urgency: stockout within 7 days
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        query = query.lte('predicted_stockout_date', sevenDaysFromNow.toISOString().split('T')[0])
      } else if (urgency === 'medium') {
        // Medium urgency: stockout within 8-21 days
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        const twentyOneDaysFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
        query = query
          .gt('predicted_stockout_date', sevenDaysFromNow.toISOString().split('T')[0])
          .lte('predicted_stockout_date', twentyOneDaysFromNow.toISOString().split('T')[0])
      } else if (urgency === 'low') {
        // Low urgency: stockout in more than 21 days
        const twentyOneDaysFromNow = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000)
        query = query.gt('predicted_stockout_date', twentyOneDaysFromNow.toISOString().split('T')[0])
      }
    }

    query = query
      .order('predicted_stockout_date', { ascending: true })
      .limit(limit)

    const { data: recommendations, error } = await query

    if (error) {
      console.error('Reorder recommendations query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: 500 }
      )
    }

    // Process recommendations to add insights and urgency levels
    const processedRecommendations = recommendations?.map(rec => {
      const stockoutDate = new Date(rec.predicted_stockout_date)
      const today = new Date()
      const daysUntilStockout = Math.ceil((stockoutDate - today) / (1000 * 60 * 60 * 24))
      
      // Determine urgency level
      let urgencyLevel = 'low'
      let urgencyColor = 'green'
      if (daysUntilStockout <= 0) {
        urgencyLevel = 'critical'
        urgencyColor = 'red'
      } else if (daysUntilStockout <= 7) {
        urgencyLevel = 'high'
        urgencyColor = 'orange'
      } else if (daysUntilStockout <= 21) {
        urgencyLevel = 'medium'
        urgencyColor = 'yellow'
      }

      // Calculate financial impact
      const orderValue = rec.recommended_order_quantity * rec.products.cost_price
      const potentialLostRevenue = rec.stockout_cost_estimate
      const savingsFromOptimalTiming = rec.total_cost_optimization || 0

      return {
        ...rec,
        insights: {
          days_until_stockout: daysUntilStockout,
          urgency_level: urgencyLevel,
          urgency_color: urgencyColor,
          order_value: orderValue,
          potential_lost_revenue: potentialLostRevenue,
          roi_of_ordering: potentialLostRevenue > 0 ? (potentialLostRevenue / orderValue).toFixed(2) : 0,
          inventory_turn_days: rec.recommended_order_quantity / Math.max(rec.products.current_stock / 30, 1),
          confidence_level: rec.confidence_score >= 0.8 ? 'High' : 
                          rec.confidence_score >= 0.6 ? 'Medium' : 'Low'
        }
      }
    }) || []

    // Calculate summary statistics
    const totalRecommendations = processedRecommendations.length
    const criticalCount = processedRecommendations.filter(r => r.insights.urgency_level === 'critical').length
    const highUrgencyCount = processedRecommendations.filter(r => r.insights.urgency_level === 'high').length
    const totalOrderValue = processedRecommendations.reduce((sum, r) => sum + r.insights.order_value, 0)
    const totalPotentialLoss = processedRecommendations.reduce((sum, r) => sum + r.insights.potential_lost_revenue, 0)

    const summary = {
      total_recommendations: totalRecommendations,
      critical_urgency: criticalCount,
      high_urgency: highUrgencyCount,
      medium_urgency: processedRecommendations.filter(r => r.insights.urgency_level === 'medium').length,
      low_urgency: processedRecommendations.filter(r => r.insights.urgency_level === 'low').length,
      total_order_value: totalOrderValue,
      total_potential_loss: totalPotentialLoss,
      average_confidence: totalRecommendations > 0 
        ? (processedRecommendations.reduce((sum, r) => sum + r.confidence_score, 0) / totalRecommendations).toFixed(3)
        : 0,
      categories_affected: [...new Set(processedRecommendations.map(r => r.products.category))].filter(Boolean)
    }

    return NextResponse.json({
      success: true,
      recommendations: processedRecommendations,
      summary,
      filters: {
        barbershop_id: barbershopId,
        status: status || 'all',
        urgency: urgency || 'all',
        limit
      }
    })

  } catch (error) {
    console.error('Reorder recommendations error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch reorder recommendations',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory/reorder-recommendations
 * Update status of reorder recommendations or create new ones
 * 
 * Body:
 * {
 *   action: 'approve' | 'order' | 'cancel' | 'generate',
 *   recommendationIds?: string[], // For approve/order/cancel actions
 *   barbershopId: string, // For generate action
 *   productIds?: string[] // For generate action
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, recommendationIds, barbershopId, productIds } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'approve':
        if (!recommendationIds || !Array.isArray(recommendationIds)) {
          return NextResponse.json(
            { error: 'recommendationIds array is required for approve action' },
            { status: 400 }
          )
        }

        const { data: approvedRecs, error: approveError } = await supabase
          .from('inventory_reorder_recommendations')
          .update({
            status: 'approved',
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', recommendationIds)
          .select('id, product_id, recommended_order_quantity')

        if (approveError) {
          return NextResponse.json(
            { error: 'Failed to approve recommendations' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${approvedRecs.length} recommendations approved`,
          approved_recommendations: approvedRecs
        })

      case 'order':
        if (!recommendationIds || !Array.isArray(recommendationIds)) {
          return NextResponse.json(
            { error: 'recommendationIds array is required for order action' },
            { status: 400 }
          )
        }

        // Get recommendation details
        const { data: orderRecs, error: fetchError } = await supabase
          .from('inventory_reorder_recommendations')
          .select(`
            id,
            barbershop_id,
            product_id,
            recommended_order_quantity,
            products:product_id (
              name,
              cost_price,
              supplier_info
            )
          `)
          .in('id', recommendationIds)
          .eq('status', 'approved')

        if (fetchError || !orderRecs.length) {
          return NextResponse.json(
            { error: 'No approved recommendations found' },
            { status: 400 }
          )
        }

        // Group by supplier for purchase orders
        const supplierGroups = {}
        orderRecs.forEach(rec => {
          const supplier = rec.products.supplier_info?.name || 'Unknown Supplier'
          if (!supplierGroups[supplier]) {
            supplierGroups[supplier] = []
          }
          supplierGroups[supplier].push({
            product_id: rec.product_id,
            product_name: rec.products.name,
            quantity: rec.recommended_order_quantity,
            unit_cost: rec.products.cost_price || 0,
            total_cost: (rec.recommended_order_quantity * (rec.products.cost_price || 0))
          })
        })

        // Create purchase orders
        const purchaseOrders = []
        for (const [supplierName, items] of Object.entries(supplierGroups)) {
          const totalAmount = items.reduce((sum, item) => sum + item.total_cost, 0)
          
          const { data: poData, error: poError } = await supabase
            .from('automated_purchase_orders')
            .insert({
              barbershop_id: orderRecs[0].barbershop_id,
              supplier_name: supplierName,
              order_date: new Date().toISOString().split('T')[0],
              expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              items: items,
              total_amount: totalAmount,
              status: 'pending_approval',
              requires_human_approval: totalAmount > 500 // Require approval for orders over $500
            })
            .select('id, po_number')

          if (!poError && poData[0]) {
            purchaseOrders.push(poData[0])
          }
        }

        // Update recommendations to 'ordered' status
        const { error: updateError } = await supabase
          .from('inventory_reorder_recommendations')
          .update({
            status: 'ordered',
            ordered_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .in('id', recommendationIds)

        if (updateError) {
          console.error('Failed to update recommendation status:', updateError)
        }

        return NextResponse.json({
          success: true,
          message: `${orderRecs.length} recommendations converted to orders`,
          purchase_orders: purchaseOrders,
          recommendations_updated: recommendationIds.length
        })

      case 'cancel':
        if (!recommendationIds || !Array.isArray(recommendationIds)) {
          return NextResponse.json(
            { error: 'recommendationIds array is required for cancel action' },
            { status: 400 }
          )
        }

        const { data: cancelledRecs, error: cancelError } = await supabase
          .from('inventory_reorder_recommendations')
          .update({
            status: 'cancelled',
            updated_at: new Date().toISOString()
          })
          .in('id', recommendationIds)
          .select('id')

        if (cancelError) {
          return NextResponse.json(
            { error: 'Failed to cancel recommendations' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `${cancelledRecs.length} recommendations cancelled`
        })

      case 'generate':
        if (!barbershopId) {
          return NextResponse.json(
            { error: 'barbershopId is required for generate action' },
            { status: 400 }
          )
        }

        // Call the forecasting endpoint to generate new recommendations
        const generateResponse = await fetch(`${request.url.split('/reorder-recommendations')[0]}/forecasting`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            barbershopId,
            forecastDays: 30,
            recalculateAll: true,
            productIds
          }),
        })

        const generateResult = await generateResponse.json()

        if (!generateResponse.ok) {
          return NextResponse.json(
            { error: 'Failed to generate recommendations', details: generateResult.error },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: 'New recommendations generated successfully',
          generation_results: generateResult.results
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Reorder recommendations action error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process reorder recommendation action',
        details: error.message 
      },
      { status: 500 }
    )
  }
}