import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, testVectorSearch = true } = await request.json()
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('🧪 Testing complete RAG system integration...')

    const testResults = {
      timestamp: new Date().toISOString(),
      query: message,
      tests: {}
    }

    // Test 1: Vector Database Initialization
    try {
      const { checkVectorDatabaseHealth, initializeVectorDatabase } = await import('@/lib/vector-knowledge')
      
      let vectorHealth = await checkVectorDatabaseHealth()
      if (!vectorHealth.initialized) {
        console.log('🔄 Initializing vector database for test...')
        await initializeVectorDatabase()
        vectorHealth = await checkVectorDatabaseHealth()
      }
      
      testResults.tests.vector_database = {
        status: 'passed',
        initialized: vectorHealth.initialized,
        document_count: vectorHealth.document_count,
        openai_available: vectorHealth.openai_available
      }
      
    } catch (error) {
      testResults.tests.vector_database = {
        status: 'failed',
        error: error.message
      }
    }

    // Test 2: Vector Search Functionality
    if (testVectorSearch) {
      try {
        const { searchVectorKnowledge } = await import('@/lib/vector-knowledge')
        
        const searchResults = await searchVectorKnowledge(message, {
          limit: 3,
          minSimilarity: 0.3 // Lower threshold for testing
        })
        
        testResults.tests.vector_search = {
          status: 'passed',
          results_found: searchResults.results.length,
          is_fallback: searchResults.fallback || false,
          categories_searched: searchResults.searchMetadata?.categories_searched || [],
          sample_results: searchResults.results.slice(0, 2).map(r => ({
            category: r.category,
            similarity: r.similarity,
            confidence: r.confidence
          }))
        }
        
      } catch (error) {
        testResults.tests.vector_search = {
          status: 'failed',
          error: error.message
        }
      }
    }

    // Test 3: Enhanced Context Generation
    try {
      const { getEnhancedContext } = await import('@/lib/vector-knowledge')
      
      const context = await getEnhancedContext(message, {
        shop_name: 'Test RAG Shop',
        location: 'Test City',
        staff_count: 3
      })
      
      testResults.tests.enhanced_context = {
        status: 'passed',
        knowledge_items: context.relevantKnowledge.length,
        categories_found: [...new Set(context.relevantKnowledge.map(k => k.category))],
        recommendations_count: context.recommendations.length,
        has_business_context: !!context.businessContext
      }
      
    } catch (error) {
      testResults.tests.enhanced_context = {
        status: 'failed',
        error: error.message
      }
    }

    // Test 4: AI Provider Integration with RAG
    try {
      const { 
        callBestAIProvider, 
        classifyBusinessMessage, 
        generateBusinessRecommendations 
      } = await import('@/lib/ai-providers')
      
      const messageType = classifyBusinessMessage(message)
      const aiResponse = await callBestAIProvider(message, messageType, {
        shop_name: 'Test RAG Shop',
        location: 'Test City',
        staff_count: 3
      })
      
      testResults.tests.ai_integration = {
        status: 'passed',
        provider: aiResponse.provider,
        model: aiResponse.model,
        message_type: messageType,
        confidence: aiResponse.confidence,
        response_length: aiResponse.response.length,
        tokens_used: aiResponse.tokens_used
      }
      
    } catch (error) {
      testResults.tests.ai_integration = {
        status: 'failed',
        error: error.message
      }
    }

    // Calculate overall test results
    const testCount = Object.keys(testResults.tests).length
    const passedCount = Object.values(testResults.tests).filter(t => t.status === 'passed').length
    const failedCount = testCount - passedCount
    
    testResults.summary = {
      total_tests: testCount,
      passed: passedCount,
      failed: failedCount,
      success_rate: Math.round((passedCount / testCount) * 100),
      overall_status: failedCount === 0 ? 'all_passed' : 
                     passedCount > failedCount ? 'mostly_passed' : 'mostly_failed'
    }

    console.log(`✅ RAG system test completed: ${passedCount}/${testCount} tests passed`)

    return NextResponse.json(testResults)

  } catch (error) {
    console.error('RAG system test failed:', error)
    
    return NextResponse.json({
      error: error.message,
      timestamp: new Date().toISOString(),
      summary: {
        overall_status: 'error',
        total_tests: 0,
        passed: 0,
        failed: 1
      }
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'RAG System Test Endpoint',
    usage: 'POST with { "message": "your test query", "testVectorSearch": true }',
    example: {
      message: 'How can I improve customer retention?',
      testVectorSearch: true
    },
    tests_performed: [
      'Vector database initialization',
      'Vector search functionality',
      'Enhanced context generation',
      'AI provider integration with RAG'
    ]
  })
}