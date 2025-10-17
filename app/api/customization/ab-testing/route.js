/**
 * A/B Testing API Route Handler
 * 6FB AI Agent System - Advanced Customization Features
 * 
 * Handles A/B testing experiments with statistical analysis
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { ABTestingAPI, AuthenticationService } from '@/lib/api/customization-api'

// GET /api/customization/ab-testing
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sixFigureObjective = searchParams.get('six_figure_objective')
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

    // Build filters
    const filters = { page, limit }
    if (status) filters.status = status
    if (sixFigureObjective) filters.six_figure_objective = sixFigureObjective

    // Get experiments (this would be implemented in ABTestingAPI)
    const result = await ABTestingAPI.getExperiments(filters, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      experiments: result.data,
      pagination: {
        page,
        limit,
        total: result.total || result.data.length,
        totalPages: Math.ceil((result.total || result.data.length) / limit)
      }
    })

  } catch (error) {
    console.error('A/B Testing GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/ab-testing
export async function POST(request) {
  try {
    const body = await request.json()
    
    // Get auth token from headers
    const headersList = headers()
    const authToken = headersList.get('authorization')?.replace('Bearer ', '')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate required fields
    const requiredFields = ['name', 'hypothesis', 'primary_metric', 'variants']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate variants
    if (!Array.isArray(body.variants) || body.variants.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 variants are required for A/B testing' },
        { status: 400 }
      )
    }

    // Validate traffic allocation
    const totalTraffic = body.variants.reduce((sum, variant) => sum + (variant.traffic || 50), 0)
    if (totalTraffic !== 100) {
      return NextResponse.json(
        { error: 'Variant traffic allocation must total 100%' },
        { status: 400 }
      )
    }

    // Validate Six Figure methodology alignment if provided
    if (body.six_figure_objective && !body.expected_revenue_impact) {
      return NextResponse.json(
        { 
          error: 'Expected revenue impact is required when Six Figure objective is specified',
          field: 'expected_revenue_impact'
        },
        { status: 400 }
      )
    }

    // Create experiment
    const result = await ABTestingAPI.createExperiment(body, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'A/B test experiment created successfully',
      experiment: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('A/B Testing POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/customization/ab-testing
export async function PUT(request) {
  try {
    const body = await request.json()
    const { experimentId, action, ...updateData } = body
    
    if (!experimentId) {
      return NextResponse.json(
        { error: 'Experiment ID is required' },
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

    let result

    // Handle different actions
    if (action === 'start') {
      result = await ABTestingAPI.startExperiment(experimentId, authToken)
    } else if (action === 'pause') {
      result = await ABTestingAPI.pauseExperiment(experimentId, authToken)
    } else if (action === 'stop') {
      result = await ABTestingAPI.stopExperiment(experimentId, authToken)
    } else {
      // Regular update
      result = await ABTestingAPI.updateExperiment(experimentId, updateData, authToken)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: `Experiment ${action || 'updated'} successfully`,
      experiment: result.data
    })

  } catch (error) {
    console.error('A/B Testing PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}