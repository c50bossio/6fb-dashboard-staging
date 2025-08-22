import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Industry benchmarks database (would typically be stored in database)
const industryBenchmarks = {
  barbershop: {
    avgChairs: { min: 2, max: 8, optimal: 3 },
    avgRevenue: { perChair: 45000, total: 135000 },
    peakHours: ['16:00-19:00', '10:00-12:00'],
    popularServices: ['Haircut', 'Beard Trim', 'Wash & Style'],
    typicalPricing: { haircut: 25, beard: 15, combo: 35 }
  },
  salon: {
    avgChairs: { min: 3, max: 12, optimal: 5 },
    avgRevenue: { perChair: 55000, total: 275000 },
    peakHours: ['14:00-17:00', '18:00-20:00'],
    popularServices: ['Cut & Style', 'Color', 'Highlights'],
    typicalPricing: { cut: 45, color: 85, highlights: 120 }
  },
  spa: {
    avgChairs: { min: 2, max: 10, optimal: 4 },
    avgRevenue: { perChair: 65000, total: 260000 },
    peakHours: ['11:00-14:00', '15:00-18:00'],
    popularServices: ['Facial', 'Massage', 'Body Treatment'],
    typicalPricing: { facial: 75, massage: 85, body: 120 }
  }
}

// Location-based adjustments (would integrate with real location data)
const locationMultipliers = {
  'urban': { pricing: 1.3, chairs: 1.2 },
  'suburban': { pricing: 1.0, chairs: 1.0 },
  'rural': { pricing: 0.8, chairs: 0.9 },
  'high-end': { pricing: 1.6, chairs: 1.1 },
  'budget': { pricing: 0.7, chairs: 1.0 }
}

export async function POST(request) {
  try {
    const { businessType, location, segmentationPath } = await request.json()
    
    // Get base benchmarks
    const benchmarks = industryBenchmarks[businessType] || industryBenchmarks.barbershop
    
    // Determine location category (simplified - would use actual location API)
    const locationCategory = determineLocationCategory(location)
    const multipliers = locationMultipliers[locationCategory] || locationMultipliers.suburban
    
    // Apply segmentation intelligence
    let chairRecommendation = benchmarks.avgChairs.optimal
    let serviceRecommendations = [...benchmarks.popularServices]
    
    switch (segmentationPath) {
      case 'first_barbershop':
        // Conservative recommendations for new businesses
        chairRecommendation = Math.max(2, benchmarks.avgChairs.min)
        serviceRecommendations = serviceRecommendations.slice(0, 3) // Essential services only
        break
      
      case 'adding_locations':
        // Scale recommendations for expansion
        chairRecommendation = Math.round(benchmarks.avgChairs.optimal * 1.2)
        serviceRecommendations = [...serviceRecommendations, 'Premium Service', 'Express Service']
        break
        
      case 'switching_systems':
        // Maintain current scale assumptions
        chairRecommendation = benchmarks.avgChairs.optimal
        break
    }
    
    // Apply location adjustments
    chairRecommendation = Math.round(chairRecommendation * multipliers.chairs)
    
    // Generate pricing recommendations
    const pricingRecommendations = {}
    Object.entries(benchmarks.typicalPricing).forEach(([service, basePrice]) => {
      pricingRecommendations[service] = {
        min: Math.round(basePrice * 0.8 * multipliers.pricing),
        recommended: Math.round(basePrice * multipliers.pricing),
        max: Math.round(basePrice * 1.3 * multipliers.pricing)
      }
    })
    
    // Generate business hours based on business type and location
    const businessHours = generateSmartBusinessHours(businessType, locationCategory, segmentationPath)
    
    // Create AI-powered insights
    const insights = generateAIInsights(businessType, segmentationPath, locationCategory, chairRecommendation)
    
    const response = {
      success: true,
      defaults: {
        numberOfChairs: chairRecommendation,
        businessHours: businessHours,
        services: generateServiceDefaults(businessType, segmentationPath),
        pricing: pricingRecommendations,
        bookingRules: generateBookingRules(segmentationPath),
        amenities: generateAmenityRecommendations(businessType, locationCategory)
      },
      insights: insights,
      reasoning: {
        chairCount: `${chairRecommendation} chairs recommended for ${segmentationPath} ${businessType} in ${locationCategory} area`,
        pricing: `Prices adjusted ${Math.round((multipliers.pricing - 1) * 100)}% for ${locationCategory} market`,
        services: `${serviceRecommendations.length} essential services recommended for ${segmentationPath} path`
      },
      confidence: calculateConfidence(businessType, location, segmentationPath),
      marketData: {
        category: locationCategory,
        benchmarks: benchmarks,
        multipliers: multipliers
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Smart suggestions error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

function determineLocationCategory(location) {
  if (!location) return 'suburban'
  
  const locationStr = location.toLowerCase()
  
  // Urban indicators
  if (locationStr.includes('manhattan') || locationStr.includes('downtown') || 
      locationStr.includes('city center') || locationStr.includes('urban')) {
    return 'urban'
  }
  
  // High-end indicators  
  if (locationStr.includes('beverly hills') || locationStr.includes('upper east') ||
      locationStr.includes('soho') || locationStr.includes('tribeca')) {
    return 'high-end'
  }
  
  // Rural indicators
  if (locationStr.includes('rural') || locationStr.includes('county') ||
      locationStr.includes('farm') || locationStr.includes('country')) {
    return 'rural'
  }
  
  return 'suburban' // Default
}

function generateSmartBusinessHours(businessType, locationCategory, segmentationPath) {
  const baseHours = {
    barbershop: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { closed: true }
    },
    salon: {
      monday: { closed: true },
      tuesday: { open: '10:00', close: '19:00', closed: false },
      wednesday: { open: '10:00', close: '19:00', closed: false },
      thursday: { open: '10:00', close: '19:00', closed: false },
      friday: { open: '10:00', close: '19:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '11:00', close: '16:00', closed: false }
    }
  }
  
  let hours = baseHours[businessType] || baseHours.barbershop
  
  // Adjust for location and segmentation
  if (locationCategory === 'urban') {
    // Urban businesses often open earlier and close later
    Object.keys(hours).forEach(day => {
      if (!hours[day].closed) {
        hours[day].open = '08:00'
        hours[day].close = hours[day].close === '18:00' ? '19:00' : hours[day].close
      }
    })
  }
  
  if (segmentationPath === 'first_barbershop') {
    // New businesses might start with shorter hours
    Object.keys(hours).forEach(day => {
      if (!hours[day].closed) {
        hours[day].close = hours[day].close.replace('19:00', '18:00').replace('17:00', '16:00')
      }
    })
  }
  
  return hours
}

function generateServiceDefaults(businessType, segmentationPath) {
  const services = {
    barbershop: [
      { name: 'Classic Haircut', duration: 30, category: 'haircut' },
      { name: 'Beard Trim', duration: 15, category: 'grooming' },
      { name: 'Haircut + Beard', duration: 45, category: 'combo' }
    ],
    salon: [
      { name: 'Cut & Style', duration: 60, category: 'haircut' },
      { name: 'Color Touch-up', duration: 90, category: 'color' },
      { name: 'Blowout', duration: 30, category: 'styling' }
    ],
    spa: [
      { name: 'Classic Facial', duration: 60, category: 'skincare' },
      { name: 'Relaxation Massage', duration: 60, category: 'wellness' },
      { name: 'Express Manicure', duration: 30, category: 'nails' }
    ]
  }
  
  let selectedServices = services[businessType] || services.barbershop
  
  if (segmentationPath === 'first_barbershop') {
    // Start with fewer services for new businesses
    selectedServices = selectedServices.slice(0, 3)
  } else if (segmentationPath === 'adding_locations') {
    // Add premium services for expansion
    selectedServices.push({
      name: 'Premium Service',
      duration: 60,
      category: 'premium'
    })
  }
  
  return selectedServices
}

function generateBookingRules(segmentationPath) {
  const baseRules = {
    advanceBookingDays: 30,
    cancellationHours: 24,
    bufferMinutes: 15,
    allowOnlineBooking: true,
    requireDeposit: false
  }
  
  switch (segmentationPath) {
    case 'first_barbershop':
      return {
        ...baseRules,
        advanceBookingDays: 14, // Shorter booking window for new businesses
        requireDeposit: false
      }
    
    case 'adding_locations':
      return {
        ...baseRules,
        advanceBookingDays: 60, // Longer booking window for established businesses
        requireDeposit: true,
        depositPercentage: 20,
        allowWaitlist: true
      }
      
    case 'switching_systems':
      return {
        ...baseRules,
        advanceBookingDays: 45,
        cancellationHours: 48 // More conservative for migration
      }
      
    default:
      return baseRules
  }
}

function generateAmenityRecommendations(businessType, locationCategory) {
  const amenities = {
    barbershop: ['wifi', 'parking', 'wheelchair_access', 'music', 'beverages'],
    salon: ['wifi', 'parking', 'wheelchair_access', 'magazines', 'beverages', 'retail'],
    spa: ['wifi', 'parking', 'wheelchair_access', 'music', 'relaxation_area', 'herbal_tea']
  }
  
  let recommended = amenities[businessType] || amenities.barbershop
  
  // High-end locations get premium amenities
  if (locationCategory === 'high-end') {
    recommended.push('valet_parking', 'concierge', 'premium_products')
  }
  
  return recommended
}

function generateAIInsights(businessType, segmentationPath, locationCategory, chairCount) {
  const insights = []
  
  // Chair optimization insight
  if (chairCount <= 2) {
    insights.push({
      type: 'optimization',
      title: 'Chair Capacity',
      message: `Starting with ${chairCount} chairs allows for personal service while keeping costs manageable.`,
      impact: 'medium',
      actionable: true,
      suggestion: 'Plan to add chairs as demand grows - optimal is 3-4 chairs for most barbershops.'
    })
  }
  
  // Segmentation-specific insights
  if (segmentationPath === 'first_barbershop') {
    insights.push({
      type: 'business_growth',
      title: 'New Business Success Tips',
      message: 'Focus on building a loyal customer base with consistent quality before expanding services.',
      impact: 'high',
      actionable: true,
      suggestion: 'Start with 3 core services and add specialty services after 3-6 months.'
    })
  }
  
  // Location-specific insights
  if (locationCategory === 'urban') {
    insights.push({
      type: 'market_opportunity',
      title: 'Urban Market Advantage',
      message: 'Urban locations can support premium pricing and extended hours due to higher foot traffic.',
      impact: 'high',
      actionable: true,
      suggestion: 'Consider early morning (7-9am) and evening (6-8pm) slots for busy professionals.'
    })
  }
  
  return insights
}

function calculateConfidence(businessType, location, segmentationPath) {
  let confidence = 0.8 // Base confidence
  
  // Adjust based on data availability
  if (businessType === 'barbershop') confidence += 0.1 // More data available
  if (location) confidence += 0.05 // Location data helps
  if (segmentationPath) confidence += 0.05 // Segmentation adds context
  
  return Math.min(confidence, 0.95) // Cap at 95%
}