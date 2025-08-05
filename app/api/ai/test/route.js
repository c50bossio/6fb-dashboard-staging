import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { message, businessContext } = await request.json()
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('🧪 Testing AI integration with message:', message)

    // Import AI providers
    const { 
      callBestAIProvider, 
      classifyBusinessMessage, 
      generateBusinessRecommendations 
    } = await import('@/lib/ai-providers')
    
    // Classify message for optimal AI routing
    const messageType = classifyBusinessMessage(message)
    const testContext = businessContext || {
      shop_name: 'Test Barbershop',
      location: 'Downtown',
      staff_count: 3
    }
    
    console.log(`🤖 Testing AI routing: "${messageType}" message`)
    
    // Call real AI provider
    const aiResponse = await callBestAIProvider(message, messageType, testContext)
    
    // Generate recommendations
    const recommendations = generateBusinessRecommendations(messageType, aiResponse.response)
    
    console.log(`✅ AI test successful via ${aiResponse.provider}`)
    
    return NextResponse.json({
      success: true,
      message_type: messageType,
      provider: aiResponse.provider,
      model: aiResponse.model,
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      recommendations: recommendations,
      tokens_used: aiResponse.tokens_used,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('AI test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      fallback_available: true
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'AI Test Endpoint',
    usage: 'POST with { "message": "your question", "businessContext": {...} }',
    example: {
      message: 'How can I increase revenue at my barbershop?',
      businessContext: {
        shop_name: 'Your Barbershop',
        location: 'Your City',
        staff_count: 3
      }
    }
  })
}