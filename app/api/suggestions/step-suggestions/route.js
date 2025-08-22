import { NextResponse } from 'next/server'

// Step-specific contextual suggestions and tips
const stepSuggestions = {
  'business-info': {
    businessName: {
      tips: [
        'Keep it simple and memorable - customers should be able to say it easily',
        'Avoid trendy words that might become outdated',
        'Consider including your location if you plan multiple locations',
        'Check domain availability if you want a website later'
      ],
      suggestions: {
        barbershop: [
          'Classic Cuts',
          'The Barber Shop',
          'Gentlemen\'s Corner',
          'Main Street Barbershop',
          'Traditional Cuts'
        ],
        salon: [
          'Style Studio',
          'Hair Gallery',
          'Bella Beauty',
          'The Style House',
          'Color & Cut Co.'
        ],
        spa: [
          'Serenity Spa',
          'Wellness Center',
          'Pure Bliss Spa',
          'Tranquil Touch',
          'The Relaxation Room'
        ]
      },
      validation: {
        minLength: 2,
        maxLength: 50,
        pattern: /^[a-zA-Z0-9\s&'-\.]+$/,
        blacklist: ['test', 'temp', 'untitled', 'new business']
      }
    },
    businessType: {
      tips: [
        'Your business type affects pricing suggestions and service recommendations',
        'You can always add services from other categories later',
        'Consider your primary focus when choosing'
      ],
      comparisons: {
        barbershop: {
          pros: ['Lower startup costs', 'Faster service turnaround', 'Steady clientele', 'Simpler operations'],
          cons: ['Lower average ticket', 'Limited service variety', 'Male-focused market'],
          averageRevenue: '$135,000/year',
          averageTicket: '$28'
        },
        salon: {
          pros: ['Higher average ticket', 'Diverse services', 'Broader market', 'Premium pricing'],
          cons: ['Higher startup costs', 'Longer appointments', 'More complex operations'],
          averageRevenue: '$275,000/year',
          averageTicket: '$85'
        },
        spa: {
          pros: ['Premium pricing', 'Wellness market growth', 'High margins', 'Relaxing environment'],
          cons: ['Highest startup costs', 'Specialized training', 'Longer sessions'],
          averageRevenue: '$350,000/year',
          averageTicket: '$125'
        }
      }
    },
    location: {
      tips: [
        'Location affects pricing and service suggestions',
        'Urban areas support premium pricing',
        'Suburban areas prefer convenience and value',
        'Rural areas need comprehensive service offerings'
      ],
      factors: [
        'Foot traffic and visibility',
        'Parking availability',
        'Competition density',
        'Demographics and income levels',
        'Rent and operating costs'
      ],
      suggestions: {
        urban: {
          advantages: ['Higher pricing potential', 'Walk-in traffic', 'Diverse clientele'],
          considerations: ['Higher rent', 'More competition', 'Fast-paced environment']
        },
        suburban: {
          advantages: ['Parking availability', 'Family-friendly', 'Community loyalty'],
          considerations: ['Marketing needed', 'Appointment-based', 'Seasonal variations']
        },
        rural: {
          advantages: ['Lower costs', 'Community connections', 'Less competition'],
          considerations: ['Limited market', 'Travel distances', 'Economic fluctuations']
        }
      }
    }
  },
  
  'staff-setup': {
    numberOfChairs: {
      tips: [
        'Start conservative - you can always add chairs as demand grows',
        'Each chair should generate $45,000-65,000 annually',
        'Consider your space, budget, and management capacity',
        'More chairs require more staff and coordination'
      ],
      calculations: {
        revenuePerChair: {
          barbershop: 45000,
          salon: 55000,
          spa: 65000
        },
        optimalUtilization: '75%',
        managementCapacity: {
          1: 'owner-operated',
          2: 'owner + 1 staff',
          3: 'small team',
          4: 'team leader needed',
          '5+': 'management structure required'
        }
      },
      recommendations: {
        first_barbershop: {
          chairs: 2,
          reason: 'Focus on service quality and building clientele'
        },
        adding_locations: {
          chairs: 4,
          reason: 'Leverage experience with proven model'
        },
        switching_systems: {
          chairs: 3,
          reason: 'Maintain current capacity during transition'
        }
      }
    },
    staffing: {
      tips: [
        'Hiring great staff is more important than having many chairs',
        'Independent contractors vs employees have different implications',
        'Consider commission vs hourly vs booth rental models',
        'Plan for growth but start manageable'
      ],
      models: {
        commission: {
          description: 'Staff earn percentage of services they perform',
          pros: ['Motivates performance', 'Lower fixed costs', 'Attracts experienced staff'],
          cons: ['Variable labor costs', 'Scheduling challenges', 'Requires strong sales culture'],
          typical_rate: '40-60% to staff'
        },
        hourly: {
          description: 'Staff earn fixed hourly wage',
          pros: ['Predictable costs', 'Better scheduling control', 'Team cooperation'],
          cons: ['Higher fixed costs', 'Less performance motivation', 'Training investment risk'],
          typical_rate: '$15-25/hour + benefits'
        },
        booth_rental: {
          description: 'Staff rent space and keep all revenue',
          pros: ['No labor costs', 'Entrepreneurial staff', 'Reduced management'],
          cons: ['Less control', 'Variable income', 'Licensing requirements'],
          typical_rate: '$100-300/week rental'
        }
      }
    }
  },

  'services-setup': {
    service_selection: {
      tips: [
        'Start with 3-5 core services and expand based on demand',
        'Price competitively initially, increase as reputation builds',
        'Bundle services for higher average tickets',
        'Consider seasonal service variations'
      ],
      strategies: {
        new_business: {
          approach: 'Focus on mastering essential services',
          recommended_count: '3-4 services',
          pricing_strategy: 'competitive',
          examples: ['Haircut', 'Beard Trim', 'Wash & Style']
        },
        experienced: {
          approach: 'Offer comprehensive menu with specialties',
          recommended_count: '6-8 services', 
          pricing_strategy: 'value-based',
          examples: ['Full service menu', 'Signature specialties', 'Premium add-ons']
        }
      },
      pricing_psychology: [
        'Odd pricing ($29) vs round pricing ($30) affects perception',
        'Anchor high-priced premium service to make others seem reasonable',
        'Bundle pricing increases average ticket size',
        'Menu engineering: highlight profitable services'
      ]
    },
    duration_setting: {
      tips: [
        'Be realistic - rushed services hurt quality and reviews',
        'Include buffer time for cleaning and setup between clients',
        'Consider your skill level and experience',
        'Track actual times and adjust as needed'
      ],
      guidelines: {
        barbershop: {
          'Haircut': { standard: 30, experienced: 25, detailed: 45 },
          'Beard Trim': { standard: 15, experienced: 10, detailed: 20 },
          'Hot Towel Shave': { standard: 45, experienced: 35, detailed: 60 }
        },
        salon: {
          'Cut & Style': { standard: 60, experienced: 45, detailed: 90 },
          'Color': { standard: 120, experienced: 90, detailed: 180 },
          'Blowout': { standard: 30, experienced: 25, detailed: 45 }
        },
        spa: {
          'Facial': { standard: 60, experienced: 60, detailed: 90 },
          'Massage': { standard: 60, experienced: 60, detailed: 90 },
          'Manicure': { standard: 30, experienced: 25, detailed: 45 }
        }
      },
      buffer_recommendations: {
        back_to_back: 5,
        cleaning_time: 10,
        consultation_time: 5,
        checkout_time: 5
      }
    }
  },

  'business-hours': {
    schedule_planning: {
      tips: [
        'Start with shorter hours and expand based on demand',
        'Consider your target market\'s availability',
        'Peak times vary by business type and location',
        'Block time for administrative tasks and breaks'
      ],
      market_patterns: {
        barbershop: {
          peak_times: ['Saturday mornings', 'Friday evenings', 'Lunch hours'],
          slow_times: ['Monday mornings', 'Mid-week afternoons'],
          recommendations: 'Closed Sundays, extended Friday/Saturday hours'
        },
        salon: {
          peak_times: ['Friday evenings', 'Saturday all day', 'Pre-event seasons'],
          slow_times: ['Monday/Tuesday', 'Post-holiday periods'],
          recommendations: 'Closed Mondays, weekend availability crucial'
        },
        spa: {
          peak_times: ['Weekends', 'Evenings after 5pm', 'Holiday seasons'],
          slow_times: ['Early mornings', 'Mid-week'],
          recommendations: 'Flexible scheduling, extended weekend hours'
        }
      },
      work_life_balance: [
        'Avoid 7-day weeks - burnout hurts service quality',
        'Block personal time for business development',
        'Consider alternating early/late days',
        'Plan for holidays and vacation coverage'
      ]
    }
  },

  'booking-rules': {
    policy_setting: {
      tips: [
        'Clear policies prevent misunderstandings and no-shows',
        'Start stricter and relax based on client reliability',
        'Communication is key - explain policies clearly',
        'Be consistent in policy enforcement'
      ],
      best_practices: {
        cancellation_policy: {
          new_clients: '24-48 hours notice required',
          established_clients: '24 hours notice acceptable',
          last_minute: 'Charge partial fee for <4 hour cancellations',
          no_show: 'Full service charge'
        },
        booking_windows: {
          new_business: '2-4 weeks advance booking',
          established: '4-6 weeks advance booking',
          premium_services: '6-8 weeks advance booking'
        },
        deposit_policy: {
          first_time_clients: 'Optional but recommended',
          long_services: 'Required for services >2 hours',
          no_show_history: 'Required for previous no-shows',
          amount: '25-50% of service cost'
        }
      },
      flexibility_balance: [
        'Strict policies reduce no-shows but may deter new clients',
        'Flexible policies improve customer experience but increase risk',
        'Consider loyalty program with relaxed rules for VIP clients',
        'Seasonal adjustments (busier seasons = stricter policies)'
      ]
    }
  }
}

// Dynamic suggestions based on user input patterns
const adaptiveSuggestions = {
  incomplete_fields: {
    businessName: [
      'Popular local name formats in your area',
      'Names that work well with your business type',
      'Consider trademark availability'
    ]
  },
  validation_errors: {
    businessName: {
      too_short: 'Business names should be at least 2 characters long',
      too_long: 'Keep business names under 50 characters for better marketing',
      invalid_chars: 'Use only letters, numbers, spaces, and basic punctuation',
      generic: 'Consider a more unique name to stand out from competitors'
    }
  },
  contextual_help: {
    first_time_users: [
      'Take your time - good planning leads to success',
      'You can always adjust these settings later',
      'Industry standards are provided as starting points'
    ],
    experienced_users: [
      'Leverage your experience with suggested optimizations',
      'Consider how this location differs from previous ones',
      'Advanced features are available in the full dashboard'
    ]
  }
}

export async function POST(request) {
  try {
    const { stepId, formData, userProfile = {} } = await request.json()
    
    // Get base suggestions for the step
    const baseSuggestions = stepSuggestions[stepId] || {}
    
    // Analyze current form data for contextual suggestions
    const contextualTips = generateContextualTips(stepId, formData, userProfile)
    
    // Get field-specific suggestions
    const fieldSuggestions = generateFieldSuggestions(stepId, formData, userProfile)
    
    // Generate validation guidance
    const validationGuidance = generateValidationGuidance(stepId, formData)
    
    // Get smart defaults for empty fields
    const smartDefaults = generateSmartDefaults(stepId, formData, userProfile)
    
    // Generate next-step preparation
    const nextStepPrep = generateNextStepPreparation(stepId, formData)
    
    const response = {
      success: true,
      stepId,
      suggestions: {
        base: baseSuggestions,
        contextual: contextualTips,
        fields: fieldSuggestions,
        validation: validationGuidance,
        defaults: smartDefaults
      },
      tips: contextualTips,
      nextStepPreparation: nextStepPrep,
      adaptiveGuidance: generateAdaptiveGuidance(formData, userProfile),
      confidence: calculateSuggestionConfidence(stepId, formData)
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Step suggestions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function generateContextualTips(stepId, formData, userProfile) {
  const tips = []
  const base = stepSuggestions[stepId] || {}
  
  // Business type specific tips
  if (formData.businessType && base[formData.businessType]) {
    tips.push(...(base[formData.businessType].tips || []))
  }
  
  // Experience level adjustments
  const experienceLevel = userProfile.segmentationPath || 'balanced'
  
  if (experienceLevel === 'first_barbershop') {
    tips.push('As a new business owner, start simple and grow gradually')
    tips.push('Focus on mastering core services before expanding')
  } else if (experienceLevel === 'adding_locations') {
    tips.push('Leverage your existing experience and successful patterns')
    tips.push('Consider how this location might differ from your others')
  } else if (experienceLevel === 'switching_systems') {
    tips.push('Migrate gradually to minimize disruption to existing operations')
    tips.push('Test new processes with a subset of clients first')
  }
  
  return tips
}

function generateFieldSuggestions(stepId, formData, userProfile) {
  const fieldSuggestions = {}
  const base = stepSuggestions[stepId] || {}
  
  Object.keys(formData).forEach(fieldName => {
    const fieldValue = formData[fieldName]
    const fieldConfig = base[fieldName]
    
    if (fieldConfig && fieldConfig.suggestions) {
      // Get business type specific suggestions
      if (formData.businessType && fieldConfig.suggestions[formData.businessType]) {
        fieldSuggestions[fieldName] = fieldConfig.suggestions[formData.businessType]
      } else {
        fieldSuggestions[fieldName] = fieldConfig.suggestions
      }
    }
    
    // Generate dynamic suggestions based on current input
    if (fieldName === 'businessName' && fieldValue && fieldValue.length > 2) {
      fieldSuggestions[fieldName] = generateNameVariations(fieldValue, formData.businessType)
    }
  })
  
  return fieldSuggestions
}

function generateValidationGuidance(stepId, formData) {
  const guidance = {}
  const base = stepSuggestions[stepId] || {}
  
  Object.keys(formData).forEach(fieldName => {
    const fieldValue = formData[fieldName]
    const fieldConfig = base[fieldName]
    
    if (fieldConfig && fieldConfig.validation) {
      const validation = fieldConfig.validation
      const issues = []
      
      // Check length requirements
      if (validation.minLength && fieldValue.length < validation.minLength) {
        issues.push(`Minimum ${validation.minLength} characters required`)
      }
      
      if (validation.maxLength && fieldValue.length > validation.maxLength) {
        issues.push(`Maximum ${validation.maxLength} characters allowed`)
      }
      
      // Check pattern matching
      if (validation.pattern && !validation.pattern.test(fieldValue)) {
        issues.push('Please use only letters, numbers, spaces, and basic punctuation')
      }
      
      // Check blacklist
      if (validation.blacklist && validation.blacklist.some(term => 
        fieldValue.toLowerCase().includes(term.toLowerCase()))) {
        issues.push('Please choose a more specific business name')
      }
      
      if (issues.length > 0) {
        guidance[fieldName] = {
          hasIssues: true,
          issues,
          severity: 'warning'
        }
      } else {
        guidance[fieldName] = {
          hasIssues: false,
          message: 'Looks good!',
          severity: 'success'
        }
      }
    }
  })
  
  return guidance
}

function generateSmartDefaults(stepId, formData, userProfile) {
  const defaults = {}
  const base = stepSuggestions[stepId] || {}
  
  // Business type-based defaults
  if (formData.businessType) {
    if (stepId === 'staff-setup' && base.numberOfChairs?.recommendations) {
      const segmentationPath = userProfile.segmentationPath || 'switching_systems'
      const recommendation = base.numberOfChairs.recommendations[segmentationPath]
      
      if (recommendation) {
        defaults.numberOfChairs = {
          value: recommendation.chairs,
          reason: recommendation.reason,
          confidence: 0.85
        }
      }
    }
  }
  
  // Location-based defaults
  if (formData.location) {
    // Adjust suggestions based on location characteristics
    // This would integrate with location intelligence services
  }
  
  return defaults
}

function generateNextStepPreparation(stepId, formData) {
  const preparation = {}
  
  switch (stepId) {
    case 'business-info':
      preparation.nextStep = 'staff-setup'
      preparation.whatToExpect = 'Set up your staffing and chair configuration'
      preparation.prepTips = [
        'Think about how many clients you want to serve simultaneously',
        'Consider your budget for staff and equipment',
        'Decide on your staffing model (employee vs contractor)'
      ]
      break
      
    case 'staff-setup':
      preparation.nextStep = 'services-setup'
      preparation.whatToExpected = 'Define your service menu and pricing'
      preparation.prepTips = [
        'Research competitor pricing in your area',
        'Think about services you\'re most skilled at',
        'Consider equipment needs for different services'
      ]
      break
      
    case 'services-setup':
      preparation.nextStep = 'business-hours'
      preparation.whatToExpect = 'Set your operating schedule'
      preparation.prepTips = [
        'Think about when your target customers are available',
        'Consider your personal schedule preferences',
        'Plan time for business tasks beyond client services'
      ]
      break
      
    case 'business-hours':
      preparation.nextStep = 'booking-rules'
      preparation.whatToExpect = 'Set policies for bookings and cancellations'
      preparation.prepTips = [
        'Decide how strict you want to be with policies',
        'Think about deposit requirements',
        'Consider your capacity for managing no-shows'
      ]
      break
      
    default:
      preparation.nextStep = 'completion'
      preparation.whatToExpect = 'Review and launch your booking system'
  }
  
  return preparation
}

function generateAdaptiveGuidance(formData, userProfile) {
  const guidance = []
  
  // Experience-level specific guidance
  const experienceLevel = userProfile.segmentationPath
  
  if (experienceLevel === 'first_barbershop') {
    guidance.push({
      type: 'encouragement',
      message: 'You\'re building something great! Take it step by step.',
      icon: '🌟'
    })
  }
  
  // Progress-based guidance
  const completedFields = Object.values(formData).filter(value => value && value.toString().trim()).length
  const totalFields = Object.keys(formData).length
  
  if (completedFields / totalFields > 0.8) {
    guidance.push({
      type: 'progress',
      message: 'Almost done with this section! You\'re doing great.',
      icon: '🎯'
    })
  }
  
  return guidance
}

function generateNameVariations(baseName, businessType) {
  const variations = []
  const suffixes = {
    barbershop: ['Barbershop', 'Barber Co.', 'Cuts', 'Grooming'],
    salon: ['Salon', 'Studio', 'Style House', 'Beauty Bar'],
    spa: ['Spa', 'Wellness', 'Retreat', 'Sanctuary']
  }
  
  const businessSuffixes = suffixes[businessType] || suffixes.barbershop
  
  businessSuffixes.forEach(suffix => {
    if (!baseName.toLowerCase().includes(suffix.toLowerCase())) {
      variations.push(`${baseName} ${suffix}`)
    }
  })
  
  return variations.slice(0, 3) // Limit to 3 suggestions
}

function calculateSuggestionConfidence(stepId, formData) {
  let confidence = 0.8 // Base confidence
  
  // Increase confidence based on data completeness
  const completedFields = Object.values(formData).filter(value => 
    value && value.toString().trim()).length
  const totalFields = Object.keys(formData).length
  
  if (totalFields > 0) {
    confidence += (completedFields / totalFields) * 0.15
  }
  
  // Step-specific confidence adjustments
  if (stepId === 'business-info' && formData.businessType) {
    confidence += 0.05 // Business type helps all other suggestions
  }
  
  return Math.min(confidence, 0.95) // Cap at 95%
}