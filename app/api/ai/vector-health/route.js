import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function GET() {
  try {
    // Dynamic import to avoid build-time issues
    const { 
      checkVectorDatabaseHealth, 
      initializeVectorDatabase,
      searchVectorKnowledge 
    } = await import('@/lib/vector-knowledge')
    
    const startTime = Date.now()
    
    // Check vector database health
    const vectorHealth = await checkVectorDatabaseHealth()
    
    // Initialize if not already done
    if (!vectorHealth.initialized) {
      console.log('🔄 Initializing vector database...')
      try {
        await initializeVectorDatabase()
        const updatedHealth = await checkVectorDatabaseHealth()
        Object.assign(vectorHealth, updatedHealth)
      } catch (initError) {
        vectorHealth.initialization_error = initError.message
      }
    }
    
    // Test search functionality if available
    let searchTest = null
    if (vectorHealth.initialized) {
      try {
        searchTest = await searchVectorKnowledge('test revenue optimization', { limit: 2 })
        vectorHealth.search_functional = true
        vectorHealth.test_results_count = searchTest.results.length
      } catch (searchError) {
        vectorHealth.search_functional = false
        vectorHealth.search_error = searchError.message
      }
    }
    
    // Determine overall status
    let status = 'healthy'
    if (!vectorHealth.initialized) {
      status = 'unhealthy'
    } else if (!vectorHealth.openai_available || !vectorHealth.search_functional) {
      status = 'degraded'
    }
    
    const response = {
      status,
      timestamp: new Date().toISOString(),
      response_time_ms: Date.now() - startTime,
      vector_database: vectorHealth,
      test_search: searchTest ? {
        query: searchTest.query,
        results_found: searchTest.results.length,
        is_fallback: searchTest.fallback || false,
        sample_result: searchTest.results[0] ? {
          category: searchTest.results[0].category,
          similarity: searchTest.results[0].similarity,
          confidence: searchTest.results[0].confidence
        } : null
      } : null,
      recommendations: generateVectorHealthRecommendations(vectorHealth, status)
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
    console.error('Vector database health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString(),
      vector_database: {
        initialized: false,
        error: 'Health check failed'
      }
    }, { status: 503 })
  }
}

// Initialize vector database on demand
export async function POST() {
  try {
    const { initializeVectorDatabase } = await import('@/lib/vector-knowledge')
    
    console.log('🔄 Manual vector database initialization requested...')
    const startTime = Date.now()
    
    const result = await initializeVectorDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Vector database initialized successfully',
      initialization_time_ms: Date.now() - startTime,
      document_count: result.total_documents,
      timestamp: result.created_at
    })
    
  } catch (error) {
    console.error('Manual vector database initialization failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

function generateVectorHealthRecommendations(vectorHealth, status) {
  const recommendations = []
  
  if (status === 'unhealthy') {
    if (!vectorHealth.openai_available) {
      recommendations.push('🔑 OpenAI API key required for vector embeddings - add OPENAI_API_KEY to environment')
    }
    if (!vectorHealth.initialized) {
      recommendations.push('🚀 Vector database needs initialization - call POST /api/ai/vector-health to initialize')
    }
    recommendations.push('⚠️ RAG system will fallback to keyword search until issues are resolved')
  }
  
  if (status === 'degraded') {
    if (!vectorHealth.search_functional) {
      recommendations.push('🔍 Vector search is experiencing issues - check OpenAI API quota and connectivity')
    }
    recommendations.push('🔄 Consider reinitializing vector database if problems persist')
  }
  
  if (status === 'healthy') {
    recommendations.push('✅ Vector database is fully operational')
    recommendations.push(`📚 Knowledge base contains ${vectorHealth.document_count} barbershop business documents`)
    recommendations.push('🎯 RAG system ready for intelligent business coaching')
  }
  
  if (vectorHealth.document_count < 10) {
    recommendations.push('📈 Consider expanding knowledge base with more business content')
  }
  
  return recommendations
}