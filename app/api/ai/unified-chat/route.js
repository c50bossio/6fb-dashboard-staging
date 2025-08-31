import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { openai as openaiProvider } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

import { AIBusinessContextService } from '@/lib/ai-business-context'
// Use the unified AI providers instead of individual files
import { openaiClient, anthropicClient, geminiClient, DEFAULT_CLAUDE_MODEL } from '@/lib/ai-providers'
import unifiedStaffService from '@/lib/unified-staff-service'

const aiBusinessContext = new AIBusinessContextService()

export const runtime = 'nodejs'

export async function POST(request) {
  try {
    const { 
      messages, 
      provider = 'openai', 
      model, 
      stream = true, 
      includeBusinessContext = false,
      barbershopId = 'default' 
    } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    const enhancedMessages = [...messages]
    
    // Add staff context if the query is about staff
    const lastMessage = messages[messages.length - 1]?.content || ''
    const isStaffQuery = /staff|barber|employee|team|worker/i.test(lastMessage)
    
    if (isStaffQuery && barbershopId) {
      try {
        const staffData = await unifiedStaffService.getStaff(barbershopId, {
          useCache: true,
          includeAvailability: false
        })
        
        if (staffData?.success && staffData?.staff?.length > 0) {
          const staffContext = `Current staff members: ${staffData.staff.map(s => s.name || s.full_name).join(', ')}. Total staff count: ${staffData.staff.length}.`
          
          const systemIndex = enhancedMessages.findIndex(m => m.role === 'system')
          if (systemIndex >= 0) {
            enhancedMessages[systemIndex].content += '\n\n' + staffContext
          } else {
            enhancedMessages.unshift({
              role: 'system',
              content: staffContext
            })
          }
        }
      } catch (error) {
        
      }
    }
    
    if (includeBusinessContext) {
      try {
        const businessPrompt = await aiBusinessContext.getAISystemPrompt(barbershopId)
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
        // Business context unavailable - continue without it
      }
    }

    switch (provider) {
      case 'openai':
        return handleOpenAI(enhancedMessages, model, stream)
      
      case 'anthropic':
      case 'claude':
        return handleAnthropic(enhancedMessages, model, stream)
      
      case 'gemini':
      case 'google':
        return handleGemini(enhancedMessages, model, stream)
      
      default:
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
    }
  } catch (error) {
    // Chat error - return error response
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

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

async function handleAnthropic(messages, model = DEFAULT_CLAUDE_MODEL, stream) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

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

async function handleGemini(messages, model = 'gemini-1.5-flash', stream) {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Google Gemini API key not configured' }, { status: 500 })
  }

  try {
    // Use Gemini client from unified ai-providers
    if (!geminiClient) {
      return NextResponse.json({ error: 'Gemini client not initialized' }, { status: 500 })
    }
    
    const geminiModel = geminiClient.getGenerativeModel({ model: model || 'gemini-1.5-flash' })
    
    // Convert messages to Gemini format
    const geminiMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))
    
    const systemMessage = messages.find(m => m.role === 'system')?.content
    
    const chat = geminiModel.startChat({
      history: geminiMessages.slice(0, -1),
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      },
    })

    const lastMessage = messages[messages.length - 1].content
    const prompt = systemMessage ? `${systemMessage}\n\n${lastMessage}` : lastMessage

    if (stream) {
      const result = await chat.sendMessageStream(prompt)
      
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
    // Gemini error - return error response
    return NextResponse.json(
      { error: `Gemini error: ${error.message}` },
      { status: 500 }
    )
  }
}