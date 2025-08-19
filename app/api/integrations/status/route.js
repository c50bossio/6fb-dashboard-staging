import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { integrationConfigService } from '@/services/integration-config-service'

export const runtime = 'nodejs'

/**
 * GET /api/integrations/status
 * Get integration status for the current user's barbershop
 */
export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    // Get integration status
    const status = await integrationConfigService.getIntegrationStatus(
      barbershop.id, 
      user.id
    )

    return NextResponse.json({
      success: true,
      barbershop: {
        id: barbershop.id,
        name: barbershop.name
      },
      ...status
    })

  } catch (error) {
    console.error('Error getting integration status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get integration status'
    }, { status: 500 })
  }
}

/**
 * POST /api/integrations/status
 * Toggle integration on/off or update settings
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    const { action, integration, enabled, settings } = await request.json()

    let result

    switch (action) {
      case 'toggle':
        if (!integration || enabled === undefined) {
          return NextResponse.json({
            success: false,
            error: 'Integration and enabled status required'
          }, { status: 400 })
        }
        
        result = await integrationConfigService.toggleIntegration(
          integration,
          barbershop.id,
          user.id,
          enabled
        )
        break

      case 'save_settings':
        if (!integration || !settings) {
          return NextResponse.json({
            success: false,
            error: 'Integration and settings required'
          }, { status: 400 })
        }
        
        result = await integrationConfigService.saveIntegrationSettings(
          barbershop.id,
          user.id,
          integration,
          settings
        )
        break

      case 'test':
        if (!integration) {
          return NextResponse.json({
            success: false,
            error: 'Integration required'
          }, { status: 400 })
        }
        
        result = await integrationConfigService.testIntegration(
          integration,
          barbershop.id,
          user.id
        )
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: toggle, save_settings, or test'
        }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error managing integration:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to manage integration'
    }, { status: 500 })
  }
}

/**
 * PUT /api/integrations/status
 * Get recommendations for integrations
 */
export async function PUT(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get user's barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (shopError || !barbershop) {
      return NextResponse.json({
        success: false,
        error: 'Barbershop not found'
      }, { status: 404 })
    }

    // Get recommendations
    const recommendations = await integrationConfigService.getRecommendations(barbershop.id)

    return NextResponse.json(recommendations)

  } catch (error) {
    console.error('Error getting recommendations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get recommendations'
    }, { status: 500 })
  }
}