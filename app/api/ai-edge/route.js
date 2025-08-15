export const runtime = 'edge'

/**
 * Edge Runtime AI Service - Ultra-lightweight AI proxy
 * Replaces heavy SDK-based AI routes to reduce serverless function size
 */

export async function POST(request) {
  try {
    const { provider, model, messages, stream = false } = await request.json()
    
    if (!provider || !model || !messages) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: provider, model, messages' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let response
    
    switch (provider.toLowerCase()) {
      case 'openai':
        response = await fetchOpenAI(model, messages, stream)
        break
      case 'anthropic':
        response = await fetchAnthropic(model, messages, stream)
        break
      case 'google':
        response = await fetchGoogle(model, messages, stream)
        break
      default:
        return new Response(
          JSON.stringify({ error: `Unsupported provider: ${provider}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
    }

    return response
  } catch (error) {
    console.error('Edge AI service error:', error)
    return new Response(
      JSON.stringify({ error: 'AI service error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function fetchOpenAI(model, messages, stream) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4',
      messages,
      stream,
      max_tokens: 2000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  if (stream) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function fetchAnthropic(model, messages, stream) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Anthropic API key not configured')
  }

  const systemMessage = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: systemMessage?.content || '',
      messages: userMessages,
      stream
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error: ${error}`)
  }

  if (stream) {
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function fetchGoogle(model, messages, stream) {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) {
    throw new Error('Google AI API key not configured')
  }

  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Google AI error: ${error}`)
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function GET() {
  return new Response(
    JSON.stringify({
      service: 'Edge AI Service',
      runtime: 'edge',
      providers: ['openai', 'anthropic', 'google'],
      status: 'ready'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}