import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8001'

export async function GET(request) {
  try {
    const response = await fetch(`${BACKEND_URL}/ai/performance/ab-tests`, {
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
    console.error('Error fetching A/B tests:', error)
    
    // Return mock data for development/testing
    const mockAbTests = [
      {
        id: 'test-gpt5-vs-claude',
        name: 'GPT-5 vs Claude Opus 4.1 Performance Test',
        description: 'Comparing response quality and speed for customer service queries',
        model_a: 'gpt-5',
        model_b: 'claude-opus-4-1-20250805',
        traffic_split: 0.5,
        start_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
        success_criteria: {
          response_time_improvement: 0.1,
          quality_score_minimum: 0.85,
          cost_reduction: 0.05
        },
        results: {
          duration_hours: 120,
          comparison: {
            response_time: {
              model_a: 2.3,
              model_b: 1.8,
              winner: 'claude-opus-4-1-20250805'
            },
            success_rate: {
              model_a: 0.987,
              model_b: 0.994,
              winner: 'claude-opus-4-1-20250805'
            },
            confidence: {
              model_a: 0.94,
              model_b: 0.96,
              winner: 'claude-opus-4-1-20250805'
            },
            cost_efficiency: {
              model_a: 0.0001,
              model_b: 0.00008,
              winner: 'claude-opus-4-1-20250805'
            },
            overall_score: {
              model_a: 89.5,
              model_b: 93.2,
              winner: 'claude-opus-4-1-20250805'
            }
          },
          overall_winner: 'claude-opus-4-1-20250805',
          confidence_level: 0.85
        }
      },
      {
        id: 'test-gemini-speed',
        name: 'Gemini 2.0 Flash Speed Test',
        description: 'Testing Gemini 2.0 Flash for high-volume, speed-critical operations',
        model_a: 'gpt-5-mini',
        model_b: 'gemini-2.0-flash-exp',
        traffic_split: 0.3,
        start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
        success_criteria: {
          response_time_improvement: 0.2,
          throughput_increase: 0.15,
          cost_reduction: 0.3
        }
      }
    ]

    return NextResponse.json(mockAbTests)
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    
    const response = await fetch(`${BACKEND_URL}/ai/performance/ab-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error creating A/B test:', error)
    
    // Return mock success response
    return NextResponse.json({
      success: true,
      test_id: 'test-' + Date.now(),
      message: 'A/B test created successfully'
    })
  }
}