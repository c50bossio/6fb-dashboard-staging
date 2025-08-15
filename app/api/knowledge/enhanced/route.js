import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'
    const query = searchParams.get('query')
    const domains = searchParams.get('domains')?.split(',') || []

    try {
      let knowledgeData

      if (action === 'status') {
        knowledgeData = await getKnowledgeStatus()
      } else if (action === 'search' && query) {
        knowledgeData = await searchKnowledge({
          query,
          domains,
          businessContext: {
            user_id: user.id,
            shop_type: 'barbershop'
          }
        })
      } else if (action === 'insights' && query) {
        knowledgeData = await getContextualInsights({
          query,
          context: {
            user_id: user.id,
            shop_type: 'barbershop'
          }
        })
      } else {
        throw new Error('Invalid action or missing query parameter')
      }
      
      return NextResponse.json({
        success: true,
        ...knowledgeData,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Enhanced knowledge service error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        fallback_data: generateFallbackKnowledgeData(action),
        fallback: true
      })
    }

  } catch (error) {
    console.error('Enhanced knowledge endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ...requestData } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    try {
      let result

      if (action === 'store_knowledge') {
        result = await storeEnhancedKnowledge({
          ...requestData,
          userId: user.id
        })
      } else if (action === 'contextual_search') {
        result = await performContextualSearch({
          ...requestData,
          userId: user.id
        })
      } else {
        throw new Error('Invalid action')
      }
      
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('Enhanced knowledge action error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        fallback: true
      })
    }

  } catch (error) {
    console.error('Enhanced knowledge POST endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getKnowledgeStatus() {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/knowledge/enhanced/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Knowledge status service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to get knowledge status from FastAPI:', error)
    throw new Error(`Knowledge status service unavailable: ${error.message}`)
  }
}

async function searchKnowledge(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/knowledge/enhanced/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: options.query,
        domains: options.domains,
        business_context: options.businessContext
      }),
      timeout: 20000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Knowledge search service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to search knowledge via FastAPI:', error)
    throw new Error(`Knowledge search service unavailable: ${error.message}`)
  }
}

async function getContextualInsights(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/knowledge/enhanced/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: options.query,
        context: options.context
      }),
      timeout: 25000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Contextual insights service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to get contextual insights from FastAPI:', error)
    throw new Error(`Contextual insights service unavailable: ${error.message}`)
  }
}

async function storeEnhancedKnowledge(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/knowledge/enhanced/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(options),
      timeout: 20000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Knowledge storage service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to store knowledge via FastAPI:', error)
    throw new Error(`Knowledge storage service unavailable: ${error.message}`)
  }
}

async function performContextualSearch(options) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/knowledge/enhanced/contextual-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(options),
      timeout: 25000
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'Contextual search service failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to perform contextual search via FastAPI:', error)
    throw new Error(`Contextual search service unavailable: ${error.message}`)
  }
}

function generateFallbackKnowledgeData(action) {
  if (action === 'status') {
    return {
      knowledge_status: {
        total_documents: 25,
        domain_distribution: {
          'barbershop_operations': 8,
          'customer_experience': 6,
          'revenue_optimization': 5,
          'marketing_strategies': 4,
          'staff_management': 2
        },
        average_confidence: 0.84,
        knowledge_graph_entities: 45,
        status: 'operational'
      }
    }
  } else if (action === 'search' || action === 'insights') {
    return {
      relevant_knowledge: [
        {
          title: 'Customer Retention Best Practices',
          content: 'Loyalty programs increase repeat visits by 30%. Personal barber assignments improve satisfaction by 40%.',
          confidence: 0.88,
          source: 'best_practices',
          domain: 'customer_experience'
        },
        {
          title: 'Premium Service Revenue Impact',
          content: 'Premium services have 60% higher margins. Upselling increases average ticket by $15-25.',
          confidence: 0.85,
          source: 'industry_research',
          domain: 'revenue_optimization'
        },
        {
          title: 'Social Media Marketing Strategies',
          content: 'Instagram posts with before/after photos get 3x more engagement. Consistent posting grows following by 25% monthly.',
          confidence: 0.82,
          source: 'best_practices',
          domain: 'marketing_strategies'
        }
      ],
      key_insights: [
        'Focus on customer loyalty programs for retention',
        'Implement upselling training for revenue growth',
        'Increase social media content frequency'
      ],
      context_summary: 'Found 3 relevant knowledge items across multiple business areas with 85% average confidence',
      knowledge_gaps: [],
      total_confidence: 0.85
    }
  }
  
  return { fallback: true, message: 'Service temporarily unavailable' }
}