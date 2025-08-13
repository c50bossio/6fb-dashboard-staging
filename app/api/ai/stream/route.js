import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Force Node.js runtime to support Supabase dependencies
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Server-Sent Events (SSE) streaming endpoint for AI responses
 * Provides real-time streaming with optimal performance
 */
export async function POST(request) {
  // Verify authentication
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { message, sessionId, agentId, context, streamEnabled = true } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial connection message
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'connection', 
              status: 'connected' 
            })}\n\n`)
          )

          // Simulate streaming response (replace with actual AI call)
          await streamAIResponse(
            message,
            sessionId,
            agentId,
            context,
            user.id,
            (chunk) => {
              // Send each chunk as SSE event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ 
                  type: 'chunk',
                  content: chunk,
                  timestamp: Date.now()
                })}\n\n`)
              )
            }
          )

          // Send completion signal
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

        } catch (error) {
          console.error('Streaming error:', error)
          
          // Send error event
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error',
              error: error.message 
            })}\n\n`)
          )
          controller.close()
        }
      }
    })

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      }
    })

  } catch (error) {
    console.error('Stream endpoint error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Stream AI response with chunking
 */
async function streamAIResponse(message, sessionId, agentId, context, userId, onChunk) {
  try {
    // Try FastAPI backend first
    const fastAPIUrl = process.env.FASTAPI_BASE_URL || 'http://localhost:8001'
    
    const response = await fetch(`${fastAPIUrl}/api/v1/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        agent_id: agentId,
        context,
        user_id: userId,
        stream: true
      })
    })

    if (response.ok && response.body) {
      // Stream from FastAPI
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        onChunk(chunk)
      }
    } else {
      // Fallback to simulated streaming
      await simulateStreaming(message, onChunk)
    }

  } catch (error) {
    console.error('AI streaming error:', error)
    // Fallback to simulated streaming
    await simulateStreaming(message, onChunk)
  }
}

/**
 * Simulate streaming for development/fallback
 */
async function simulateStreaming(message, onChunk) {
  // Determine response based on message content
  const responses = {
    booking: "I can help you optimize your booking schedule. Based on your current patterns, I recommend scheduling premium services during peak hours (10 AM - 2 PM) to maximize revenue. Would you like me to analyze your specific schedule?",
    revenue: "Looking at your revenue data, I see opportunities for a 15-20% increase. Key strategies include: 1) Implement dynamic pricing for peak hours, 2) Create service bundles for regular customers, 3) Optimize staff scheduling to reduce idle time.",
    marketing: "Here are three proven marketing strategies for barbershops: 1) Launch a referral program with incentives, 2) Partner with local businesses for cross-promotion, 3) Use social media to showcase transformations and build community.",
    default: "I'm here to help optimize your barbershop business. I can assist with scheduling, revenue optimization, customer management, marketing strategies, and operational efficiency. What specific area would you like to focus on?"
  }

  // Find matching response
  let selectedResponse = responses.default
  for (const [key, response] of Object.entries(responses)) {
    if (message.toLowerCase().includes(key)) {
      selectedResponse = response
      break
    }
  }

  // Simulate word-by-word streaming
  const words = selectedResponse.split(' ')
  for (const word of words) {
    onChunk(word + ' ')
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 70))
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}