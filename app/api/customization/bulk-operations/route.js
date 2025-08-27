/**
 * Bulk Operations API Route Handler
 * 6FB AI Agent System - Enterprise Multi-Location Management
 * 
 * Handles bulk operations across multiple barbershop locations
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { BulkOperationsAPI, AuthenticationService } from '@/lib/api/customization-api'

// GET /api/customization/bulk-operations
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const operationType = searchParams.get('type')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate authentication
    const authResult = await AuthenticationService.validateToken(authToken)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Check if user has enterprise access
    const userRole = await AuthenticationService.getUserRole(authResult.user.id)
    if (!AuthenticationService.hasPermission(userRole, 'editor')) {
      return NextResponse.json(
        { error: 'Insufficient permissions for bulk operations' },
        { status: 403 }
      )
    }

    // Build filters
    const filters = { page, limit }
    if (status) filters.status = status
    if (operationType) filters.type = operationType

    // Get bulk operations history
    const result = await BulkOperationsAPI.getBulkOperations(filters, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      operations: result.data,
      pagination: {
        page,
        limit,
        total: result.total || result.data.length,
        totalPages: Math.ceil((result.total || result.data.length) / limit)
      }
    })

  } catch (error) {
    console.error('Bulk Operations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/bulk-operations/apply-template
export async function POST(request) {
  try {
    const body = await request.json()
    const { templateId, locationIds, options = {} } = body
    
    // Validate required fields
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one location ID is required' },
        { status: 400 }
      )
    }

    // Validate location limit for safety
    if (locationIds.length > 50) {
      return NextResponse.json(
        { error: 'Cannot apply template to more than 50 locations at once' },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Apply template to multiple locations
    const result = await BulkOperationsAPI.applyTemplateToLocations(
      templateId,
      locationIds,
      authToken
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Bulk template application initiated',
      operation_id: result.data.operation_id,
      summary: {
        total_locations: locationIds.length,
        successful: result.data.successful,
        failed: result.data.failed
      },
      details: result.data.results
    }, { status: 202 }) // 202 Accepted for async operation

  } catch (error) {
    console.error('Bulk Template Application error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/bulk-operations/update-settings
export async function POST_UpdateSettings(request) {
  try {
    const body = await request.json()
    const { settings, locationIds, options = {} } = body
    
    // Validate required fields
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      )
    }

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one location ID is required' },
        { status: 400 }
      )
    }

    // Validate settings for Six Figure methodology compliance
    const validationResult = validateSettingsForSixFigureCompliance(settings)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { 
          error: 'Settings validation failed',
          validation_errors: validationResult.errors
        },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Update settings for multiple locations
    const result = await BulkOperationsAPI.updateSettingsForLocations(
      settings,
      locationIds,
      authToken
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Bulk settings update initiated',
      operation_id: result.data.operation_id,
      summary: {
        total_locations: locationIds.length,
        successful: result.data.successful,
        failed: result.data.failed
      },
      details: result.data.results
    }, { status: 202 })

  } catch (error) {
    console.error('Bulk Settings Update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/customization/bulk-operations/locations
export async function GET_Locations(request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeMetrics = searchParams.get('include_metrics') === 'true'
    const status = searchParams.get('status') || 'active'

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all locations for the organization
    const result = await BulkOperationsAPI.getLocations(authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Filter by status if specified
    let locations = result.data
    if (status && status !== 'all') {
      locations = locations.filter(location => location.is_active === (status === 'active'))
    }

    // Add metrics if requested
    if (includeMetrics) {
      locations = await Promise.all(
        locations.map(async (location) => ({
          ...location,
          metrics: await getLocationMetrics(location.id)
        }))
      )
    }

    // Group locations by business type for better organization
    const locationsByType = locations.reduce((groups, location) => {
      const type = location.business_type || 'barbershop'
      if (!groups[type]) groups[type] = []
      groups[type].push(location)
      return groups
    }, {})

    return NextResponse.json({
      locations,
      locations_by_type: locationsByType,
      summary: {
        total: locations.length,
        active: locations.filter(l => l.is_active).length,
        inactive: locations.filter(l => !l.is_active).length,
        business_types: Object.keys(locationsByType)
      }
    })

  } catch (error) {
    console.error('Locations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/customization/bulk-operations/status/[operationId]
export async function GET_OperationStatus(request, { params }) {
  try {
    const operationId = params.operationId
    
    if (!operationId) {
      return NextResponse.json(
        { error: 'Operation ID is required' },
        { status: 400 }
      )
    }

    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get bulk operation status
    const result = await BulkOperationsAPI.getBulkOperationStatus(operationId, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    const operation = result.data
    
    // Calculate progress percentage
    const totalItems = operation.total_items || operation.target_locations?.length || 0
    const completedItems = operation.completed_items || 0
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    // Estimate time remaining for in-progress operations
    let estimatedTimeRemaining = null
    if (operation.status === 'in_progress' && operation.started_at) {
      const elapsedTime = new Date() - new Date(operation.started_at)
      const itemsPerMs = completedItems / elapsedTime
      const remainingItems = totalItems - completedItems
      if (itemsPerMs > 0) {
        estimatedTimeRemaining = Math.round(remainingItems / itemsPerMs / 1000) // seconds
      }
    }

    return NextResponse.json({
      operation: {
        id: operation.id,
        type: operation.type,
        status: operation.status,
        created_at: operation.created_at,
        started_at: operation.started_at,
        completed_at: operation.completed_at,
        progress: {
          total_items: totalItems,
          completed_items: completedItems,
          failed_items: operation.failed_items || 0,
          percentage: progressPercentage,
          estimated_time_remaining: estimatedTimeRemaining
        },
        results: operation.results || {},
        error_details: operation.error_details || {}
      }
    })

  } catch (error) {
    console.error('Bulk Operation Status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Validate settings for Six Figure methodology compliance
 */
function validateSettingsForSixFigureCompliance(settings) {
  const errors = []
  
  // Premium positioning validation
  if (settings.premium_positioning_enabled === false) {
    errors.push('Premium positioning should be enabled to align with Six Figure methodology')
  }
  
  // Pricing strategy validation
  if (settings.value_based_pricing === false) {
    errors.push('Value-based pricing is recommended for Six Figure methodology compliance')
  }
  
  // Client relationship tools validation
  if (settings.client_relationship_tools === false) {
    errors.push('Client relationship tools are essential for Six Figure methodology')
  }
  
  // Color scheme validation for premium brand positioning
  if (settings.primary_color && !isValidPremiumColor(settings.primary_color)) {
    errors.push('Primary color should align with premium brand positioning')
  }
  
  // Service pricing validation
  if (settings.base_service_price && settings.base_service_price < 25) {
    errors.push('Base service pricing appears low for premium positioning (consider $25+ minimum)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate if color aligns with premium brand positioning
 */
function isValidPremiumColor(colorHex) {
  // Define colors that work well for premium barbershop branding
  const premiumColors = [
    '#000000', // Black - classic and premium
    '#1A1A1A', // Dark gray - sophisticated
    '#2D2D2D', // Charcoal - modern premium
    '#B8860B', // Gold - luxury
    '#8B4513', // Brown - classic barbershop
    '#2F4F4F', // Dark slate - professional
    '#191970'  // Navy - trustworthy premium
  ]
  
  return premiumColors.includes(colorHex.toUpperCase()) || 
         isGoldVariant(colorHex) || 
         isDarkNeutral(colorHex)
}

/**
 * Check if color is a gold variant
 */
function isGoldVariant(colorHex) {
  const goldVariants = ['#FFD700', '#DAA520', '#B8860B', '#CD7F32', '#FFA500']
  return goldVariants.includes(colorHex.toUpperCase())
}

/**
 * Check if color is a dark neutral (good for premium branding)
 */
function isDarkNeutral(colorHex) {
  // Convert hex to RGB for analysis
  const r = parseInt(colorHex.slice(1, 3), 16)
  const g = parseInt(colorHex.slice(3, 5), 16)
  const b = parseInt(colorHex.slice(5, 7), 16)
  
  // Check if it's generally dark (all components < 100)
  return r < 100 && g < 100 && b < 100
}

/**
 * Get location-specific metrics
 */
async function getLocationMetrics(locationId) {
  // This would integrate with your analytics system
  // For now, return mock data structure
  return {
    six_figure_score: Math.floor(Math.random() * 40) + 60, // 60-100
    monthly_revenue: Math.floor(Math.random() * 5000) + 15000, // $15k-20k
    client_retention_rate: Math.floor(Math.random() * 20) + 75, // 75-95%
    template_compliance: Math.floor(Math.random() * 30) + 70, // 70-100%
    last_updated: new Date().toISOString()
  }
}