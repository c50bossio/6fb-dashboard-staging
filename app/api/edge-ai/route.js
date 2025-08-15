export const runtime = 'edge'

/**
 * Edge runtime AI proxy to reduce bundle size
 * Handles AI requests without heavy node modules
 */
export async function POST(request) {
  try {
    const { messages, provider = 'openai' } = await request.json()
    
    const apiUrl = provider === 'anthropic' 
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.openai.com/v1/chat/completions'
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY}`,
      ...(provider === 'anthropic' && {
        'x-api-version': '2023-06-01',
        'anthropic-version': '2023-06-01'
      })
    }
    
    const body = provider === 'anthropic' 
      ? {
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: messages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          }))
        }
      : {
          model: 'gpt-3.5-turbo',
          messages,
          max_tokens: 1000
        }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    const message = provider === 'anthropic' 
      ? data.content[0]?.text 
      : data.choices[0]?.message?.content
    
    return Response.json({
      success: true,
      message,
      provider,
      usage: data.usage
    })
    
  } catch (error) {
    console.error('Edge AI error:', error)
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}