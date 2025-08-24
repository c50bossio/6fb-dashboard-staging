import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { location } = await request.json()
    
    // Check if Census API is configured
    const censusApiKey = process.env.CENSUS_API_KEY
    
    if (censusApiKey) {
      // Use real Census data
      const demographicData = await fetchCensusData(location, censusApiKey)
      return NextResponse.json({
        success: true,
        ...demographicData,
        source: 'census',
        timestamp: new Date().toISOString()
      })
    }
    
    // Fallback to ZIP code based estimation
    const estimatedData = await getEstimatedDemographics(location)
    
    return NextResponse.json({
      success: true,
      ...estimatedData,
      source: 'estimation',
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Demographics API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

/**
 * Fetch real demographic data from US Census API
 */
async function fetchCensusData(location, apiKey) {
  try {
    // Convert lat/lng to Census tract
    const geoUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates`
    const geoParams = new URLSearchParams({
      x: location.lng,
      y: location.lat,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      format: 'json'
    })
    
    const geoResponse = await fetch(`${geoUrl}?${geoParams}`)
    if (!geoResponse.ok) throw new Error('Geocoding failed')
    
    const geoData = await geoResponse.json()
    const tract = geoData.result?.geographies?.['Census Tracts']?.[0]
    
    if (!tract) {
      throw new Error('Could not determine Census tract')
    }
    
    // Fetch demographic data for the tract
    const dataUrl = 'https://api.census.gov/data/2022/acs/acs5'
    const variables = [
      'B19013_001E', // Median household income
      'B01003_001E', // Total population
      'B01002_001E', // Median age
      'B15003_022E', // Bachelor's degree
      'B15003_023E', // Master's degree
      'B15003_024E', // Professional degree
      'B15003_025E', // Doctorate degree
    ].join(',')
    
    const dataParams = new URLSearchParams({
      get: variables,
      for: `tract:${tract.TRACT}`,
      in: `state:${tract.STATE} county:${tract.COUNTY}`,
      key: apiKey
    })
    
    const dataResponse = await fetch(`${dataUrl}?${dataParams}`)
    if (!dataResponse.ok) throw new Error('Census data fetch failed')
    
    const rawData = await dataResponse.json()
    const data = rawData[1] // First row is headers, second is data
    
    // Parse and structure the data
    const totalPopulation = parseInt(data[1]) || 0
    const medianIncome = parseInt(data[0]) || 70000
    const medianAge = parseFloat(data[2]) || 35
    const educatedPopulation = (parseInt(data[3]) + parseInt(data[4]) + parseInt(data[5]) + parseInt(data[6])) || 0
    
    return {
      medianIncome,
      totalPopulation,
      medianAge,
      populationDensity: calculateDensity(totalPopulation, tract.AREALAND),
      educationLevel: totalPopulation > 0 ? (educatedPopulation / totalPopulation) : 0,
      tractInfo: {
        state: tract.STATE,
        county: tract.COUNTY,
        tract: tract.TRACT
      },
      insights: generateDemographicInsights({
        medianIncome,
        medianAge,
        educationLevel: educatedPopulation / Math.max(totalPopulation, 1)
      })
    }
    
  } catch (error) {
    console.warn('Census API error, using estimation:', error)
    return getEstimatedDemographics(location)
  }
}

/**
 * Get estimated demographics based on ZIP code
 */
async function getEstimatedDemographics(location) {
  // ZIP code based demographic estimates
  const zipEstimates = {
    // High income areas
    '10021': { medianIncome: 115000, medianAge: 42, educationLevel: 0.65 }, // Upper East Side NYC
    '90210': { medianIncome: 105000, medianAge: 45, educationLevel: 0.60 }, // Beverly Hills
    '94301': { medianIncome: 125000, medianAge: 38, educationLevel: 0.70 }, // Palo Alto
    
    // Middle income areas
    '60601': { medianIncome: 75000, medianAge: 35, educationLevel: 0.45 }, // Chicago Loop
    '77001': { medianIncome: 65000, medianAge: 33, educationLevel: 0.40 }, // Houston Downtown
    '85001': { medianIncome: 60000, medianAge: 34, educationLevel: 0.35 }, // Phoenix
    
    // Default
    'default': { medianIncome: 70000, medianAge: 36, educationLevel: 0.35 }
  }
  
  const zipCode = location.zip_code || 'default'
  const estimate = zipEstimates[zipCode] || zipEstimates.default
  
  // Adjust by state if available
  const stateMultipliers = {
    'CA': 1.2,
    'NY': 1.15,
    'TX': 0.95,
    'FL': 0.92,
    'IL': 1.05,
    'PA': 0.98,
    'OH': 0.90,
    'GA': 0.93,
    'NC': 0.91,
    'MI': 0.88
  }
  
  const stateMultiplier = stateMultipliers[location.state] || 1.0
  
  return {
    medianIncome: Math.round(estimate.medianIncome * stateMultiplier),
    medianAge: estimate.medianAge,
    educationLevel: estimate.educationLevel,
    populationDensity: estimatePopulationDensity(location),
    ageDistribution: estimateAgeDistribution(estimate.medianAge),
    insights: generateDemographicInsights({
      medianIncome: estimate.medianIncome * stateMultiplier,
      medianAge: estimate.medianAge,
      educationLevel: estimate.educationLevel
    })
  }
}

/**
 * Calculate population density
 */
function calculateDensity(population, areaInSquareMeters) {
  // Convert to people per square kilometer
  const areaInKm2 = areaInSquareMeters / 1000000
  return Math.round(population / areaInKm2)
}

/**
 * Estimate population density based on location type
 */
function estimatePopulationDensity(location) {
  const city = location.city?.toLowerCase() || ''
  
  if (city.includes('new york') || city.includes('manhattan')) return 'very_high'
  if (city.includes('los angeles') || city.includes('chicago')) return 'high'
  if (city.includes('houston') || city.includes('phoenix')) return 'moderate'
  if (city.includes('rural') || city.includes('county')) return 'low'
  
  return 'moderate'
}

/**
 * Estimate age distribution based on median age
 */
function estimateAgeDistribution(medianAge) {
  if (medianAge < 30) {
    return {
      '18-24': 30,
      '25-34': 35,
      '35-44': 20,
      '45-54': 10,
      '55+': 5
    }
  } else if (medianAge < 40) {
    return {
      '18-24': 20,
      '25-34': 30,
      '35-44': 25,
      '45-54': 15,
      '55+': 10
    }
  } else {
    return {
      '18-24': 15,
      '25-34': 20,
      '35-44': 25,
      '45-54': 20,
      '55+': 20
    }
  }
}

/**
 * Generate insights based on demographic data
 */
function generateDemographicInsights({ medianIncome, medianAge, educationLevel }) {
  const insights = []
  
  // Income-based insights
  if (medianIncome > 90000) {
    insights.push({
      type: 'pricing_power',
      message: 'High income area - premium pricing viable',
      recommendation: 'Position as upscale barbershop with premium services'
    })
  } else if (medianIncome < 50000) {
    insights.push({
      type: 'value_focus',
      message: 'Price-sensitive market',
      recommendation: 'Focus on value packages and loyalty programs'
    })
  }
  
  // Age-based insights
  if (medianAge < 30) {
    insights.push({
      type: 'young_demographic',
      message: 'Younger population - trend-conscious',
      recommendation: 'Emphasize modern styles and social media presence'
    })
  } else if (medianAge > 45) {
    insights.push({
      type: 'mature_demographic',
      message: 'Mature clientele',
      recommendation: 'Focus on traditional services and consistency'
    })
  }
  
  // Education-based insights
  if (educationLevel > 0.5) {
    insights.push({
      type: 'educated_market',
      message: 'Highly educated area',
      recommendation: 'Emphasize professionalism and appointment scheduling'
    })
  }
  
  return insights
}