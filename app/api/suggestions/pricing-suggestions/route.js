import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callBestAIProvider } from '@/lib/ai-providers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Market pricing data (enhanced with real data when available)
const marketPricingData = {
  barbershop: {
    'Haircut': {
      national_avg: 28,
      range: { min: 15, max: 60 },
      factors: ['location', 'experience', 'shop_quality']
    },
    'Beard Trim': {
      national_avg: 16,
      range: { min: 8, max: 30 },
      factors: ['service_complexity', 'tools_quality']
    },
    'Hot Towel Shave': {
      national_avg: 35,
      range: { min: 20, max: 75 },
      factors: ['luxury_level', 'time_invested', 'product_quality']
    },
    'Haircut + Beard': {
      national_avg: 40,
      range: { min: 25, max: 85 },
      factors: ['package_discount', 'total_time']
    }
  },
  salon: {
    'Cut & Style': {
      national_avg: 65,
      range: { min: 35, max: 150 },
      factors: ['stylist_experience', 'salon_reputation', 'location']
    },
    'Full Color': {
      national_avg: 120,
      range: { min: 60, max: 300 },
      factors: ['color_technique', 'product_brand', 'hair_length']
    },
    'Highlights': {
      national_avg: 140,
      range: { min: 80, max: 350 },
      factors: ['technique_complexity', 'foil_count', 'processing_time']
    },
    'Blowout': {
      national_avg: 35,
      range: { min: 20, max: 70 },
      factors: ['hair_length', 'style_complexity']
    }
  }
}

// Location-based pricing multipliers
const locationPricingMultipliers = {
  'new_york_ny': 1.8,
  'san_francisco_ca': 1.7,
  'los_angeles_ca': 1.4,
  'chicago_il': 1.2,
  'miami_fl': 1.3,
  'atlanta_ga': 1.0,
  'dallas_tx': 0.9,
  'phoenix_az': 0.85,
  'rural_areas': 0.7,
  'default': 1.0
}

export async function POST(request) {
  try {
    const { businessType, location, services, includeAIAnalysis = true } = await request.json()
    
    // Get base pricing data
    const pricingData = marketPricingData[businessType] || marketPricingData.barbershop
    
    // Determine location multiplier
    const locationKey = normalizeLocation(location)
    const locationMultiplier = locationPricingMultipliers[locationKey] || locationPricingMultipliers.default
    
    // Generate pricing recommendations
    const pricingRecommendations = {}
    const insights = []
    const competitiveAnalysis = {}
    
    // Process each service or use default services
    const servicesToPrice = services?.length > 0 ? services : Object.keys(pricingData)
    
    servicesToPrice.forEach(serviceName => {
      const baseData = pricingData[serviceName]
      
      if (baseData) {
        const adjustedPrice = Math.round(baseData.national_avg * locationMultiplier)
        const adjustedMin = Math.round(baseData.range.min * locationMultiplier)
        const adjustedMax = Math.round(baseData.range.max * locationMultiplier)
        
        pricingRecommendations[serviceName] = {
          recommended: adjustedPrice,
          range: {
            min: adjustedMin,
            max: adjustedMax,
            competitive_low: Math.round(adjustedPrice * 0.85),
            competitive_high: Math.round(adjustedPrice * 1.15)
          },
          confidence: calculatePricingConfidence(baseData, locationMultiplier),
          factors: baseData.factors,
          market_position: determineMarketPosition(adjustedPrice, baseData.range, locationMultiplier)
        }
        
        // Generate competitive analysis
        competitiveAnalysis[serviceName] = generateCompetitiveAnalysis(
          serviceName, 
          adjustedPrice, 
          locationMultiplier,
          businessType
        )
      }
    })
    
    // Generate pricing insights
    const pricingInsights = generatePricingInsights(
      pricingRecommendations, 
      locationMultiplier, 
      businessType,
      location
    )
    
    // Calculate revenue projections
    const revenueProjections = calculateRevenueProjections(
      pricingRecommendations, 
      businessType,
      locationMultiplier
    )
    
    // Get real market data from our database
    let realMarketData = null
    if (location && location.lat && location.lng) {
      realMarketData = await getRealMarketData(location, businessType)
    }
    
    // AI-powered analysis if requested
    let aiAnalysis = null
    if (includeAIAnalysis && process.env.OPENAI_API_KEY) {
      aiAnalysis = await getAIPricingAnalysis({
        pricingRecommendations,
        competitiveAnalysis,
        realMarketData,
        location,
        businessType
      })
    }
    
    const response = {
      success: true,
      pricing: pricingRecommendations,
      insights: pricingInsights,
      competitive_analysis: competitiveAnalysis,
      revenue_projections: revenueProjections,
      real_market_data: realMarketData,
      ai_analysis: aiAnalysis,
      market_context: {
        location: location,
        location_multiplier: locationMultiplier,
        market_tier: getMarketTier(locationMultiplier),
        business_type: businessType
      },
      recommendations: {
        pricing_strategy: getPricingStrategy(locationMultiplier, businessType),
        launch_strategy: getLaunchStrategy(pricingRecommendations),
        optimization_tips: getOptimizationTips(pricingRecommendations, businessType)
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Pricing suggestions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function normalizeLocation(location) {
  if (!location) return 'default'
  
  const loc = location.toLowerCase().replace(/[^a-z]/g, '_')
  
  // Map common city patterns
  if (loc.includes('new_york') || loc.includes('manhattan') || loc.includes('nyc')) return 'new_york_ny'
  if (loc.includes('san_francisco') || loc.includes('sf')) return 'san_francisco_ca'
  if (loc.includes('los_angeles') || loc.includes('la')) return 'los_angeles_ca'
  if (loc.includes('chicago')) return 'chicago_il'
  if (loc.includes('miami')) return 'miami_fl'
  if (loc.includes('atlanta')) return 'atlanta_ga'
  if (loc.includes('dallas')) return 'dallas_tx'
  if (loc.includes('phoenix')) return 'phoenix_az'
  if (loc.includes('rural') || loc.includes('county') || loc.includes('small_town')) return 'rural_areas'
  
  return 'default'
}

function calculatePricingConfidence(baseData, locationMultiplier) {
  let confidence = 0.75 // Base confidence
  
  // Higher confidence for more common services
  if (baseData.national_avg > 20) confidence += 0.1
  
  // Adjust for location data quality
  if (locationMultiplier !== 1.0) confidence += 0.05 // We have location-specific data
  
  // Adjust for price range spread
  const rangeSpread = (baseData.range.max - baseData.range.min) / baseData.national_avg
  if (rangeSpread < 2) confidence += 0.1 // Narrow range = higher confidence
  
  return Math.min(confidence, 0.95)
}

function determineMarketPosition(price, baseRange, locationMultiplier) {
  const nationalAvg = (baseRange.min + baseRange.max) / 2
  const adjustedNationalAvg = nationalAvg * locationMultiplier
  
  if (price < adjustedNationalAvg * 0.9) return 'budget_friendly'
  if (price > adjustedNationalAvg * 1.1) return 'premium'
  return 'competitive'
}

function generateCompetitiveAnalysis(serviceName, price, locationMultiplier, businessType) {
  return {
    your_price: price,
    market_average: Math.round(price / locationMultiplier),
    position: determineMarketPosition(price, { min: price * 0.7, max: price * 1.4 }, 1),
    advantages: getCompetitiveAdvantages(serviceName, businessType),
    differentiation_opportunities: getDifferentiationOpportunities(serviceName, businessType)
  }
}

function getCompetitiveAdvantages(serviceName, businessType) {
  const advantages = {
    barbershop: {
      'Haircut': ['Personal attention', 'Consistent quality', 'Traditional techniques'],
      'Beard Trim': ['Precision tools', 'Experienced grooming', 'Quick service'],
      'Hot Towel Shave': ['Luxury experience', 'Premium products', 'Relaxation focused']
    },
    salon: {
      'Cut & Style': ['Latest trends', 'Professional styling', 'Complete makeover'],
      'Full Color': ['Color expertise', 'Quality products', 'Custom matching'],
      'Highlights': ['Advanced techniques', 'Natural results', 'Damage protection']
    }
  }
  
  return advantages[businessType]?.[serviceName] || ['Quality service', 'Professional results', 'Customer satisfaction']
}

function getDifferentiationOpportunities(serviceName, businessType) {
  const opportunities = {
    barbershop: [
      'Add premium product packages',
      'Offer membership/loyalty discounts',
      'Include complimentary services',
      'Provide consultation and advice'
    ],
    salon: [
      'Include styling consultation',
      'Offer take-home care products',
      'Provide follow-up touch-ups',
      'Add relaxation elements'
    ]
  }
  
  return opportunities[businessType] || opportunities.barbershop
}

function generatePricingInsights(pricingRecommendations, locationMultiplier, businessType, location) {
  const insights = []
  
  // Location-based insights
  if (locationMultiplier > 1.3) {
    insights.push({
      type: 'market_opportunity',
      title: 'Premium Market Location',
      message: `Your location supports premium pricing - ${Math.round((locationMultiplier - 1) * 100)}% above national average`,
      impact: 'high',
      actionable: true,
      recommendation: 'Focus on service quality and experience to justify premium pricing'
    })
  } else if (locationMultiplier < 0.9) {
    insights.push({
      type: 'competitive_strategy', 
      title: 'Value-Focused Market',
      message: 'This market is price-sensitive - focus on value and efficiency',
      impact: 'high',
      actionable: true,
      recommendation: 'Offer package deals and loyalty programs to increase average transaction value'
    })
  }
  
  // Service mix insights
  const serviceCount = Object.keys(pricingRecommendations).length
  if (serviceCount < 4) {
    insights.push({
      type: 'revenue_optimization',
      title: 'Service Expansion Opportunity',
      message: `Adding complementary services could increase revenue by 25-40%`,
      impact: 'medium',
      actionable: true,
      recommendation: 'Consider adding quick add-on services to increase average ticket'
    })
  }
  
  return insights
}

function calculateRevenueProjections(pricingRecommendations, businessType, locationMultiplier) {
  const serviceNames = Object.keys(pricingRecommendations)
  const avgServicePrice = serviceNames.reduce((sum, name) => 
    sum + pricingRecommendations[name].recommended, 0) / serviceNames.length
  
  // Industry benchmarks for appointments per day
  const dailyAppointmentsBenchmarks = {
    barbershop: 12,
    salon: 8,
    spa: 6
  }
  
  const avgDailyAppointments = dailyAppointmentsBenchmarks[businessType] || 10
  const workingDaysPerMonth = 25
  
  const projections = {
    daily: {
      appointments: avgDailyAppointments,
      revenue: Math.round(avgDailyAppointments * avgServicePrice)
    },
    monthly: {
      appointments: avgDailyAppointments * workingDaysPerMonth,
      revenue: Math.round(avgDailyAppointments * workingDaysPerMonth * avgServicePrice)
    },
    annual: {
      appointments: avgDailyAppointments * workingDaysPerMonth * 12,
      revenue: Math.round(avgDailyAppointments * workingDaysPerMonth * 12 * avgServicePrice)
    }
  }
  
  return {
    ...projections,
    assumptions: {
      avg_service_price: Math.round(avgServicePrice),
      daily_appointments: avgDailyAppointments,
      working_days_per_month: workingDaysPerMonth,
      location_factor: locationMultiplier
    },
    growth_scenarios: {
      conservative: Math.round(projections.annual.revenue * 0.8),
      realistic: projections.annual.revenue,
      optimistic: Math.round(projections.annual.revenue * 1.3)
    }
  }
}

function getPricingStrategy(locationMultiplier, businessType) {
  if (locationMultiplier > 1.3) {
    return {
      strategy: 'premium',
      description: 'Focus on high-quality service and premium experience',
      tactics: ['Emphasize expertise and results', 'Use premium products', 'Create luxurious atmosphere']
    }
  } else if (locationMultiplier < 0.9) {
    return {
      strategy: 'value',
      description: 'Compete on value while maintaining quality',
      tactics: ['Offer package deals', 'Implement loyalty programs', 'Focus on efficiency']
    }
  } else {
    return {
      strategy: 'competitive',
      description: 'Match market rates while differentiating on service',
      tactics: ['Highlight unique services', 'Build strong relationships', 'Consistent quality delivery']
    }
  }
}

function getLaunchStrategy(pricingRecommendations) {
  return {
    soft_launch: 'Start with competitive pricing to build client base',
    promotional_pricing: 'Offer 15-20% discount for first month',
    package_deals: 'Create bundles to increase average transaction',
    loyalty_program: 'Reward repeat customers with points or discounts'
  }
}

function getOptimizationTips(pricingRecommendations, businessType) {
  return [
    'Monitor competitor pricing monthly',
    'Test price increases on 10% of services first',
    'Bundle complementary services for higher value',
    'Implement dynamic pricing for peak/off-peak hours',
    'Track customer price sensitivity by service',
    'Offer premium versions of popular services'
  ]
}

function getMarketTier(locationMultiplier) {
  if (locationMultiplier >= 1.5) return 'luxury'
  if (locationMultiplier >= 1.2) return 'premium'
  if (locationMultiplier >= 0.9) return 'mainstream'
  return 'value'
}

/**
 * Get real market data from our database
 */
async function getRealMarketData(location, businessType) {
  try {
    // Get nearby barbershops from our database
    const { data: nearbyShops, error: shopsError } = await supabase
      .from('barbershops')
      .select('id, name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    
    if (shopsError) throw shopsError
    
    // Filter shops within 25km radius
    const radiusKm = 25
    const nearbyShopIds = nearbyShops
      .filter(shop => {
        const distance = calculateDistance(
          location.lat,
          location.lng,
          shop.latitude,
          shop.longitude
        )
        return distance <= radiusKm
      })
      .map(shop => shop.id)
    
    if (nearbyShopIds.length === 0) return null
    
    // Get actual service prices from these shops
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, price, shop_id')
      .in('shop_id', nearbyShopIds)
    
    if (servicesError) throw servicesError
    
    // Aggregate pricing data
    const servicePricing = {}
    services.forEach(service => {
      if (!servicePricing[service.name]) {
        servicePricing[service.name] = []
      }
      servicePricing[service.name].push(service.price)
    })
    
    // Calculate averages
    const marketAverages = {}
    Object.entries(servicePricing).forEach(([name, prices]) => {
      marketAverages[name] = {
        average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        min: Math.min(...prices),
        max: Math.max(...prices),
        sampleSize: prices.length
      }
    })
    
    return {
      shopCount: nearbyShopIds.length,
      searchRadius: radiusKm,
      servicePricing: marketAverages,
      dataQuality: nearbyShopIds.length >= 3 ? 'good' : 'limited'
    }
    
  } catch (error) {
    console.error('Failed to fetch real market data:', error)
    return null
  }
}

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

/**
 * Get AI-powered pricing analysis
 */
async function getAIPricingAnalysis({ pricingRecommendations, competitiveAnalysis, realMarketData, location, businessType }) {
  try {
    const prompt = `
    As a barbershop business expert, analyze this pricing data and provide strategic recommendations:
    
    Location: ${location.city || 'Unknown'}, ${location.state || 'Unknown'}
    Business Type: ${businessType}
    
    Recommended Prices:
    ${Object.entries(pricingRecommendations).map(([service, data]) => 
      `- ${service}: $${data.recommended} (range: $${data.range.min}-$${data.range.max})`
    ).join('\n')}
    
    ${realMarketData ? `
    Real Market Data (${realMarketData.shopCount} nearby shops):
    ${Object.entries(realMarketData.servicePricing).map(([service, data]) =>
      `- ${service}: Average $${data.average} (${data.sampleSize} samples)`
    ).join('\n')}
    ` : 'No local market data available'}
    
    Provide:
    1. A competitive positioning strategy
    2. Service bundling recommendations
    3. Dynamic pricing opportunities
    4. Customer acquisition tactics
    
    Keep response concise and actionable.
    `
    
    const aiResponse = await callBestAIProvider(prompt, 'financial_advisor', {
      shop_name: businessType,
      location: `${location.city}, ${location.state}`,
      staff_count: 'new business'
    })
    
    return {
      analysis: aiResponse.response,
      provider: aiResponse.provider,
      confidence: aiResponse.confidence,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('AI analysis failed:', error)
    return null
  }
}