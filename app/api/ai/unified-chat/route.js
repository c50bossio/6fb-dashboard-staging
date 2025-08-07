import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'
import { openai as openaiProvider } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'

import { anthropic as anthropicClient, DEFAULT_CLAUDE_MODEL } from '@/lib/anthropic'
import { getGeminiModel, convertToGeminiFormat } from '@/lib/gemini'

// Initialize OpenAI
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { messages, provider = 'openai', model, stream = true } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    // Route to appropriate provider
    switch (provider) {
      case 'openai':
        return handleOpenAI(messages, model, stream)
      
      case 'anthropic':
      case 'claude':
        return handleAnthropic(messages, model, stream)
      
      case 'gemini':
      case 'google':
        return handleGemini(messages, model, stream)
      
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