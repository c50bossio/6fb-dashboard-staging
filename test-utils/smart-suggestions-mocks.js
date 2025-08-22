/**
 * Smart Suggestions API Mock Testing Utilities
 * Provides realistic mock responses for testing AI-powered onboarding features
 */

export class SmartSuggestionsMocks {
  
  /**
   * Mock successful business defaults response
   */
  static getBusinessDefaultsSuccess(businessType = 'barbershop', location = 'Los Angeles, CA') {
    const baseDefaults = {
      barbershop: {
        numberOfChairs: 3,
        parkingAvailable: true,
        wheelchairAccessible: true,
        wifiAvailable: true,
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '19:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: false },
          sunday: { closed: true }
        },
        services: [
          { name: 'Haircut', duration: 30, price: 25 },
          { name: 'Beard Trim', duration: 15, price: 15 },
          { name: 'Haircut + Beard', duration: 45, price: 35 }
        ]
      },
      salon: {
        numberOfChairs: 5,
        parkingAvailable: true,
        wheelchairAccessible: true,
        wifiAvailable: true,
        businessHours: {
          monday: { open: '08:00', close: '19:00', closed: false },
          tuesday: { open: '08:00', close: '19:00', closed: false },
          wednesday: { open: '08:00', close: '19:00', closed: false },
          thursday: { open: '08:00', close: '19:00', closed: false },
          friday: { open: '08:00', close: '20:00', closed: false },
          saturday: { open: '08:00', close: '18:00', closed: false },
          sunday: { open: '10:00', close: '16:00', closed: false }
        },
        services: [
          { name: 'Cut & Style', duration: 60, price: 45 },
          { name: 'Color', duration: 120, price: 85 },
          { name: 'Blowout', duration: 30, price: 30 }
        ]
      }
    }

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        defaults: baseDefaults[businessType] || baseDefaults.barbershop,
        confidence: 0.85,
        insights: [
          `Based on ${location} market analysis`,
          `Average ${businessType} in your area has ${baseDefaults[businessType]?.numberOfChairs || 3} chairs`,
          'Consider extending Friday hours for weekend customers'
        ],
        marketData: {
          averagePricing: businessType === 'barbershop' ? 28 : 52,
          competitorCount: 12,
          marketSaturation: 'moderate'
        }
      })
    }
  }

  /**
   * Mock pricing suggestions response
   */
  static getPricingSuggestionsSuccess(businessType = 'barbershop', location = 'Los Angeles, CA') {
    const pricingData = {
      barbershop: {
        baseServices: [
          { 
            name: 'Haircut',
            suggestedPrice: 28,
            marketRange: { min: 20, max: 35 },
            reasoning: 'Based on 15 competitors in your area'
          },
          {
            name: 'Beard Trim',
            suggestedPrice: 18,
            marketRange: { min: 12, max: 25 },
            reasoning: 'Popular add-on service, price competitively'
          },
          {
            name: 'Haircut + Beard',
            suggestedPrice: 40,
            marketRange: { min: 32, max: 50 },
            reasoning: 'Bundle pricing saves customers $6'
          }
        ],
        premiumServices: [
          {
            name: 'Hot Towel Shave',
            suggestedPrice: 45,
            marketRange: { min: 35, max: 60 },
            reasoning: 'Premium service with higher margins'
          }
        ]
      },
      salon: {
        baseServices: [
          {
            name: 'Cut & Style',
            suggestedPrice: 52,
            marketRange: { min: 40, max: 65 },
            reasoning: 'Standard salon service pricing'
          },
          {
            name: 'Color',
            suggestedPrice: 95,
            marketRange: { min: 75, max: 120 },
            reasoning: 'Material costs and time investment'
          }
        ]
      }
    }

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        businessType,
        location,
        suggestions: pricingData[businessType] || pricingData.barbershop,
        marketAnalysis: {
          averageTicket: businessType === 'barbershop' ? 32 : 78,
          priceRange: businessType === 'barbershop' ? '$20-$50' : '$40-$120',
          competitivePosition: 'mid-market',
          recommendation: 'Position slightly above average for quality perception'
        },
        revenueProjections: {
          conservative: { monthly: 3200, annual: 38400 },
          realistic: { monthly: 4800, annual: 57600 },
          optimistic: { monthly: 6400, annual: 76800 }
        },
        confidence: 0.82
      })
    }
  }

  /**
   * Mock service recommendations response
   */
  static getServiceRecommendationsSuccess(businessType = 'barbershop') {
    const serviceRecommendations = {
      barbershop: {
        essential: [
          { name: 'Haircut', priority: 'high', demand: 'very-high', margin: 'good' },
          { name: 'Beard Trim', priority: 'high', demand: 'high', margin: 'excellent' },
          { name: 'Mustache Trim', priority: 'medium', demand: 'medium', margin: 'excellent' }
        ],
        popular: [
          { name: 'Hot Towel Shave', priority: 'medium', demand: 'medium', margin: 'excellent' },
          { name: 'Head Shave', priority: 'low', demand: 'low', margin: 'good' },
          { name: 'Eyebrow Trim', priority: 'low', demand: 'medium', margin: 'excellent' }
        ],
        seasonal: [
          { name: 'Holiday Styling', priority: 'high', demand: 'high', margin: 'good', season: 'winter' },
          { name: 'Prom Styling', priority: 'medium', demand: 'high', margin: 'good', season: 'spring' }
        ]
      },
      salon: {
        essential: [
          { name: 'Cut & Style', priority: 'high', demand: 'very-high', margin: 'good' },
          { name: 'Color', priority: 'high', demand: 'high', margin: 'excellent' },
          { name: 'Highlights', priority: 'medium', demand: 'high', margin: 'excellent' }
        ],
        popular: [
          { name: 'Deep Conditioning', priority: 'medium', demand: 'medium', margin: 'good' },
          { name: 'Keratin Treatment', priority: 'low', demand: 'low', margin: 'excellent' },
          { name: 'Blowout', priority: 'high', demand: 'high', margin: 'good' }
        ]
      }
    }

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        businessType,
        recommendations: serviceRecommendations[businessType] || serviceRecommendations.barbershop,
        insights: [
          'Focus on high-demand, high-margin services first',
          'Consider seasonal offerings to boost revenue',
          'Bundle services to increase average ticket size'
        ],
        marketTrends: {
          growing: ['beard styling', 'premium grooming'],
          declining: ['traditional cuts'],
          emerging: ['eco-friendly products', 'mobile services']
        },
        confidence: 0.78
      })
    }
  }

  /**
   * Mock step suggestions response
   */
  static getStepSuggestionsSuccess(stepId = 'business-info', formData = {}, context = {}) {
    const stepSpecificSuggestions = {
      'business-info': {
        tips: [
          'Choose a memorable business name that reflects your brand',
          'Ensure your address is easily findable on Google Maps',
          'A professional phone number builds customer trust'
        ],
        suggestions: {
          fields: {
            businessName: ['Elite Cuts', 'Premier Barbershop', 'Classic Style Co'],
            businessDescription: [
              'Traditional barbershop with modern techniques',
              'Expert cuts and premium grooming services',
              'Where style meets tradition'
            ]
          }
        },
        validation: {
          businessName: {
            minLength: 2,
            maxLength: 50,
            suggestions: 'Keep it short and memorable'
          }
        }
      },
      'services': {
        tips: [
          'Start with 3-5 core services you do best',
          'Price competitively for your local market',
          'Consider package deals to increase revenue'
        ],
        suggestions: {
          pricing: {
            haircut: { min: 20, recommended: 28, max: 35 },
            beard: { min: 12, recommended: 18, max: 25 }
          }
        }
      },
      'schedule': {
        tips: [
          'Most barbershops are busiest Friday-Saturday',
          'Consider closing Mondays if needed',
          'Extended hours on weekends increase bookings'
        ]
      }
    }

    return {
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        stepId,
        suggestions: stepSpecificSuggestions[stepId] || stepSpecificSuggestions['business-info'],
        contextualHelp: context.segmentationPath === 'first_barbershop' 
          ? 'Take your time - this is your foundation for success'
          : 'Leverage your experience to set up quickly',
        confidence: 0.88
      })
    }
  }

  /**
   * Mock API failure responses
   */
  static getAPIFailureResponse() {
    return {
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        fallback: true,
        message: 'Using fallback suggestions'
      })
    }
  }

  /**
   * Mock timeout response
   */
  static getTimeoutResponse() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Request timeout',
            message: 'AI service temporarily unavailable'
          })
        })
      }, 10000) // 10 second timeout
    })
  }

  /**
   * Mock rate limited response
   */
  static getRateLimitedResponse() {
    return {
      status: 429,
      contentType: 'application/json',
      headers: {
        'Retry-After': '60'
      },
      body: JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again in 60 seconds.'
      })
    }
  }
}

/**
 * Helper function to set up route mocking for tests
 */
export function setupSmartSuggestionsRoutes(page, scenario = 'success') {
  const mocks = SmartSuggestionsMocks

  // Business defaults endpoint
  page.route('**/api/suggestions/business-defaults**', route => {
    const url = new URL(route.request().url())
    const businessType = url.searchParams.get('businessType') || 'barbershop'
    const location = url.searchParams.get('location') || 'Los Angeles, CA'
    
    switch (scenario) {
      case 'failure':
        route.fulfill(mocks.getAPIFailureResponse())
        break
      case 'timeout':
        route.fulfill(mocks.getTimeoutResponse())
        break
      case 'rate-limit':
        route.fulfill(mocks.getRateLimitedResponse())
        break
      default:
        route.fulfill(mocks.getBusinessDefaultsSuccess(businessType, location))
    }
  })

  // Pricing suggestions endpoint
  page.route('**/api/suggestions/pricing-suggestions**', route => {
    const url = new URL(route.request().url())
    const businessType = url.searchParams.get('businessType') || 'barbershop'
    const location = url.searchParams.get('location') || 'Los Angeles, CA'
    
    switch (scenario) {
      case 'failure':
        route.fulfill(mocks.getAPIFailureResponse())
        break
      default:
        route.fulfill(mocks.getPricingSuggestionsSuccess(businessType, location))
    }
  })

  // Service recommendations endpoint
  page.route('**/api/suggestions/service-recommendations**', route => {
    const url = new URL(route.request().url())
    const businessType = url.searchParams.get('businessType') || 'barbershop'
    
    switch (scenario) {
      case 'failure':
        route.fulfill(mocks.getAPIFailureResponse())
        break
      default:
        route.fulfill(mocks.getServiceRecommendationsSuccess(businessType))
    }
  })

  // Step suggestions endpoint
  page.route('**/api/suggestions/step-suggestions**', route => {
    const requestData = route.request().postDataJSON?.() || {}
    const stepId = requestData.stepId || 'business-info'
    const formData = requestData.formData || {}
    const context = requestData.context || {}
    
    switch (scenario) {
      case 'failure':
        route.fulfill(mocks.getAPIFailureResponse())
        break
      default:
        route.fulfill(mocks.getStepSuggestionsSuccess(stepId, formData, context))
    }
  })
}

/**
 * Test data generators for various scenarios
 */
export const TestScenarios = {
  
  firstBarbershop: {
    segmentationPath: 'first_barbershop',
    businessType: 'barbershop',
    expectedSteps: ['segmentation', 'business', 'business_planning', 'services', 'staff', 'financial', 'booking', 'branding'],
    expectedHelp: 'Take your time here - this information helps customers find and trust your new business.',
    expectedDefaults: {
      numberOfChairs: 3,
      businessHours: 'beginner-friendly'
    }
  },
  
  addingLocations: {
    segmentationPath: 'adding_locations',
    businessType: 'barbershop',
    expectedSteps: ['segmentation', 'organization', 'location_management', 'services', 'staff', 'financial', 'booking', 'branding'],
    expectedHelp: 'Set up your brand standards here - they\'ll apply to all your locations.',
    expectedDefaults: {
      numberOfChairs: 3,
      businessHours: 'standard'
    }
  },
  
  switchingSystems: {
    segmentationPath: 'switching_systems',
    businessType: 'barbershop',
    expectedSteps: ['segmentation', 'data_import', 'data_verification', 'business', 'services', 'staff', 'financial', 'booking', 'branding'],
    expectedHelp: 'We\'ll help you bring over your existing customers, appointments, and service history.',
    expectedDefaults: {
      preserveExistingData: true
    }
  }
}