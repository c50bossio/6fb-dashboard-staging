'use client'

/**
 * Smart Suggestions API
 * AI-powered recommendations and industry best practices for onboarding
 */

class SmartSuggestionsAPI {
  constructor() {
    this.baseUrl = '/api/suggestions'
    this.cache = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Get smart defaults for business setup based on type and location
   */
  async getBusinessDefaults(businessType, location = null, segmentationPath = null) {
    const cacheKey = `business_defaults_${businessType}_${location}_${segmentationPath}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/business-defaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          location,
          segmentationPath,
          timestamp: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const suggestions = await response.json()
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: suggestions,
        timestamp: Date.now()
      })

      return suggestions
    } catch (error) {
      console.warn('Failed to fetch business defaults, using fallback:', error)
      return this.getFallbackBusinessDefaults(businessType, segmentationPath)
    }
  }

  /**
   * Get pricing suggestions based on location and business type
   */
  async getPricingSuggestions(businessType, location, services = []) {
    const cacheKey = `pricing_${businessType}_${location}_${services.length}`
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/pricing-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          location,
          services
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const pricing = await response.json()
      
      // Cache the response
      this.cache.set(cacheKey, {
        data: pricing,
        timestamp: Date.now()
      })

      return pricing
    } catch (error) {
      console.warn('Failed to fetch pricing suggestions, using fallback:', error)
      return this.getFallbackPricingSuggestions(businessType, services)
    }
  }

  /**
   * Get service recommendations based on business type and market analysis
   */
  async getServiceRecommendations(businessType, location, currentServices = []) {
    try {
      const response = await fetch(`${this.baseUrl}/service-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          location,
          currentServices
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.warn('Failed to fetch service recommendations, using fallback:', error)
      return this.getFallbackServiceRecommendations(businessType)
    }
  }

  /**
   * Get business hours suggestions based on location and industry data
   */
  async getBusinessHoursSuggestions(businessType, location) {
    try {
      const response = await fetch(`${this.baseUrl}/business-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          location
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.warn('Failed to fetch business hours, using fallback:', error)
      return this.getFallbackBusinessHours(businessType)
    }
  }

  /**
   * Get contextual suggestions for specific onboarding steps
   */
  async getStepSuggestions(stepId, formData, userProfile = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/step-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId,
          formData,
          userProfile
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.warn('Failed to fetch step suggestions:', error)
      return { suggestions: [], tips: [] }
    }
  }

  /**
   * Fallback business defaults when API is unavailable
   */
  getFallbackBusinessDefaults(businessType, segmentationPath) {
    const baseDefaults = {
      barbershop: {
        numberOfChairs: segmentationPath === 'first_barbershop' ? 2 : 3,
        services: [
          { name: 'Haircut', duration: 30, price: 25 },
          { name: 'Beard Trim', duration: 15, price: 15 },
          { name: 'Haircut + Beard', duration: 45, price: 35 }
        ],
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { closed: true }
        }
      },
      salon: {
        numberOfChairs: segmentationPath === 'first_barbershop' ? 3 : 5,
        services: [
          { name: 'Cut & Style', duration: 60, price: 45 },
          { name: 'Color', duration: 120, price: 85 },
          { name: 'Blowout', duration: 30, price: 30 }
        ],
        businessHours: {
          monday: { closed: true },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '11:00', close: '16:00', closed: false }
        }
      },
      spa: {
        numberOfChairs: 4,
        services: [
          { name: 'Facial', duration: 60, price: 75 },
          { name: 'Massage', duration: 60, price: 85 },
          { name: 'Manicure', duration: 45, price: 35 }
        ],
        businessHours: {
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '11:00', close: '16:00', closed: false }
        }
      }
    }

    const defaults = baseDefaults[businessType] || baseDefaults.barbershop

    return {
      success: true,
      defaults,
      reasoning: {
        chairCount: `${defaults.numberOfChairs} chairs is optimal for ${segmentationPath === 'first_barbershop' ? 'new' : 'established'} ${businessType} businesses`,
        services: `Essential services for ${businessType} based on industry standards`,
        hours: `Typical operating hours for ${businessType} businesses`
      },
      confidence: 0.8,
      source: 'fallback'
    }
  }

  /**
   * Fallback pricing suggestions
   */
  getFallbackPricingSuggestions(businessType, services = []) {
    const pricingData = {
      barbershop: {
        'Haircut': { min: 20, max: 40, recommended: 25 },
        'Beard Trim': { min: 10, max: 20, recommended: 15 },
        'Hot Towel Shave': { min: 30, max: 50, recommended: 40 }
      },
      salon: {
        'Cut & Style': { min: 35, max: 65, recommended: 45 },
        'Color': { min: 70, max: 120, recommended: 85 },
        'Highlights': { min: 100, max: 160, recommended: 120 }
      },
      spa: {
        'Facial': { min: 60, max: 100, recommended: 75 },
        'Massage': { min: 70, max: 110, recommended: 85 },
        'Body Treatment': { min: 90, max: 150, recommended: 120 }
      }
    }

    const businessPricing = pricingData[businessType] || pricingData.barbershop

    return {
      success: true,
      pricing: businessPricing,
      marketAnalysis: {
        competitiveness: 'moderate',
        location: 'average_market',
        recommendation: 'Start with recommended prices and adjust based on demand'
      },
      confidence: 0.75,
      source: 'fallback'
    }
  }

  /**
   * Fallback service recommendations
   */
  getFallbackServiceRecommendations(businessType) {
    const recommendations = {
      barbershop: {
        essential: [
          { name: 'Classic Haircut', popularity: 95, profitMargin: 'high' },
          { name: 'Beard Trim', popularity: 75, profitMargin: 'high' },
          { name: 'Wash & Style', popularity: 60, profitMargin: 'medium' }
        ],
        popular: [
          { name: 'Hot Towel Shave', popularity: 45, profitMargin: 'very_high' },
          { name: 'Hair Wash', popularity: 50, profitMargin: 'low' }
        ],
        premium: [
          { name: 'Luxury Shave Experience', popularity: 20, profitMargin: 'premium' },
          { name: 'Scalp Treatment', popularity: 15, profitMargin: 'high' }
        ]
      },
      salon: {
        essential: [
          { name: 'Cut & Style', popularity: 98, profitMargin: 'high' },
          { name: 'Color Touch-up', popularity: 80, profitMargin: 'very_high' },
          { name: 'Blowout', popularity: 70, profitMargin: 'medium' }
        ],
        popular: [
          { name: 'Full Color', popularity: 60, profitMargin: 'very_high' },
          { name: 'Deep Conditioning', popularity: 40, profitMargin: 'medium' }
        ],
        premium: [
          { name: 'Keratin Treatment', popularity: 25, profitMargin: 'premium' },
          { name: 'Hair Extensions', popularity: 20, profitMargin: 'premium' }
        ]
      }
    }

    return {
      success: true,
      recommendations: recommendations[businessType] || recommendations.barbershop,
      insights: {
        mostProfitable: 'Color services typically have highest margins',
        quickWins: 'Add premium services after establishing essential offerings',
        seasonality: 'Consider seasonal services for additional revenue'
      },
      confidence: 0.85,
      source: 'fallback'
    }
  }

  /**
   * Fallback business hours
   */
  getFallbackBusinessHours(businessType) {
    const schedules = {
      barbershop: {
        recommended: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { closed: true }
        },
        reasoning: 'Traditional barbershop hours with extended Friday for weekend prep'
      },
      salon: {
        recommended: {
          monday: { closed: true },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { open: '11:00', close: '16:00', closed: false }
        },
        reasoning: 'Closed Mondays for staff rest, weekend availability for special events'
      }
    }

    const schedule = schedules[businessType] || schedules.barbershop

    return {
      success: true,
      schedule: schedule.recommended,
      reasoning: schedule.reasoning,
      alternatives: [
        'Early bird (7am start) for professionals',
        'Late evening (until 8pm) for after-work clients',
        'Sunday hours for weekend convenience'
      ],
      confidence: 0.9,
      source: 'fallback'
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      timeout: this.cacheTimeout
    }
  }
}

// Singleton instance
const smartSuggestions = new SmartSuggestionsAPI()

export default smartSuggestions

// React hook for easy integration
export function useSmartSuggestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getSuggestions = async (type, ...args) => {
    setLoading(true)
    setError(null)
    
    try {
      let result
      switch (type) {
        case 'business':
          result = await smartSuggestions.getBusinessDefaults(...args)
          break
        case 'pricing':
          result = await smartSuggestions.getPricingSuggestions(...args)
          break
        case 'services':
          result = await smartSuggestions.getServiceRecommendations(...args)
          break
        case 'hours':
          result = await smartSuggestions.getBusinessHoursSuggestions(...args)
          break
        case 'step':
          result = await smartSuggestions.getStepSuggestions(...args)
          break
        default:
          throw new Error(`Unknown suggestion type: ${type}`)
      }
      
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { getSuggestions, loading, error }
}