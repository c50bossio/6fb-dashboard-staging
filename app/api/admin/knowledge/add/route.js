import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 })
    }

    // TODO: Implement proper admin role verification
    // For now, this is a placeholder - in production, verify the user has SUPER_ADMIN or KNOWLEDGE_ADMIN role
    
    const body = await request.json()
    const {
      title,
      content,
      domain,
      confidence,
      relevance_tags,
      business_metrics,
      source = 'expert_insights'
    } = body

    // Validate required fields
    if (!title || !content || !domain) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title, content, and domain are required' 
      }, { status: 400 })
    }

    // Call the Enhanced Business Knowledge Service to store
    const response = await fetch('http://localhost:8001/api/v1/knowledge/enhanced/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content,
        summary: content.substring(0, 200) + '...',
        domain,
        knowledge_type: 'best_practice',
        source,
        confidence_score: confidence || 0.9,
        relevance_tags: relevance_tags || [],
        business_metrics: business_metrics || {},
        metadata: {
          added_by: 'admin',
          added_at: new Date().toISOString(),
          global: true,
          system_wide: true
        }
      })
    })

    const result = await response.json()

    if (result.success) {
      return NextResponse.json({
        success: true,
        knowledge_id: result.knowledge_id,
        message: 'Global knowledge added successfully - will benefit all customers'
      })
    } else {
      throw new Error(result.error || 'Failed to add knowledge')
    }

  } catch (error) {
    console.error('Admin knowledge add error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ 
    success: false, 
    error: 'Method not allowed' 
  }, { status: 405 })
}