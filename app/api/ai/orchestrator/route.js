import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, sessionId, businessContext } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Generate session ID if not provided
    const currentSession = sessionId || `session_${Date.now()}_${user.id}`

    try {
      // Call Python AI Orchestrator Service
      const orchestratorResponse = await callPythonAIOrchestrator(message, currentSession, businessContext)
      
      // Store conversation in Supabase
      await storeConversation(supabase, user.id, currentSession, message, orchestratorResponse)
      
      return NextResponse.json({
        success: true,
        response: orchestratorResponse.response,
        sessionId: currentSession,
        provider: orchestratorResponse.provider,
        confidence: orchestratorResponse.confidence,
        messageType: orchestratorResponse.message_type,
        selectedProvider: orchestratorResponse.selected_provider,
        contextualInsights: orchestratorResponse.contextual_insights,
        knowledgeEnhanced: orchestratorResponse.knowledge_enhanced,
        timestamp: orchestratorResponse.timestamp,
        usage: orchestratorResponse.usage
      })

    } catch (aiError) {
      console.error('AI Orchestrator error:', aiError)
      
      // Fallback to JavaScript AI providers
      const fallbackResponse = await generateFallbackResponse(message, currentSession, businessContext)
      
      return NextResponse.json({
        success: true,
        response: fallbackResponse.response,
        sessionId: currentSession,
        provider: 'fallback',
        confidence: fallbackResponse.confidence,
        fallback: true,
        fallbackReason: aiError.message,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('AI Orchestrator endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

async function callPythonAIOrchestrator(message, sessionId, businessContext = {}) {
  const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
  
  try {
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/enhanced-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        business_context: businessContext
      }),
      timeout: 25000 // 25 second timeout
    })

    if (!response.ok) {
      throw new Error(`FastAPI responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.success) {
      throw new Error(data.error || 'AI Orchestrator failed')
    }

    return data
    
  } catch (error) {
    console.error('Failed to call Python AI Orchestrator:', error)
    throw new Error(`AI Orchestrator unavailable: ${error.message}`)
  }
}

async function generateFallbackResponse(message, sessionId, businessContext) {
  // Import the existing enhanced chat fallback logic
  const { generateIntelligentResponse } = await import('../enhanced-chat/route.js')
  
  try {
    const fallbackResponse = await generateIntelligentResponse(message, sessionId, businessContext)
    
    return {
      response: fallbackResponse.response,
      confidence: fallbackResponse.confidence,
      messageType: fallbackResponse.messageType,
      recommendations: fallbackResponse.recommendations,
      fallback: true
    }
  } catch (fallbackError) {
    console.error('Fallback generation failed:', fallbackError)
    
    // Final emergency fallback
    return {
      response: `I understand you're asking about "${message}". I'm currently experiencing technical difficulties but I'm here to help you optimize your barbershop business. Could you try rephrasing your question, or let me know if you'd like to focus on scheduling, customer service, marketing, or financial management?`,
      confidence: 0.60,
      messageType: 'general',
      fallback: true
    }
  }
}

async function storeConversation(supabase, userId, sessionId, message, response) {
  try {
    await supabase
      .from('chat_history')
      .insert({
        user_id: userId,
        session_id: sessionId,
        message: message,
        response: response.response,
        provider: response.provider,
        confidence: response.confidence,
        message_type: response.message_type || response.messageType,
        metadata: JSON.stringify({
          selected_provider: response.selected_provider,
          knowledge_enhanced: response.knowledge_enhanced,
          usage: response.usage,
          contextual_insights: response.contextual_insights
        }),
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to store conversation:', error)
    // Don't fail the request if storage fails
  }
}