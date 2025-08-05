import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id') || 'demo-barbershop-001'
    
    // Call Python FastAPI backend for business recommendations
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001'
    const response = await fetch(`${backendUrl}/api/business-recommendations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id: barbershopId,
        analysis_type: 'comprehensive'
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const recommendationsData = await response.json()

    return NextResponse.json({
      success: true,
      ...recommendationsData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Business recommendations API error:', error)
    
    // Fallback response
    return NextResponse.json({
      success: false,
      error: 'Unable to generate recommendations at this time',
      fallback_recommendations: {
        barbershop_id: 'fallback',
        generated_at: new Date().toISOString(),
        recommendations: [
          {
            category: 'customer_experience',
            title: 'Focus on Customer Service Excellence',
            description: 'Prioritize exceptional customer service to build loyalty and generate referrals.',
            impact_score: 0.75,
            confidence: 0.70,
            estimated_monthly_value: 200,
            specific_actions: [
              'Greet every customer personally upon arrival',
              'Follow up with customers after their service',
              'Ask for feedback and implement improvements'
            ]
          }
        ],
        confidence_score: 0.65,
        message: 'Basic recommendations provided - AI system temporarily unavailable'
      }
    }, { status: 200 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { barbershop_id, analysis_type = 'comprehensive' } = body
    
    if (!barbershop_id) {
      return NextResponse.json(
        { success: false, error: 'barbershop_id is required' },
        { status: 400 }
      )
    }

    // Call Python FastAPI backend for business recommendations
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://localhost:8001'
    const response = await fetch(`${backendUrl}/api/business-recommendations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        barbershop_id,
        analysis_type,
        enhanced_ai: true
      }),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const recommendationsData = await response.json()

    return NextResponse.json({
      success: true,
      ...recommendationsData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Business recommendations API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Unable to generate recommendations',
      details: error.message
    }, { status: 500 })
  }
}