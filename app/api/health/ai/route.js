import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const startTime = Date.now()
    const aiHealthStatus = {
      status: 'healthy',
      providers: {},
      timestamp: new Date().toISOString()
    }
    
    // Check OpenAI configuration
    if (process.env.OPENAI_API_KEY) {
      const validKey = process.env.OPENAI_API_KEY.startsWith('sk-')
      aiHealthStatus.providers.openai = {
        status: validKey ? 'configured' : 'error',
        message: validKey ? 'API key configured' : 'Invalid API key format'
      }
    } else {
      aiHealthStatus.providers.openai = {
        status: 'not_configured',
        message: 'OPENAI_API_KEY not set'
      }
    }
    
    // Check Anthropic configuration
    if (process.env.ANTHROPIC_API_KEY) {
      const validKey = process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')
      aiHealthStatus.providers.anthropic = {
        status: validKey ? 'configured' : 'error',
        message: validKey ? 'API key configured' : 'Invalid API key format'
      }
    } else {
      aiHealthStatus.providers.anthropic = {
        status: 'not_configured',
        message: 'ANTHROPIC_API_KEY not set'
      }
    }
    
    // Check Google AI configuration
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      aiHealthStatus.providers.google = {
        status: 'configured',
        message: 'API key configured'
      }
    } else {
      aiHealthStatus.providers.google = {
        status: 'not_configured',
        message: 'GOOGLE_GENERATIVE_AI_API_KEY not set'
      }
    }
    
    // Check AI API endpoint availability
    try {
      const aiResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/ai/v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'health check',
          agent: 'business_coach'
        }),
        signal: AbortSignal.timeout(5000)
      })
      
      aiHealthStatus.endpoint = {
        status: aiResponse.status < 500 ? 'healthy' : 'error',
        response_code: aiResponse.status,
        message: aiResponse.status < 500 ? 'Endpoint accessible' : 'Endpoint returning errors'
      }
    } catch (error) {
      aiHealthStatus.endpoint = {
        status: 'error',
        message: error.message
      }
    }
    
    // Determine overall AI system health
    const configuredProviders = Object.values(aiHealthStatus.providers).filter(p => p.status === 'configured')
    const errorProviders = Object.values(aiHealthStatus.providers).filter(p => p.status === 'error')
    
    if (configuredProviders.length === 0) {
      aiHealthStatus.status = 'unavailable'
      aiHealthStatus.message = 'No AI providers configured'
    } else if (errorProviders.length > 0) {
      aiHealthStatus.status = 'degraded'
      aiHealthStatus.message = 'Some AI providers have configuration errors'
    } else if (aiHealthStatus.endpoint?.status === 'error') {
      aiHealthStatus.status = 'degraded'
      aiHealthStatus.message = 'AI endpoint unavailable'
    }
    
    aiHealthStatus.response_time = Date.now() - startTime
    
    const httpStatus = aiHealthStatus.status === 'unavailable' ? 503 :
                      aiHealthStatus.status === 'degraded' ? 206 : 200
    
    return NextResponse.json(aiHealthStatus, { status: httpStatus })
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}