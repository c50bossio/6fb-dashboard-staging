import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/pos/cross-sell-suggestions
 * Real-time cross-selling suggestions for POS checkout
 * 
 * Query Parameters:
 * - barbershopId: UUID of the barbershop
 * - currentItems: JSON array of current cart items
 * - serviceId: UUID of the current service (optional)
 * - customerId: UUID of the customer (optional)
 * - sessionId: POS session identifier
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId')
    const currentItemsParam = searchParams.get('currentItems')
    const serviceId = searchParams.get('serviceId')
    const customerId = searchParams.get('customerId')
    const sessionId = searchParams.get('sessionId')

    if (!barbershopId) {
      return NextResponse.json(
        { error: 'barbershopId is required' },
        { status: 400 }
      )
    }

    // Parse current items
    let currentItems = []
    try {
      currentItems = currentItemsParam ? JSON.parse(currentItemsParam) : []
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid currentItems JSON format' },
        { status: 400 }
      )
    }

    // Get product affinities for current items
    let productSuggestions = []
    
    if (currentItems.length > 0) {
      const productIds = currentItems
        .filter(item => item.type === 'product')
        .map(item => item.id)

      if (productIds.length > 0) {
        // Get product affinities
        const { data: affinities } = await supabase
          .from('product_affinities')
          .select(`
            product_b_id,
            affinity_score,
            confidence_level,
            products:product_b_id (
              id,
              name,
              price,
              description,
              image_url,
              category
            )
          `)
          .eq('barbershop_id', barbershopId)
          .in('product_a_id', productIds)
          .gte('affinity_score', 0.3)
          .gte('confidence_level', 70)
          .order('affinity_score', { ascending: false })
          .limit(5)

        productSuggestions = affinities?.map(affinity => ({
          type: 'product_affinity',
          product: affinity.products,
          score: affinity.affinity_score,
          confidence: affinity.confidence_level,
          reasoning: `Customers who bought ${currentItems.find(item => item.id === affinity.product_a_id)?.name || 'this item'} also frequently purchase this`,
          anchor_product_id: productIds[0] // Simplified - use first product as anchor
        })) || []
      }
    }

    // Get service-based suggestions if service is provided
    let serviceSuggestions = []
    if (serviceId) {
      const { data: serviceAffinities } = await supabase
        .from('service_product_affinities')
        .select(`
          product_id,
          affinity_score,
          purchase_frequency,
          average_purchase_value,
          products:product_id (
            id,
            name,
            price,
            description,
            image_url,
            category
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('service_id', serviceId)
        .gte('affinity_score', 0.25)
        .gte('purchase_frequency', 0.15) // At least 15% of customers buy this
        .order('affinity_score', { ascending: false })
        .limit(3)

      serviceSuggestions = serviceAffinities?.map(affinity => ({
        type: 'service_upsell',
        product: affinity.products,
        score: affinity.affinity_score,
        confidence: Math.round(affinity.purchase_frequency * 100),
        reasoning: `${Math.round(affinity.purchase_frequency * 100)}% of customers getting this service also purchase this product`,
        average_value: affinity.average_purchase_value,
        anchor_service_id: serviceId
      })) || []
    }

    // Get customer-specific suggestions if customer is provided
    let customerSuggestions = []
    if (customerId) {
      // Get customer purchase patterns
      const { data: customerPatterns } = await supabase
        .from('customer_purchase_patterns')
        .select(`
          product_id,
          purchase_frequency,
          cross_sell_receptivity,
          preferred_price_range,
          products:product_id (
            id,
            name,
            price,
            description,
            image_url,
            category
          )
        `)
        .eq('customer_id', customerId)
        .eq('barbershop_id', barbershopId)
        .gte('cross_sell_receptivity', 0.4)
        .order('purchase_frequency', { ascending: false })
        .limit(3)

      customerSuggestions = customerPatterns?.map(pattern => ({
        type: 'customer_preference',
        product: pattern.products,
        score: pattern.cross_sell_receptivity,
        confidence: Math.min(95, pattern.purchase_frequency * 20 + 60), // Scale frequency to confidence
        reasoning: `Based on your purchase history, you might like this`,
        purchase_frequency: pattern.purchase_frequency,
        price_match: pattern.preferred_price_range && 
          pattern.products.price >= pattern.preferred_price_range[0] && 
          pattern.products.price <= pattern.preferred_price_range[1]
      })) || []
    }

    // Combine all suggestions and remove duplicates
    const allSuggestions = [...productSuggestions, ...serviceSuggestions, ...customerSuggestions]
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.product.id === suggestion.product.id)
    )

    // Sort by score and limit to top 5
    const topSuggestions = uniqueSuggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((suggestion, index) => ({
        ...suggestion,
        rank: index + 1,
        suggestion_id: `${barbershopId}-${Date.now()}-${index}`
      }))

    // Store suggestions in queue for analytics tracking
    if (sessionId && topSuggestions.length > 0) {
      await supabase
        .from('cross_sell_queue')
        .insert({
          barbershop_id: barbershopId,
          session_id: sessionId,
          customer_id: customerId,
          current_cart_items: currentItems,
          suggested_products: topSuggestions,
          context_data: {
            service_id: serviceId,
            timestamp: new Date().toISOString(),
            suggestion_count: topSuggestions.length
          }
        })
    }

    return NextResponse.json({
      success: true,
      suggestions: topSuggestions,
      metadata: {
        total_suggestions: topSuggestions.length,
        barbershop_id: barbershopId,
        session_id: sessionId,
        generated_at: new Date().toISOString(),
        suggestion_types: {
          product_affinity: productSuggestions.length,
          service_upsell: serviceSuggestions.length,
          customer_preference: customerSuggestions.length
        }
      }
    })

  } catch (error) {
    console.error('Cross-sell suggestions error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate cross-sell suggestions',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pos/cross-sell-suggestions
 * Track user interaction with cross-sell suggestions
 * 
 * Body:
 * {
 *   barbershopId: string,
 *   sessionId: string,
 *   suggestionId: string,
 *   action: 'accepted' | 'declined' | 'ignored' | 'viewed' | 'dismissed',
 *   productId: string,
 *   anchorProductId?: string,
 *   anchorServiceId?: string,
 *   customerId?: string,
 *   revenueImpact?: number,
 *   responseTimeSeconds?: number
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      barbershopId,
      sessionId,
      suggestionId,
      action,
      productId,
      anchorProductId,
      anchorServiceId,
      customerId,
      revenueImpact = 0,
      responseTimeSeconds
    } = body

    // Validate required fields
    if (!barbershopId || !suggestionId || !action || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields: barbershopId, suggestionId, action, productId' },
        { status: 400 }
      )
    }

    // Validate action type
    const validActions = ['accepted', 'declined', 'ignored', 'viewed', 'dismissed']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Get suggestion rank from queue if available
    let suggestionRank = 1
    let confidenceScore = null

    if (sessionId) {
      const { data: queueData } = await supabase
        .from('cross_sell_queue')
        .select('suggested_products')
        .eq('session_id', sessionId)
        .eq('barbershop_id', barbershopId)
        .single()

      if (queueData?.suggested_products) {
        const suggestion = queueData.suggested_products.find(s => s.suggestion_id === suggestionId)
        if (suggestion) {
          suggestionRank = suggestion.rank
          confidenceScore = suggestion.score
        }
      }
    }

    // Record the analytics event
    const { data, error } = await supabase
      .from('cross_sell_analytics')
      .insert({
        barbershop_id: barbershopId,
        suggested_product_id: productId,
        anchor_product_id: anchorProductId,
        customer_id: customerId,
        customer_action: action,
        revenue_impact: revenueImpact,
        suggestion_context: {
          session_id: sessionId,
          suggestion_id: suggestionId,
          anchor_service_id: anchorServiceId,
          timestamp: new Date().toISOString()
        },
        confidence_score: confidenceScore,
        suggestion_rank: suggestionRank,
        response_time_seconds: responseTimeSeconds
      })
      .select()

    if (error) {
      console.error('Failed to record cross-sell analytics:', error)
      return NextResponse.json(
        { error: 'Failed to record analytics' },
        { status: 500 }
      )
    }

    // Update campaign performance if this was part of a campaign
    if (action === 'accepted') {
      // This is a simple implementation - in a real system you'd track which campaign generated the suggestion
      await supabase.rpc('increment_campaign_stats', {
        barbershop_id: barbershopId,
        revenue_to_add: revenueImpact
      })
    }

    return NextResponse.json({
      success: true,
      analytics_id: data[0].id,
      message: `Cross-sell ${action} recorded successfully`
    })

  } catch (error) {
    console.error('Cross-sell tracking error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to track cross-sell interaction',
        details: error.message 
      },
      { status: 500 }
    )
  }
}