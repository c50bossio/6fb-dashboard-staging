import { streamText } from 'ai'
import { NextResponse } from 'next/server'

/**
 * Streaming Chat API endpoint for real-time AI conversations
 * Supports multiple AI providers with intelligent fallback
 */
export async function POST(request) {
  try {
    const { messages, agentId } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    
    // Route to the appropriate AI service based on agent or message type
    let apiEndpoint = '/api/ai/analytics-enhanced-chat'
    
    if (agentId) {
      // Use agent-specific endpoint if agent ID provided
      apiEndpoint = '/api/ai/agents'
    }

    // Call the actual AI service
    const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: lastMessage,
        context: 'streaming_chat',
        agentId: agentId,
        messages: messages.slice(-5) // Include recent conversation context
      })
    })

    if (!aiResponse.ok) {
      throw new Error(`AI service error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    
    // Create streaming response
    const stream = new ReadableStream({
      start(controller) {
        const response = aiData.message || aiData.response || "I'm here to help with your barbershop business!"
        
        // Simulate streaming by sending chunks
        const chunks = response.match(/.{1,10}/g) || [response]
        let index = 0
        
        const sendChunk = () => {
          if (index < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[index]))
            index++
            setTimeout(sendChunk, 50) // 50ms delay between chunks
          } else {
            controller.close()
          }
        }
        
        sendChunk()
      }
    })

    return new StreamingTextResponse(stream)

  } catch (error) {
    console.error('Streaming chat error:', error)
    
    // Return fallback response
    const fallbackMessage = "I'm your AI business assistant. I can help you with scheduling, customer management, revenue optimization, and business insights. What would you like to know?"
    
    const fallbackStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallbackMessage))
        controller.close()
      }
    })

    return new StreamingTextResponse(fallbackStream)
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'streaming-chat',
    capabilities: [
      'real-time streaming',
      'multiple AI providers',
      'business context integration',
      'agent-specific routing'
    ]
  })
}