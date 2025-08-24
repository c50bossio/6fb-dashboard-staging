/**
 * Market Intelligence Service
 * Provides real-time market pricing data for barbershop services
 * Integrates with multiple data sources and AI providers for accuracy
 */

class MarketIntelligenceService {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = 30 * 60 * 1000 // 30 minutes for market data
    this.dataProviders = {
      internal: this.getInternalMarketData.bind(this),
      googlePlaces: this.getGooglePlacesData.bind(this),
      census: this.getCensusData.bind(this),
      aggregated: this.getAggregatedData.bind(this)
    }
  }

  /**
   * Get comprehensive market intelligence for a location
   */
  async getMarketIntelligence(location, businessType = 'barbershop') {
    const cacheKey = `market_${location.lat}_${location.lng}_${businessType}`
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return { ...cached.data, source: 'cache' }
      }
    }

    try {
      // Gather data from multiple sources in parallel
      const [internalData, competitorData, demographicData] = await Promise.all([
        this.getInternalMarketData(location, businessType),
        this.getCompetitorPricing(location, businessType),
        this.getDemographicData(location)
      ])

      // Synthesize all data sources
      const marketIntelligence = this.synthesizeMarketData({
        internal: internalData,
        competitors: competitorData,
        demographics: demographicData,
        location,
        businessType
      })

      // Cache the results
      this.cache.set(cacheKey, {
        data: marketIntelligence,
        timestamp: Date.now()
      })

      return marketIntelligence
    } catch (error) {
      console.error('Market intelligence error:', error)
      return this.getFallbackMarketData(location, businessType)
    }
  }

  /**
   * Get internal market data from our database
   */
  async getInternalMarketData(location, businessType) {
    try {
      const response = await fetch('/api/market/internal-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location, businessType })
      })

      if (!response.ok) throw new Error('Internal data fetch failed')
      return await response.json()
    } catch (error) {
      console.warn('Internal data fallback:', error)
      return null
    }
  }

  /**
   * Get competitor pricing from Google Places API
   */
  async getCompetitorPricing(location, businessType) {
    try {
      // Use field masking to reduce API costs (Google Maps pricing change March 2025)
      const response = await fetch('/api/market/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          businessType,
          radius: 3000, // 3km radius
          fields: ['name', 'rating', 'price_level', 'user_ratings_total'] // Field masking
        })
      })

      if (!response.ok) throw new Error('Competitor data fetch failed')
      
      const data = await response.json()
      return this.processCompetitorData(data)
    } catch (error) {
      console.warn('Competitor data fallback:', error)
      return this.getEstimatedCompetitorData(location)
    }
  }

  /**
   * Get demographic data for pricing power analysis
   */
  async getDemographicData(location) {
    try {
      const response = await fetch('/api/market/demographics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      })

      if (!response.ok) throw new Error('Demographic data fetch failed')
      return await response.json()
    } catch (error) {
      console.warn('Demographic data fallback:', error)
      return this.getEstimatedDemographicData(location)
    }
  }

  /**
   * Process competitor data into actionable insights
   */
  processCompetitorData(rawData) {
    if (!rawData || !rawData.results) return null

    const competitors = rawData.results
    const pricePoints = competitors
      .filter(c => c.price_level)
      .map(c => c.price_level)

    if (pricePoints.length === 0) return null

    // Google price_level: 1 = $, 2 = $$, 3 = $$$, 4 = $$$$
    const avgPriceLevel = pricePoints.reduce((a, b) => a + b, 0) / pricePoints.length
    
    // Convert to estimated service prices
    const priceMultiplier = {
      1: 0.7,   // Budget
      2: 1.0,   // Standard
      3: 1.3,   // Premium
      4: 1.6    // Luxury
    }

    const multiplier = priceMultiplier[Math.round(avgPriceLevel)] || 1.0

    return {
      competitorCount: competitors.length,
      averagePriceLevel: avgPriceLevel,
      priceMultiplier: multiplier,
      topCompetitors: competitors.slice(0, 5).map(c => ({
        name: c.name,
        rating: c.rating,
        reviewCount: c.user_ratings_total,
        priceLevel: c.price_level
      }))
    }
  }

  /**
   * Synthesize all data sources into pricing recommendations
   */
  synthesizeMarketData({ internal, competitors, demographics, location, businessType }) {
    // Base prices for services
    const basePrices = {
      'Haircut': 30,
      'Fade Cut': 35,
      'Beard Trim': 18,
      'Kids Cut': 22,
      'Hot Towel Shave': 28,
      'VIP Package': 50
    }

    // Calculate location multiplier
    let locationMultiplier = 1.0

    // Adjust based on competitor data
    if (competitors && competitors.priceMultiplier) {
      locationMultiplier *= competitors.priceMultiplier
    }

    // Adjust based on demographics
    if (demographics) {
      const incomeMultiplier = this.calculateIncomeMultiplier(demographics)
      locationMultiplier *= incomeMultiplier
    }

    // Calculate recommended prices
    const recommendedPrices = {}
    for (const [service, basePrice] of Object.entries(basePrices)) {
      const adjustedPrice = Math.round(basePrice * locationMultiplier)
      recommendedPrices[service] = {
        recommended: adjustedPrice,
        range: {
          min: Math.round(adjustedPrice * 0.85),
          max: Math.round(adjustedPrice * 1.15)
        },
        confidence: this.calculateConfidence(internal, competitors, demographics)
      }
    }

    return {
      prices: recommendedPrices,
      marketAnalysis: {
        locationMultiplier,
        competitorCount: competitors?.competitorCount || 0,
        marketSaturation: this.calculateMarketSaturation(competitors),
        pricingStrategy: this.recommendPricingStrategy(locationMultiplier, competitors),
        demographics: demographics ? {
          medianIncome: demographics.medianIncome,
          populationDensity: demographics.populationDensity,
          ageDistribution: demographics.ageDistribution
        } : null
      },
      insights: this.generateMarketInsights(recommendedPrices, competitors, demographics),
      competitors: competitors?.topCompetitors || [],
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Calculate income-based pricing multiplier
   */
  calculateIncomeMultiplier(demographics) {
    if (!demographics || !demographics.medianIncome) return 1.0

    const nationalMedian = 70000 // US median household income
    const localMedian = demographics.medianIncome
    
    // Scale pricing based on income differential
    const incomeRatio = localMedian / nationalMedian
    
    // Apply logarithmic scaling to avoid extreme multipliers
    return Math.pow(incomeRatio, 0.5)
  }

  /**
   * Calculate confidence score for recommendations
   */
  calculateConfidence(internal, competitors, demographics) {
    let confidence = 0.5 // Base confidence

    if (internal) confidence += 0.2
    if (competitors && competitors.competitorCount > 3) confidence += 0.2
    if (demographics) confidence += 0.1

    return Math.min(confidence, 0.95)
  }

  /**
   * Calculate market saturation level
   */
  calculateMarketSaturation(competitors) {
    if (!competitors) return 'unknown'
    
    const count = competitors.competitorCount
    if (count < 3) return 'low'
    if (count < 7) return 'moderate'
    if (count < 12) return 'high'
    return 'very_high'
  }

  /**
   * Recommend pricing strategy based on market conditions
   */
  recommendPricingStrategy(multiplier, competitors) {
    const saturation = this.calculateMarketSaturation(competitors)
    
    if (multiplier > 1.3) {
      return {
        strategy: 'premium',
        description: 'Market supports premium pricing - focus on quality and experience',
        tactics: [
          'Emphasize expertise and specialization',
          'Invest in premium products and ambiance',
          'Offer VIP services and memberships'
        ]
      }
    } else if (multiplier < 0.9) {
      return {
        strategy: 'value',
        description: 'Price-sensitive market - compete on value and efficiency',
        tactics: [
          'Offer package deals and bundles',
          'Focus on speed and convenience',
          'Implement loyalty programs'
        ]
      }
    } else if (saturation === 'high' || saturation === 'very_high') {
      return {
        strategy: 'differentiation',
        description: 'Competitive market - differentiate through unique services',
        tactics: [
          'Specialize in specific styles or demographics',
          'Offer unique services competitors don\'t',
          'Build strong customer relationships'
        ]
      }
    } else {
      return {
        strategy: 'balanced',
        description: 'Balanced market - focus on consistent quality and fair pricing',
        tactics: [
          'Match market rates for standard services',
          'Excel in customer service',
          'Build reputation through reviews'
        ]
      }
    }
  }

  /**
   * Generate actionable market insights
   */
  generateMarketInsights(prices, competitors, demographics) {
    const insights = []

    // Price positioning insight
    const avgRecommended = Object.values(prices).reduce((sum, p) => sum + p.recommended, 0) / Object.keys(prices).length
    if (avgRecommended > 40) {
      insights.push({
        type: 'opportunity',
        priority: 'high',
        message: 'Premium market detected - consider adding luxury services',
        action: 'Add specialized treatments or VIP packages'
      })
    }

    // Competition insight
    if (competitors && competitors.competitorCount > 10) {
      insights.push({
        type: 'warning',
        priority: 'medium',
        message: 'High competition in area - differentiation crucial',
        action: 'Focus on unique selling points and customer experience'
      })
    }

    // Demographic insight
    if (demographics && demographics.ageDistribution) {
      const under35Percent = demographics.ageDistribution['18-34'] || 0
      if (under35Percent > 40) {
        insights.push({
          type: 'opportunity',
          priority: 'high',
          message: 'Young demographic - consider modern styles and online booking',
          action: 'Emphasize trendy cuts and social media presence'
        })
      }
    }

    return insights
  }

  /**
   * Get estimated competitor data when API unavailable
   */
  getEstimatedCompetitorData(location) {
    // Use city-based estimates as fallback
    const cityEstimates = {
      'new york': { competitorCount: 15, priceMultiplier: 1.6 },
      'los angeles': { competitorCount: 12, priceMultiplier: 1.4 },
      'chicago': { competitorCount: 10, priceMultiplier: 1.2 },
      'houston': { competitorCount: 8, priceMultiplier: 1.0 },
      'default': { competitorCount: 5, priceMultiplier: 1.0 }
    }

    const city = location.city?.toLowerCase() || 'default'
    const estimate = Object.entries(cityEstimates).find(([key]) => 
      city.includes(key)
    )?.[1] || cityEstimates.default

    return estimate
  }

  /**
   * Get estimated demographic data when API unavailable
   */
  getEstimatedDemographicData(location) {
    // Use state-based estimates as fallback
    const stateEstimates = {
      'CA': { medianIncome: 85000, populationDensity: 'high' },
      'NY': { medianIncome: 75000, populationDensity: 'very_high' },
      'TX': { medianIncome: 65000, populationDensity: 'moderate' },
      'FL': { medianIncome: 60000, populationDensity: 'moderate' },
      'default': { medianIncome: 70000, populationDensity: 'moderate' }
    }

    const state = location.state || 'default'
    return stateEstimates[state] || stateEstimates.default
  }

  /**
   * Fallback market data when all sources fail
   */
  getFallbackMarketData(location, businessType) {
    return {
      prices: {
        'Haircut': { recommended: 30, range: { min: 25, max: 35 }, confidence: 0.5 },
        'Fade Cut': { recommended: 35, range: { min: 30, max: 40 }, confidence: 0.5 },
        'Beard Trim': { recommended: 18, range: { min: 15, max: 22 }, confidence: 0.5 },
        'Kids Cut': { recommended: 22, range: { min: 18, max: 26 }, confidence: 0.5 },
        'Hot Towel Shave': { recommended: 28, range: { min: 24, max: 32 }, confidence: 0.5 },
        'VIP Package': { recommended: 50, range: { min: 45, max: 55 }, confidence: 0.5 }
      },
      marketAnalysis: {
        locationMultiplier: 1.0,
        competitorCount: 0,
        marketSaturation: 'unknown',
        pricingStrategy: {
          strategy: 'balanced',
          description: 'Start with market average and adjust based on response',
          tactics: ['Monitor customer feedback', 'Track booking rates', 'Adjust quarterly']
        }
      },
      insights: [{
        type: 'info',
        priority: 'low',
        message: 'Using estimated market rates - refine as you gather local data',
        action: 'Track competitor pricing and customer feedback'
      }],
      competitors: [],
      source: 'fallback',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }
}

// Singleton instance
const marketIntelligence = new MarketIntelligenceService()

export default marketIntelligence