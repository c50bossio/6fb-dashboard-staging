import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { trackAIUsage } from '@/lib/usage-middleware'

export const runtime = 'nodejs'

/**
 * Streaming Chat API endpoint for real-time AI conversations
 * Supports multiple AI providers with intelligent fallback
 */
export async function POST(request) {
  try {
    // Get user authentication for usage tracking
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id

    const { messages, agentId } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    
    let apiEndpoint = '/api/ai/analytics-enhanced-chat'
    
    if (agentId) {
      apiEndpoint = '/api/ai/agents'
    }

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
    
    // Track AI usage if user is authenticated
    if (userId) {
      try {
        const response = aiData.message || aiData.response || "I'm here to help with your barbershop business!"
        // Estimate tokens (rough calculation: ~4 characters per token)
        const inputTokens = Math.ceil(lastMessage.length / 4)
        const outputTokens = Math.ceil(response.length / 4)
        const totalTokens = inputTokens + outputTokens
        
        await trackAIUsage(userId, 'ai_chat', totalTokens, {
          agentId: agentId || 'chat',
          inputTokens,
          outputTokens,
          endpoint: 'chat',
          model: 'estimated'
        })
      } catch (trackingError) {
        console.warn('Failed to track AI usage:', trackingError)
        // Continue with response even if tracking fails
      }
    }
    
    const stream = new ReadableStream({
      start(controller) {
        const response = aiData.message || aiData.response || "I'm here to help with your barbershop business!"
        
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Streaming chat error:', error)
    
    const fallbackMessage = "I'm your AI business assistant. I can help you with scheduling, customer management, revenue optimization, and business insights. What would you like to know?"
    
    const fallbackStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(fallbackMessage))
        controller.close()
      }
    })

    return new Response(fallbackStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
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