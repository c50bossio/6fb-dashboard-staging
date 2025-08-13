import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET() {
  try {
    // Skip health checks during build time
    if (process.env.NODE_ENV === 'build' || process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({
        status: 'build-mode',
        message: 'Health checks disabled during build',
        timestamp: new Date().toISOString()
      })
    }
    
    // Dynamic import to avoid build-time issues
    const { checkAIProvidersHealth } = await import('@/lib/ai-providers')
    
    const startTime = Date.now()
    
    // Check all AI providers
    const aiHealth = await checkAIProvidersHealth()
    
    // Count healthy providers
    const healthyCount = Object.values(aiHealth).filter(p => p.healthy).length
    const availableCount = Object.values(aiHealth).filter(p => p.available).length
    
    // Determine overall AI system status
    let status = 'healthy'
    if (healthyCount === 0) {
      status = 'unhealthy'
    } else if (healthyCount < availableCount) {
      status = 'degraded'
    }
    
    const response = {
      status,
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      providers: aiHealth,
      summary: {
        available: availableCount,
        healthy: healthyCount,
        total: Object.keys(aiHealth).length
      },
      recommendations: generateHealthRecommendations(aiHealth, status)
    }
    
    // Return appropriate HTTP status
    const httpStatus = status === 'unhealthy' ? 503 : status === 'degraded' ? 206 : 200
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
    
  } catch (error) {
    console.error('AI health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      providers: {
        openai: { available: false, healthy: false, error: 'Health check failed' },
        anthropic: { available: false, healthy: false, error: 'Health check failed' },
        gemini: { available: false, healthy: false, error: 'Health check failed' }
      }
    }, { status: 503 })
  }
}

function generateHealthRecommendations(aiHealth, status) {
  const recommendations = []
  
  if (status === 'unhealthy') {
    recommendations.push('🚨 All AI providers are down - check API keys and network connectivity')
    recommendations.push('💡 Verify environment variables are properly set')
    recommendations.push('🔄 System will fallback to intelligent mock responses')
  }
  
  if (status === 'degraded') {
    const failedProviders = Object.entries(aiHealth)
      .filter(([_, health]) => health.available && !health.healthy)
      .map(([name, _]) => name)
    
    if (failedProviders.length > 0) {
      recommendations.push(`⚠️ Some providers failing: ${failedProviders.join(', ')}`)
      recommendations.push('🔍 Check API quotas and rate limits')
    }
  }
  
  if (!aiHealth.openai?.available) {
    recommendations.push('🔑 OpenAI API key not configured - add OPENAI_API_KEY to environment')
  }
  
  if (!aiHealth.anthropic?.available) {
    recommendations.push('🔑 Anthropic API key not configured - add ANTHROPIC_API_KEY to environment')
  }
  
  if (!aiHealth.gemini?.available) {
    recommendations.push('🔑 Google Gemini API key not configured - add GOOGLE_GEMINI_API_KEY to environment')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ All AI providers are healthy and operational')
    recommendations.push('🚀 System ready for intelligent business coaching')
  }
  
  return recommendations
}