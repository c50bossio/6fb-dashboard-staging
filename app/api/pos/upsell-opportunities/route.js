import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/pos/upsell-opportunities
 * Revenue optimization suggestions for POS transactions
 * 
 * Query Parameters:
 * - shopId: UUID of the barbershop
 * - customerId: UUID of the customer
 * - serviceId: UUID of the current service
 * - currentTotal: Current transaction total
 * - sessionId: POS session identifier (optional)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const shopId = searchParams.get('shopId')
    const customerId = searchParams.get('customerId')
    const serviceId = searchParams.get('serviceId')
    const currentTotal = parseFloat(searchParams.get('currentTotal')) || 0
    const sessionId = searchParams.get('sessionId')

    if (!shopId) {
      return NextResponse.json(
        { error: 'shopId is required' },
        { status: 400 }
      )
    }

    const opportunities = []

    // 1. Service Upgrade Opportunities
    if (serviceId) {
      // Get current service details
      const { data: currentService } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes, category')
        .eq('id', serviceId)
        .single()

      if (currentService) {
        // Find premium services in the same category
        const { data: upgradeServices } = await supabase
          .from('services')
          .select('*')
          .eq('shop_id', shopId)
          .eq('category', currentService.category)
          .gt('price', currentService.price)
          .eq('is_active', true)
          .order('price', { ascending: true })
          .limit(3)

        upgradeServices?.forEach(service => {
          const additionalRevenue = service.price - currentService.price
          opportunities.push({
            type: 'service_upgrade',
            item: service,
            current_item: currentService,
            additional_revenue: additionalRevenue,
            percentage_increase: ((additionalRevenue / currentService.price) * 100).toFixed(1),
            confidence_score: 0.65, // Medium confidence for service upgrades
            reasoning: `Upgrade to ${service.name} for enhanced experience`,
            category: 'Service Enhancement',
            priority: additionalRevenue > 20 ? 'high' : 'medium'
          })
        })
      }
    }

    // 2. Product Bundle Opportunities
    if (serviceId) {
      // Get service-specific product recommendations
      const { data: serviceProducts } = await supabase
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
        .eq('shop_id', shopId)
        .eq('service_id', serviceId)
        .gte('purchase_frequency', 0.2) // At least 20% adoption rate
        .eq('products.is_active', true)
        .order('purchase_frequency', { ascending: false })
        .limit(5)

      serviceProducts?.forEach((sp, index) => {
        const bundleDiscount = index === 0 ? 0.1 : 0.05 // 10% discount for top product, 5% for others
        const discountedPrice = sp.products.price * (1 - bundleDiscount)
        
        opportunities.push({
          type: 'product_bundle',
          item: {
            ...sp.products,
            bundle_price: discountedPrice,
            original_price: sp.products.price,
            discount_percent: (bundleDiscount * 100).toFixed(0)
          },
          additional_revenue: discountedPrice,
          bundle_savings: sp.products.price - discountedPrice,
          confidence_score: sp.affinity_score,
          reasoning: `${Math.round(sp.purchase_frequency * 100)}% of customers with this service purchase this product`,
          category: 'Product Bundle',
          priority: sp.purchase_frequency > 0.4 ? 'high' : 'medium',
          adoption_rate: sp.purchase_frequency
        })
      })
    }

    // 3. Customer History-Based Opportunities
    if (customerId) {
      // Get customer's purchase patterns and preferences
      const { data: customerPatterns } = await supabase
        .from('customer_purchase_patterns')
        .select(`
          product_id,
          purchase_frequency,
          preferred_price_range,
          cross_sell_receptivity,
          last_purchase_date,
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
        .eq('shop_id', shopId)
        .gte('cross_sell_receptivity', 0.5)
        .order('purchase_frequency', { ascending: false })
        .limit(3)

      customerPatterns?.forEach(pattern => {
        // Check if product is within customer's preferred price range
        const priceMatch = !pattern.preferred_price_range || 
          (pattern.products.price >= pattern.preferred_price_range[0] && 
           pattern.products.price <= pattern.preferred_price_range[1])

        if (priceMatch) {
          opportunities.push({
            type: 'customer_preference',
            item: pattern.products,
            additional_revenue: pattern.products.price,
            confidence_score: pattern.cross_sell_receptivity,
            reasoning: `Based on your purchase history (${pattern.purchase_frequency} previous purchases)`,
            category: 'Personal Recommendation',
            priority: pattern.purchase_frequency > 2 ? 'high' : 'medium',
            last_purchased: pattern.last_purchase_date,
            price_match: priceMatch
          })
        }
      })
    }

    // 4. Seasonal and Promotional Opportunities
    const currentMonth = new Date().getMonth() + 1
    const seasonalProducts = await getSeasonalProducts(shopId, currentMonth)
    
    seasonalProducts.forEach(product => {
      opportunities.push({
        type: 'seasonal_promotion',
        item: product,
        additional_revenue: product.promotional_price || product.price,
        discount_percent: product.promotional_price ? 
          Math.round(((product.price - product.promotional_price) / product.price) * 100) : 0,
        confidence_score: 0.7,
        reasoning: product.seasonal_reason || 'Popular this time of year',
        category: 'Seasonal Special',
        priority: 'medium'
      })
    })

    // 5. High-Margin Product Opportunities
    const { data: highMarginProducts } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .gte('price', currentTotal * 0.3) // At least 30% of current total
      .lte('price', currentTotal * 1.5) // Not more than 150% of current total
      .order('price', { ascending: false })
      .limit(3)

    highMarginProducts?.forEach(product => {
      // Assume 60% margin for high-end products
      const estimatedMargin = product.price * 0.6
      opportunities.push({
        type: 'high_margin',
        item: product,
        additional_revenue: product.price,
        estimated_margin: estimatedMargin,
        margin_percentage: 60,
        confidence_score: 0.55,
        reasoning: 'Premium product with excellent margins',
        category: 'Premium Upsell',
        priority: estimatedMargin > 30 ? 'high' : 'medium'
      })
    })

    // Sort opportunities by potential revenue and confidence
    const rankedOpportunities = opportunities
      .sort((a, b) => {
        const scoreA = (a.additional_revenue * a.confidence_score) + (a.priority === 'high' ? 10 : 0)
        const scoreB = (b.additional_revenue * b.confidence_score) + (b.priority === 'high' ? 10 : 0)
        return scoreB - scoreA
      })
      .slice(0, 8) // Limit to top 8 opportunities
      .map((opp, index) => ({
        ...opp,
        rank: index + 1,
        opportunity_id: `${shopId}-${Date.now()}-${index}`,
        roi_score: (opp.additional_revenue * opp.confidence_score).toFixed(2)
      }))

    // Calculate summary statistics
    const summary = {
      total_opportunities: rankedOpportunities.length,
      potential_additional_revenue: rankedOpportunities.reduce((sum, opp) => sum + opp.additional_revenue, 0),
      average_confidence: rankedOpportunities.length > 0 
        ? (rankedOpportunities.reduce((sum, opp) => sum + opp.confidence_score, 0) / rankedOpportunities.length).toFixed(3)
        : 0,
      high_priority_count: rankedOpportunities.filter(opp => opp.priority === 'high').length,
      categories: [...new Set(rankedOpportunities.map(opp => opp.category))],
      revenue_potential_by_type: rankedOpportunities.reduce((acc, opp) => {
        acc[opp.type] = (acc[opp.type] || 0) + opp.additional_revenue
        return acc
      }, {})
    }

    return NextResponse.json({
      success: true,
      opportunities: rankedOpportunities,
      summary,
      context: {
        shop_id: shopId,
        customer_id: customerId,
        service_id: serviceId,
        current_total: currentTotal,
        session_id: sessionId,
        generated_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Upsell opportunities error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate upsell opportunities',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * Helper function to get seasonal products
 */
async function getSeasonalProducts(shopId, month) {
  // Mock seasonal logic - in production this would be more sophisticated
  const seasonalCategories = {
    12: ['Holiday Specials', 'Winter Care'], // December
    1: ['New Year Refresh', 'Winter Care'], // January
    2: ['Valentine\'s Special', 'Winter Care'], // February
    3: ['Spring Renewal'], // March
    4: ['Spring Renewal', 'Easter Specials'], // April
    5: ['Mother\'s Day', 'Spring Renewal'], // May
    6: ['Father\'s Day', 'Summer Prep'], // June
    7: ['Summer Care'], // July
    8: ['Summer Care', 'Back to School'], // August
    9: ['Back to School', 'Fall Prep'], // September
    10: ['Fall Care', 'Halloween'], // October
    11: ['Fall Care', 'Holiday Prep'] // November
  }

  const currentSeasons = seasonalCategories[month] || []
  
  // Mock seasonal products - in production this would query actual seasonal inventory
  return [
    {
      id: 'seasonal-1',
      name: 'Seasonal Hair Pomade',
      price: 25.99,
      promotional_price: 19.99,
      category: currentSeasons[0],
      seasonal_reason: `Perfect for ${currentSeasons[0]} styling`
    }
  ].filter(product => currentSeasons.includes(product.category))
}

/**
 * POST /api/pos/upsell-opportunities
 * Track upsell opportunity interactions and outcomes
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      shopId,
      opportunityId,
      opportunityType,
      action,
      itemId,
      revenueImpact,
      customerId,
      serviceId,
      sessionId
    } = body

    // Validate required fields
    if (!shopId || !opportunityId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Record the interaction in cross_sell_analytics table
    const { data, error } = await supabase
      .from('cross_sell_analytics')
      .insert({
        shop_id: shopId,
        suggested_product_id: itemId,
        customer_id: customerId,
        customer_action: action,
        revenue_impact: revenueImpact || 0,
        suggestion_context: {
          opportunity_id: opportunityId,
          opportunity_type: opportunityType,
          session_id: sessionId,
          service_id: serviceId,
          timestamp: new Date().toISOString()
        },
        confidence_score: 0.65 // Default confidence for upsells
      })

    if (error) {
      console.error('Failed to record upsell tracking:', error)
      return NextResponse.json(
        { error: 'Failed to record interaction' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Upsell ${action} recorded successfully`
    })

  } catch (error) {
    console.error('Upsell tracking error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to track upsell interaction',
        details: error.message 
      },
      { status: 500 }
    )
  }
}