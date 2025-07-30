/**
 * Simplified Integration Data API Route for Vercel
 * Returns mock data for staging deployment
 */

import { NextResponse } from 'next/server'

/**
 * GET /api/integrations/data
 * Get mock integration data for staging
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershopId') || 'default'
    
    // Return mock data for staging
    const response = {
      success: true,
      barbershopId,
      message: 'Mock integration data for staging',
      integrations: [
        {
          id: 'mock-integration-1',
          platform: 'google-calendar',
          lastSyncAt: new Date().toISOString(),
          nextSyncAt: new Date(Date.now() + 3600000).toISOString(),
          lastSyncError: null,
          metadata: {
            calendar_id: 'primary',
            sync_enabled: true
          }
        }
      ],
      appointments: {
        total: 3,
        data: [
          {
            id: 'mock-appt-1',
            title: 'Haircut - John Doe',
            startTime: new Date(Date.now() + 86400000).toISOString(),
            endTime: new Date(Date.now() + 89400000).toISOString(),
            status: 'confirmed',
            platform: 'google-calendar'
          },
          {
            id: 'mock-appt-2', 
            title: 'Beard Trim - Jane Smith',
            startTime: new Date(Date.now() + 172800000).toISOString(),
            endTime: new Date(Date.now() + 175800000).toISOString(),
            status: 'confirmed',
            platform: 'google-calendar'
          }
        ],
        summary: 'Sample booking data for testing',
        platforms: {
          'google-calendar': 2
        }
      },
      context: {
        message: 'AI context unavailable in staging mode',
        recommendations: []
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error in mock integration API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Mock API error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations/data
 * Mock sync endpoint
 */
export async function POST(request) {
  try {
    const { barbershopId } = await request.json()
    
    return NextResponse.json({
      success: true,
      barbershopId: barbershopId || 'default',
      message: 'Mock sync completed',
      syncResults: [
        {
          integrationId: 'mock-integration-1',
          platform: 'google-calendar',
          success: true,
          result: { synced: 2, updated: 1 },
          error: null
        }
      ],
      summary: {
        totalIntegrations: 1,
        successfulSyncs: 1,
        failedSyncs: 0
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Mock sync error',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/integrations/data  
 * Mock update endpoint
 */
export async function PUT(request) {
  try {
    const { barbershopId, action } = await request.json()
    
    return NextResponse.json({
      success: true,
      barbershopId: barbershopId || 'default',
      action,
      message: 'Mock update completed',
      result: {
        updated: true,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Mock update error', 
        details: error.message
      },
      { status: 500 }
    )
  }
}