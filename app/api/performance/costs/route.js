import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

export async function GET(request) {
  let timeWindow = '24'
  
  try {
    const { searchParams } = new URL(request.url)
    timeWindow = searchParams.get('timeWindow') || '24'
    
    const response = await fetch(`${BACKEND_URL}/ai/performance/costs?time_window_hours=${timeWindow}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error fetching cost analysis:', error)
    
    // Return mock data for development/testing
    const mockCostAnalysis = {
      time_window_hours: parseInt(timeWindow),
      total_cost: 12.47,
      provider_breakdown: [
        {
          provider: 'openai',
          cost: 7.82,
          requests: 245
        },
        {
          provider: 'anthropic',
          cost: 3.21,
          requests: 156
        },
        {
          provider: 'google',
          cost: 1.44,
          requests: 189
        }
      ],
      model_breakdown: [
        {
          model: 'gpt-5',
          cost: 7.82,
          requests: 245
        },
        {
          model: 'claude-opus-4-1-20250805',
          cost: 3.21,
          requests: 156
        },
        {
          model: 'gemini-2.0-flash-exp',
          cost: 1.44,
          requests: 189
        }
      ],
      hourly_trend: Array.from({ length: 24 }, (_, i) => ({
        hour: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString().slice(0, 13) + ':00:00',
        cost: Math.random() * 0.8 + 0.1
      })),
      optimization_recommendations: [
        {
          id: 'cache-optimization',
          title: 'Implement Response Caching',
          description: 'Cache frequent AI responses to reduce API calls by 15-20%',
          current_cost: 12.47,
          potential_savings: 2.12,
          savings_percentage: 17.0,
          action_required: 'Implement LRU cache for common queries',
          risk_level: 'low',
          estimated_impact: {
            monthly_savings: 63.6,
            performance_impact: 'improved_response_time'
          }
        },
        {
          id: 'model-optimization',
          title: 'Switch to GPT-5 Mini for Simple Tasks',
          description: 'Use GPT-5 Mini for 40% of current GPT-5 requests to reduce costs',
          current_cost: 7.82,
          potential_savings: 1.56,
          savings_percentage: 20.0,
          action_required: 'Implement task complexity detection and routing',
          risk_level: 'medium',
          estimated_impact: {
            monthly_savings: 46.8,
            performance_impact: 'minimal_quality_reduction'
          }
        }
      ]
    }

    return NextResponse.json(mockCostAnalysis)
  }
}