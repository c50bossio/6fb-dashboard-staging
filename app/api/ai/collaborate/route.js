import { NextResponse } from 'next/server'
import { multiAgentCollaboration } from '../../../../services/multi-agent-collaboration-service'

/**
 * Multi-Agent Collaboration API Endpoint
 * Handles complex queries requiring multiple agent perspectives
 */
export async function POST(request) {
  try {
    const { 
      query, 
      userId = 'demo-user',
      barbershopId = 'demo-shop',
      context = {},
      forceCollaboration = false
    } = await request.json()

    if (!query?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Query is required'
      }, { status: 400 })
    }

    console.log('AI Collaboration Debug:', {
      query: query.substring(0, 100),
      userId,
      forceCollaboration
    });

    const businessData = await fetchBusinessData(barbershopId)

    const complexityAnalysis = multiAgentCollaboration.analyzeQueryComplexity(query)
    
    if (!complexityAnalysis.requiresCollaboration && !forceCollaboration) {
      return NextResponse.json({
        success: true,
        collaborationRequired: false,
        complexity: complexityAnalysis,
        message: 'Single agent can handle this query effectively'
      })
    }

    const collaborationResult = await multiAgentCollaboration.orchestrateCollaboration(
      query,
      context,
      businessData
    )

    if (!collaborationResult) {
      return NextResponse.json({
        success: false,
        error: 'Collaboration failed to produce results'
      }, { status: 500 })
    }

    const response = {
      success: true,
      collaborationRequired: true,
      collaborationId: collaborationResult.collaborationId,
      pattern: collaborationResult.pattern,
      complexity: collaborationResult.complexity,
      agents: collaborationResult.agents,
      synthesis: collaborationResult.synthesis,
      confidence: collaborationResult.confidence,
      duration: collaborationResult.duration,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Multi-agent collaboration error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process collaborative query',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check collaboration status and history
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    let response

    switch (action) {
      case 'active':
        response = {
          success: true,
          active: multiAgentCollaboration.getActiveCollaborations(),
          count: multiAgentCollaboration.getActiveCollaborations().length
        }
        break

      case 'history':
        const limit = parseInt(searchParams.get('limit') || '10')
        response = {
          success: true,
          history: multiAgentCollaboration.getCollaborationHistory(limit),
          total: multiAgentCollaboration.getCollaborationHistory(100).length
        }
        break

      case 'patterns':
        response = {
          success: true,
          patterns: multiAgentCollaboration.collaborationPatterns,
          description: 'Available collaboration patterns for different query types'
        }
        break

      default:
        response = {
          success: true,
          status: 'Multi-agent collaboration service is active',
          capabilities: {
            patterns: Object.keys(multiAgentCollaboration.collaborationPatterns),
            agents: Object.keys(multiAgentCollaboration.agents),
            complexityLevels: ['low', 'medium', 'high']
          }
        }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Collaboration status error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve collaboration status',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Fetch business data for context
 */
async function fetchBusinessData(barbershopId) {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:9999'
  
  try {
    const analyticsRes = await fetch(`${baseUrl}/api/analytics/live-data?barbershop_id=${barbershopId}`)
    const analyticsData = await analyticsRes.json()
    
    return {
      revenue: {
        daily: analyticsData.data?.daily_revenue || 420,
        monthly: analyticsData.data?.monthly_revenue || 8500,
        margin: 65,
        average: 45
      },
      customers: {
        total: analyticsData.data?.total_customers || 150,
        retention: analyticsData.data?.customer_retention_rate || 68,
        cac: 25
      },
      operations: {
        utilization: analyticsData.data?.utilization_rate || 75,
        appointments: analyticsData.data?.daily_bookings || 12,
        efficiency: 82
      },
      health: {
        score: 78,
        trend: 'improving'
      },
      growth: {
        rate: 12,
        momentum: 'positive'
      },
      opportunities: {
        score: 85,
        count: 5
      }
    }
  } catch (error) {
    console.error('Failed to fetch business data:', error)
    
    return {
      revenue: { daily: 400, monthly: 8000, margin: 60, average: 40 },
      customers: { total: 100, retention: 65, cac: 30 },
      operations: { utilization: 70, appointments: 10, efficiency: 75 },
      health: { score: 70, trend: 'stable' },
      growth: { rate: 8, momentum: 'neutral' },
      opportunities: { score: 70, count: 3 }
    }
  }
}