import { NextResponse } from 'next/server'

// Service recommendation database based on business type and market analysis
const serviceRecommendations = {
  barbershop: {
    essential: [
      {
        name: 'Classic Haircut',
        category: 'haircut',
        duration: 30,
        popularity: 98,
        profitMargin: 'high',
        difficulty: 'basic',
        description: 'Foundation service - every barbershop needs this',
        pricing: { min: 20, avg: 28, max: 45 },
        equipment: ['basic_tools', 'chair'],
        timeToMaster: '1-2 weeks'
      },
      {
        name: 'Beard Trim',
        category: 'grooming',
        duration: 15,
        popularity: 85,
        profitMargin: 'very_high',
        difficulty: 'basic',
        description: 'High-margin add-on service',
        pricing: { min: 10, avg: 16, max: 25 },
        equipment: ['trimmer', 'scissors'],
        timeToMaster: '1 week'
      },
      {
        name: 'Wash & Style',
        category: 'grooming',
        duration: 20,
        popularity: 75,
        profitMargin: 'medium',
        difficulty: 'basic',
        description: 'Quick service for regular customers',
        pricing: { min: 15, avg: 20, max: 30 },
        equipment: ['shampoo_station'],
        timeToMaster: '1 week'
      }
    ],
    popular: [
      {
        name: 'Hot Towel Shave',
        category: 'luxury',
        duration: 45,
        popularity: 60,
        profitMargin: 'premium',
        difficulty: 'intermediate',
        description: 'Luxury experience with premium pricing',
        pricing: { min: 25, avg: 40, max: 75 },
        equipment: ['hot_towel_steamer', 'straight_razor'],
        timeToMaster: '2-3 months'
      },
      {
        name: 'Haircut + Beard Combo',
        category: 'combo',
        duration: 45,
        popularity: 70,
        profitMargin: 'high',
        difficulty: 'basic',
        description: 'Popular package deal',
        pricing: { min: 30, avg: 42, max: 65 },
        equipment: ['basic_tools', 'trimmer'],
        timeToMaster: '2-3 weeks'
      },
      {
        name: 'Scalp Treatment',
        category: 'wellness',
        duration: 30,
        popularity: 35,
        profitMargin: 'very_high',
        difficulty: 'intermediate',
        description: 'Growing wellness trend',
        pricing: { min: 20, avg: 35, max: 60 },
        equipment: ['scalp_massage_tools', 'treatments'],
        timeToMaster: '1 month'
      }
    ],
    premium: [
      {
        name: 'Luxury Shave Experience',
        category: 'luxury',
        duration: 60,
        popularity: 25,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Full luxury treatment with premium products',
        pricing: { min: 50, avg: 85, max: 150 },
        equipment: ['luxury_products', 'straight_razor', 'hot_towels'],
        timeToMaster: '3-6 months'
      },
      {
        name: 'Hair & Beard Design',
        category: 'artistic',
        duration: 60,
        popularity: 20,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Custom artistic cuts and designs',
        pricing: { min: 40, avg: 75, max: 120 },
        equipment: ['artistic_tools', 'stencils'],
        timeToMaster: '6+ months'
      }
    ]
  },
  salon: {
    essential: [
      {
        name: 'Cut & Style',
        category: 'haircut',
        duration: 60,
        popularity: 98,
        profitMargin: 'high',
        difficulty: 'intermediate',
        description: 'Core salon service',
        pricing: { min: 35, avg: 55, max: 120 },
        equipment: ['styling_tools', 'products'],
        timeToMaster: '2-3 months'
      },
      {
        name: 'Blowout',
        category: 'styling',
        duration: 30,
        popularity: 80,
        profitMargin: 'medium',
        difficulty: 'basic',
        description: 'Quick styling service',
        pricing: { min: 25, avg: 35, max: 65 },
        equipment: ['blow_dryer', 'brushes'],
        timeToMaster: '2-4 weeks'
      },
      {
        name: 'Color Touch-up',
        category: 'color',
        duration: 90,
        popularity: 75,
        profitMargin: 'very_high',
        difficulty: 'intermediate',
        description: 'Root touch-ups and maintenance',
        pricing: { min: 45, avg: 75, max: 140 },
        equipment: ['color_products', 'foils'],
        timeToMaster: '2-3 months'
      }
    ],
    popular: [
      {
        name: 'Full Color',
        category: 'color',
        duration: 120,
        popularity: 65,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Complete color transformation',
        pricing: { min: 80, avg: 140, max: 300 },
        equipment: ['professional_color', 'processing_tools'],
        timeToMaster: '4-6 months'
      },
      {
        name: 'Highlights',
        category: 'color',
        duration: 150,
        popularity: 60,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Foil highlighting techniques',
        pricing: { min: 90, avg: 160, max: 350 },
        equipment: ['foils', 'lightener', 'toner'],
        timeToMaster: '6+ months'
      },
      {
        name: 'Deep Conditioning Treatment',
        category: 'treatment',
        duration: 45,
        popularity: 50,
        profitMargin: 'high',
        difficulty: 'basic',
        description: 'Hair health and repair',
        pricing: { min: 30, avg: 50, max: 90 },
        equipment: ['treatment_products', 'steamer'],
        timeToMaster: '2 weeks'
      }
    ],
    premium: [
      {
        name: 'Keratin Treatment',
        category: 'treatment',
        duration: 180,
        popularity: 30,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Professional smoothing treatment',
        pricing: { min: 150, avg: 300, max: 500 },
        equipment: ['keratin_products', 'flat_iron'],
        timeToMaster: '3-6 months'
      },
      {
        name: 'Hair Extensions',
        category: 'extensions',
        duration: 120,
        popularity: 25,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Length and volume enhancement',
        pricing: { min: 200, avg: 400, max: 800 },
        equipment: ['extensions', 'application_tools'],
        timeToMaster: '6+ months'
      }
    ]
  },
  spa: {
    essential: [
      {
        name: 'Classic Facial',
        category: 'skincare',
        duration: 60,
        popularity: 95,
        profitMargin: 'high',
        difficulty: 'intermediate',
        description: 'Foundation spa service',
        pricing: { min: 60, avg: 85, max: 150 },
        equipment: ['facial_products', 'steamer'],
        timeToMaster: '1-2 months'
      },
      {
        name: 'Relaxation Massage',
        category: 'wellness',
        duration: 60,
        popularity: 90,
        profitMargin: 'high',
        difficulty: 'intermediate',
        description: 'Popular wellness service',
        pricing: { min: 70, avg: 95, max: 160 },
        equipment: ['massage_table', 'oils'],
        timeToMaster: '2-3 months'
      },
      {
        name: 'Express Manicure',
        category: 'nails',
        duration: 30,
        popularity: 80,
        profitMargin: 'medium',
        difficulty: 'basic',
        description: 'Quick nail service',
        pricing: { min: 25, avg: 40, max: 70 },
        equipment: ['nail_tools', 'polish'],
        timeToMaster: '2-4 weeks'
      }
    ],
    popular: [
      {
        name: 'Anti-Aging Facial',
        category: 'skincare',
        duration: 90,
        popularity: 65,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Specialized anti-aging treatment',
        pricing: { min: 100, avg: 150, max: 300 },
        equipment: ['specialized_products', 'devices'],
        timeToMaster: '3-6 months'
      },
      {
        name: 'Hot Stone Massage',
        category: 'wellness',
        duration: 90,
        popularity: 55,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Luxury massage experience',
        pricing: { min: 100, avg: 140, max: 220 },
        equipment: ['hot_stones', 'heating_unit'],
        timeToMaster: '2-3 months'
      }
    ],
    premium: [
      {
        name: 'Hydrafacial MD',
        category: 'skincare',
        duration: 45,
        popularity: 35,
        profitMargin: 'premium',
        difficulty: 'advanced',
        description: 'Medical-grade facial treatment',
        pricing: { min: 150, avg: 250, max: 400 },
        equipment: ['hydrafacial_machine'],
        timeToMaster: '1-2 months + certification'
      }
    ]
  }
}

// Market trends and seasonal recommendations
const marketTrends = {
  2024: {
    trending: ['wellness services', 'scalp treatments', 'beard grooming', 'express services'],
    declining: ['complex updos', 'perms'],
    seasonal: {
      winter: ['deep conditioning', 'scalp treatments', 'hair repair'],
      spring: ['color refresh', 'cuts for new season'],
      summer: ['protective treatments', 'sun damage repair'],
      fall: ['color changes', 'hair strengthening']
    }
  }
}

export async function POST(request) {
  try {
    const { businessType, location, currentServices = [] } = await request.json()
    
    // Get base service recommendations
    const recommendations = serviceRecommendations[businessType] || serviceRecommendations.barbershop
    
    // Apply location-based filtering (urban areas prefer quick services, rural prefer comprehensive)
    const locationFilters = getLocationFilters(location)
    const filteredRecommendations = applyLocationFilters(recommendations, locationFilters)
    
    // Generate personalized service mix based on current services
    const serviceMix = generateServiceMix(filteredRecommendations, currentServices, businessType)
    
    // Add market intelligence
    const marketInsights = generateMarketInsights(businessType, location, serviceMix)
    
    // Calculate business impact
    const businessImpact = calculateBusinessImpact(serviceMix)
    
    // Generate implementation roadmap
    const roadmap = generateImplementationRoadmap(serviceMix, businessType)
    
    const response = {
      success: true,
      recommendations: {
        immediate: serviceMix.immediate,
        growth: serviceMix.growth,
        advanced: serviceMix.advanced
      },
      marketInsights,
      businessImpact,
      roadmap,
      trends: {
        current: marketTrends['2024'].trending,
        seasonal: getCurrentSeasonalTrends()
      },
      implementation: {
        startWithEssential: true,
        addServicesGradually: true,
        testDemandFirst: true,
        trainingRequired: getTrainingRequirements(serviceMix)
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Service recommendations error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function getLocationFilters(location) {
  if (!location) return { preference: 'balanced' }
  
  const locationStr = location.toLowerCase()
  
  if (locationStr.includes('urban') || locationStr.includes('city') || locationStr.includes('downtown')) {
    return {
      preference: 'quick_services',
      pricePoint: 'premium',
      trends: 'cutting_edge'
    }
  }
  
  if (locationStr.includes('suburban')) {
    return {
      preference: 'balanced',
      pricePoint: 'competitive',
      trends: 'mainstream'
    }
  }
  
  if (locationStr.includes('rural') || locationStr.includes('small_town')) {
    return {
      preference: 'comprehensive',
      pricePoint: 'value',
      trends: 'traditional'
    }
  }
  
  return { preference: 'balanced', pricePoint: 'competitive', trends: 'mainstream' }
}

function applyLocationFilters(recommendations, filters) {
  const filtered = { ...recommendations }
  
  // Adjust recommendations based on location preferences
  if (filters.preference === 'quick_services') {
    // Prioritize shorter duration services in urban areas
    Object.keys(filtered).forEach(category => {
      filtered[category] = filtered[category]
        .sort((a, b) => a.duration - b.duration)
        .map(service => ({
          ...service,
          locationMatch: service.duration <= 30 ? 'high' : service.duration <= 60 ? 'medium' : 'low'
        }))
    })
  } else if (filters.preference === 'comprehensive') {
    // Prioritize full-service offerings in rural areas
    Object.keys(filtered).forEach(category => {
      filtered[category] = filtered[category].map(service => ({
        ...service,
        locationMatch: service.category === 'combo' || service.duration >= 45 ? 'high' : 'medium'
      }))
    })
  }
  
  return filtered
}

function generateServiceMix(recommendations, currentServices, businessType) {
  const currentServiceNames = currentServices.map(s => s.name || s)
  
  // Essential services (must-haves)
  const immediate = recommendations.essential
    .filter(service => !currentServiceNames.includes(service.name))
    .slice(0, 3)
    .map(service => ({
      ...service,
      priority: 'high',
      reason: 'Essential for business foundation',
      timeframe: '0-2 weeks'
    }))
  
  // Growth services (nice-to-haves)  
  const growth = recommendations.popular
    .filter(service => !currentServiceNames.includes(service.name))
    .slice(0, 3)
    .map(service => ({
      ...service,
      priority: 'medium',
      reason: 'Popular demand and good margins',
      timeframe: '1-3 months'
    }))
  
  // Advanced services (differentiators)
  const advanced = recommendations.premium
    .filter(service => !currentServiceNames.includes(service.name))
    .slice(0, 2)
    .map(service => ({
      ...service,
      priority: 'low',
      reason: 'Competitive differentiation',
      timeframe: '6+ months'
    }))
  
  return { immediate, growth, advanced }
}

function generateMarketInsights(businessType, location, serviceMix) {
  const insights = []
  
  // Service mix analysis
  const totalServices = serviceMix.immediate.length + serviceMix.growth.length + serviceMix.advanced.length
  if (totalServices < 5) {
    insights.push({
      type: 'opportunity',
      title: 'Service Menu Expansion',
      message: `Adding ${5 - totalServices} more services could increase revenue by 20-30%`,
      priority: 'high'
    })
  }
  
  // Market positioning
  const premiumServicesCount = serviceMix.advanced.length
  if (premiumServicesCount === 0) {
    insights.push({
      type: 'competitive',
      title: 'Premium Opportunity',
      message: 'Consider adding premium services to capture higher-value customers',
      priority: 'medium'
    })
  }
  
  // Quick wins
  const quickServices = serviceMix.immediate.filter(s => s.duration <= 20)
  if (quickServices.length > 0) {
    insights.push({
      type: 'revenue',
      title: 'Quick Service Opportunity',
      message: `${quickServices.length} quick services can fill schedule gaps and increase daily revenue`,
      priority: 'high'
    })
  }
  
  return insights
}

function calculateBusinessImpact(serviceMix) {
  const allServices = [...serviceMix.immediate, ...serviceMix.growth, ...serviceMix.advanced]
  
  const avgRevenue = allServices.reduce((sum, service) => 
    sum + service.pricing.avg, 0) / allServices.length
  
  const totalDuration = allServices.reduce((sum, service) => 
    sum + service.duration, 0)
  
  const avgDuration = totalDuration / allServices.length
  
  // Calculate potential impact
  const servicesPerDay = Math.floor(480 / avgDuration) // 8-hour day
  const dailyRevenue = servicesPerDay * avgRevenue
  const monthlyRevenue = dailyRevenue * 25 // working days
  
  return {
    averageServicePrice: Math.round(avgRevenue),
    averageServiceDuration: Math.round(avgDuration),
    potentialDailyRevenue: Math.round(dailyRevenue),
    potentialMonthlyRevenue: Math.round(monthlyRevenue),
    revenueIncrease: '20-40%', // Based on industry benchmarks
    serviceUtilization: `${Math.round((servicesPerDay / 12) * 100)}%` // Assuming 12 appointment capacity
  }
}

function generateImplementationRoadmap(serviceMix, businessType) {
  const roadmap = []
  
  // Phase 1: Essential services (0-1 month)
  if (serviceMix.immediate.length > 0) {
    roadmap.push({
      phase: 1,
      title: 'Foundation Services',
      timeframe: '0-1 month',
      services: serviceMix.immediate.map(s => s.name),
      focus: 'Master essential services and build client base',
      investment: 'Low (basic equipment)',
      roi_timeline: '2-4 weeks'
    })
  }
  
  // Phase 2: Popular services (1-6 months)
  if (serviceMix.growth.length > 0) {
    roadmap.push({
      phase: 2,
      title: 'Growth Services',
      timeframe: '1-6 months',
      services: serviceMix.growth.map(s => s.name),
      focus: 'Add popular services to increase revenue',
      investment: 'Medium (additional equipment/training)',
      roi_timeline: '1-3 months'
    })
  }
  
  // Phase 3: Premium services (6+ months)  
  if (serviceMix.advanced.length > 0) {
    roadmap.push({
      phase: 3,
      title: 'Premium Differentiation',
      timeframe: '6+ months',
      services: serviceMix.advanced.map(s => s.name),
      focus: 'Premium services for competitive advantage',
      investment: 'High (specialized equipment/certification)',
      roi_timeline: '3-6 months'
    })
  }
  
  return roadmap
}

function getCurrentSeasonalTrends() {
  const month = new Date().getMonth()
  
  if (month >= 11 || month <= 1) return marketTrends['2024'].seasonal.winter
  if (month >= 2 && month <= 4) return marketTrends['2024'].seasonal.spring
  if (month >= 5 && month <= 7) return marketTrends['2024'].seasonal.summer
  return marketTrends['2024'].seasonal.fall
}

function getTrainingRequirements(serviceMix) {
  const allServices = [...serviceMix.immediate, ...serviceMix.growth, ...serviceMix.advanced]
  
  const requirements = {
    basic: allServices.filter(s => s.difficulty === 'basic').length,
    intermediate: allServices.filter(s => s.difficulty === 'intermediate').length,
    advanced: allServices.filter(s => s.difficulty === 'advanced').length,
    totalTime: allServices.reduce((sum, service) => {
      const weeks = service.timeToMaster.includes('week') ? 
        parseInt(service.timeToMaster) : 
        parseInt(service.timeToMaster) * 4
      return sum + weeks
    }, 0)
  }
  
  return {
    ...requirements,
    estimatedCost: requirements.advanced * 500 + requirements.intermediate * 200 + requirements.basic * 50,
    priorityOrder: 'Start with basic services, add intermediate after mastery, advanced for specialization'
  }
}