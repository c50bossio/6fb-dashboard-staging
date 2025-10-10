import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { openai as openaiProvider } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

import { anthropic as anthropicClient, DEFAULT_CLAUDE_MODEL } from '@/lib/anthropic'
import { getGeminiModel, convertToGeminiFormat } from '@/lib/gemini'
import { AIBusinessContextService } from '@/lib/ai-business-context'

// Initialize OpenAI
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

// Initialize AI Business Context Service
const aiBusinessContext = new AIBusinessContextService()

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { 
      messages, 
      message, // Support both formats
      provider = 'openai', 
      model, 
      stream = true, 
      includeBusinessContext = false,
      barbershopId = 'default',
      sessionId,
      businessContext,
      storeConversation = false
    } = await request.json()

    // Support both message formats (single message or messages array)
    let processedMessages = messages
    if (!messages && message) {
      processedMessages = [{ role: 'user', content: message }]
    }
    
    if (!processedMessages || processedMessages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    // Generate session ID if not provided
    const currentSessionId = sessionId || generateSessionId()

    // Get conversation context from memory
    let conversationContext = null
    if (currentSessionId) {
      try {
        const memoryResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/memory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_context',
            sessionId: currentSessionId,
            data: { contextType: 'recent', limit: 5 }
          })
        })
        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json()
          if (memoryData.success) {
            conversationContext = memoryData.context
          }
        }
      } catch (memoryError) {
        console.warn('Memory retrieval failed:', memoryError.message)
      }
    }

    // Try Python AI orchestrator first for enhanced responses
    if (provider === 'enhanced' || includeBusinessContext) {
      try {
        const pythonResponse = await callPythonAIOrchestrator(
          processedMessages[processedMessages.length - 1].content,
          currentSessionId,
          businessContext || {},
          conversationContext
        )
        
        if (pythonResponse.success) {
          // Store conversation if requested
          if (storeConversation) {
            await storeConversationInMemory(
              currentSessionId,
              processedMessages[processedMessages.length - 1].content,
              pythonResponse.response,
              businessContext
            )
          }
          
          return NextResponse.json({
            content: pythonResponse.response,
            provider: pythonResponse.provider,
            sessionId: currentSessionId,
            confidence: pythonResponse.confidence,
            messageType: pythonResponse.message_type,
            analyticsEnhanced: pythonResponse.analytics_enhanced,
            agentDetails: pythonResponse.agent_details
          })
        }
      } catch (error) {
        console.warn('Python AI orchestrator failed, falling back to direct providers:', error)
      }
    }

    // Add business context if requested
    let enhancedMessages = [...processedMessages]
    if (includeBusinessContext) {
      try {
        const businessPrompt = await aiBusinessContext.getAISystemPrompt(barbershopId)
        // Update or add system message with business context
        const systemIndex = enhancedMessages.findIndex(m => m.role === 'system')
        if (systemIndex >= 0) {
          enhancedMessages[systemIndex].content += '\n\n' + businessPrompt
        } else {
          enhancedMessages.unshift({
            role: 'system',
            content: businessPrompt
          })
        }
      } catch (error) {
        console.error('Failed to get business context:', error)
        // Continue without business context
      }
    }

    // Route to appropriate provider with enhanced messages
    switch (provider) {
      case 'openai':
        return handleOpenAI(enhancedMessages, model, stream)
      
      case 'anthropic':
      case 'claude':
        return handleAnthropic(enhancedMessages, model, stream)
      
      case 'gemini':
      case 'google':
        return handleGemini(enhancedMessages, model, stream)
      
      case 'enhanced':
        // Already handled above with Python AI orchestrator
        return NextResponse.json({ error: 'Enhanced provider failed, please try again' }, { status: 500 })
      
      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Unified chat error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OpenAI requests
async function handleOpenAI(messages, model = 'gpt-4o-mini', stream) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  if (stream) {
    const result = await streamText({
      model: openaiProvider(model),
      messages,
    })

    return result.toAIStreamResponse()
  } else {
    const response = await openaiClient.chat.completions.create({
      model,
      messages,
      stream: false,
    })

    return NextResponse.json({
      content: response.choices[0].message.content,
      usage: response.usage,
    })
  }
}

// Handle Anthropic/Claude requests
async function handleAnthropic(messages, model = DEFAULT_CLAUDE_MODEL, stream) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  // Extract system message if present
  const systemMessage = messages.find(m => m.role === 'system')?.content || undefined
  const claudeMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))

  if (stream) {
    const result = await streamText({
      model: anthropicProvider(model),
      messages: claudeMessages,
      system: systemMessage,
      maxTokens: 4096,
    })

    return result.toAIStreamResponse()
  } else {
    const response = await anthropicClient.messages.create({
      model,
      messages: claudeMessages,
      system: systemMessage,
      max_tokens: 4096,
    })

    return NextResponse.json({
      content: response.content[0].text,
      usage: {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    })
  }
}

// Handle Google Gemini requests
async function handleGemini(messages, model = 'gemini-1.5-flash', stream) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 })
  }

  try {
    const geminiModel = getGeminiModel(model)
    
    // Convert messages to Gemini format
    const geminiMessages = convertToGeminiFormat(messages)
    
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system')?.content
    
    // Create chat with history
    const chat = geminiModel.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    })

    // Get the last message
    const lastMessage = messages[messages.length - 1].content
    const prompt = systemMessage ? `${systemMessage}\n\n${lastMessage}` : lastMessage

    if (stream) {
      const result = await chat.sendMessageStream(prompt)
      
      // Create a readable stream
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          for await (const chunk of result.stream) {
            const text = chunk.text()
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      })
    } else {
      const result = await chat.sendMessage(prompt)
      const response = await result.response
      
      return NextResponse.json({
        content: response.text(),
        usage: {
          prompt_tokens: response.usageMetadata?.promptTokenCount || 0,
          completion_tokens: response.usageMetadata?.candidatesTokenCount || 0,
          total_tokens: response.usageMetadata?.totalTokenCount || 0,
        },
      })
    }
  } catch (error) {
    console.error('Gemini error:', error)
    return NextResponse.json(
      { error: `Gemini error: ${error.message}` },
      { status: 500 }
    )
  }
}

// Helper function to call Python AI Orchestrator
async function callPythonAIOrchestrator(message, sessionId, businessContext, conversationContext) {
  try {
    const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://backend:8000'
    const response = await fetch(`${pythonServiceUrl}/ai/enhanced-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message.trim(),
        session_id: sessionId,
        business_context: businessContext,
        conversation_context: conversationContext
      }),
      timeout: 30000,
    })
    
    if (response.ok) {
      return await response.json()
    } else {
      throw new Error(`Python AI service responded with ${response.status}`)
    }
  } catch (error) {
    console.error('Python AI orchestrator error:', error)
    return { success: false, error: error.message }
  }
}

// Helper function to store conversation in memory
async function storeConversationInMemory(sessionId, message, response, businessContext) {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:9999'}/api/ai/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_message',
        sessionId,
        data: {
          message: message.trim(),
          response: response,
          messageType: classifyMessage(message),
          agent: 'AI Assistant',
          businessContext: businessContext
        }
      })
    })
  } catch (memoryError) {
    console.warn('Failed to store conversation in memory:', memoryError.message)
  }
}

// Helper function to classify message type
function classifyMessage(message) {
  const messageLower = message.toLowerCase()
  
  if (/\b(revenue|profit|analytics|performance|metrics|kpi|growth|sales|business)\b/.test(messageLower)) {
    return 'business_analysis'
  }
  
  if (/\b(customer|client|service|complaint|feedback|satisfaction|retention|review)\b/.test(messageLower)) {
    return 'customer_service'
  }
  
  if (/\b(schedule|appointment|booking|calendar|time|availability|slot|busy|free)\b/.test(messageLower)) {
    return 'scheduling'
  }
  
  if (/\b(money|cost|price|payment|expense|budget|financial|income|profit|loss)\b/.test(messageLower)) {
    return 'financial'
  }
  
  if (/\b(marketing|promotion|social media|advertising|brand|instagram|facebook|attract)\b/.test(messageLower)) {
    return 'marketing'
  }
  
  return 'general'
}

// Helper function to generate session ID
function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}