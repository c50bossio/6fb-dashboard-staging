/**
 * Templates API Route Handler
 * 6FB AI Agent System - Advanced Customization Features
 * 
 * Handles CRUD operations for templates with Six Figure Barber methodology validation
 */

import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { TemplateAPI, AuthenticationService } from '@/lib/api/customization-api'

// GET /api/customization/templates
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const sixFigureAlignment = searchParams.get('six_figure_alignment')
    const pricingTier = searchParams.get('pricing_tier')
    const status = searchParams.get('status')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20

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
    const filters = {}
    if (category) filters.category = category
    if (sixFigureAlignment) filters.sixFigureAlignment = sixFigureAlignment
    if (pricingTier) filters.pricing_tier = pricingTier
    if (status) filters.status = status

    // Add pagination
    filters.page = page
    filters.limit = limit
    filters.sortBy = sortBy
    filters.sortOrder = sortOrder

    // Get templates
    const result = await TemplateAPI.getTemplates(filters)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Add metadata for pagination
    const response = {
      templates: result.data,
      pagination: {
        page,
        limit,
        total: result.total || result.data.length,
        totalPages: Math.ceil((result.total || result.data.length) / limit)
      },
      filters: {
        category,
        six_figure_alignment: sixFigureAlignment,
        pricing_tier: pricingTier,
        status,
        sort_by: sortBy,
        sort_order: sortOrder
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/customization/templates
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
    const requiredFields = [
      'name', 'description', 'six_figure_alignment',
      'positioning_strategy', 'value_proposition', 'pricing_strategy'
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate Six Figure Barber methodology alignment
    if (!body.target_revenue_impact || body.target_revenue_impact < 1.1) {
      return NextResponse.json(
        { 
          error: 'Template must target at least 10% revenue impact to align with Six Figure goals',
          field: 'target_revenue_impact',
          minimum: 1.1
        },
        { status: 400 }
      )
    }

    // Create template
    const result = await TemplateAPI.createTemplate(body, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Template created successfully',
      template: result.data
    }, { status: 201 })

  } catch (error) {
    console.error('Templates POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/customization/templates
export async function PUT(request) {
  try {
    const body = await request.json()
    const { templateId, ...updateData } = body
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
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

    // Update template
    const result = await TemplateAPI.updateTemplate(templateId, updateData, authToken)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Template updated successfully',
      template: result.data
    })

  } catch (error) {
    console.error('Templates PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/customization/templates/[id]
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('id')
    
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
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

    // Validate authentication and permissions
    const authResult = await AuthenticationService.validateToken(authToken)
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userRole = await AuthenticationService.getUserRole(authResult.user.id)
    if (!AuthenticationService.hasPermission(userRole, 'editor')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Soft delete template (archive instead of hard delete)
    const result = await TemplateAPI.updateTemplate(
      templateId, 
      { status: 'archived' }, 
      authToken
    )

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'Template archived successfully'
    })

  } catch (error) {
    console.error('Templates DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}