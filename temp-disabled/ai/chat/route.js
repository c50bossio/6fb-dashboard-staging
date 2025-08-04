import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { captureException } from '@/lib/sentry'

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const runtime = 'edge'

export async function POST(req) {
  try {
    const supabase = createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get request body
    const { messages, agentId, model = 'gpt-4-turbo-preview' } = await req.json()

    // Get agent details if provided
    let systemPrompt = 'You are a helpful AI assistant for a barbershop management system.'
    
    if (agentId) {
      const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()
      
      if (agent) {
        systemPrompt = `You are ${agent.name}. ${agent.description}
        
Your capabilities include: ${JSON.stringify(agent.capabilities)}
        
Always be helpful, professional, and focused on barbershop management tasks.`
      }
    }

    // Create chat completion with streaming
    const response = await openai.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    // Convert to stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // Save to chat history
        try {
          const lastMessage = messages[messages.length - 1]
          
          await supabase.from('chat_history').insert({
            user_id: user.id,
            agent_id: agentId || null,
            message: lastMessage.content,
            response: completion,
            model,
            tokens_used: completion.length / 4, // Rough estimate
          })
        } catch (error) {
          captureException(error, { context: 'AI chat history save' })
        }
      },
    })

    // Return streaming response
    return new StreamingTextResponse(stream)
  } catch (error) {
    captureException(error, { context: 'AI chat endpoint' })
    
    if (error.message?.includes('rate limit')) {
      return new Response('Rate limit exceeded. Please try again later.', { status: 429 })
    }
    
    return new Response('Internal Server Error', { status: 500 })
  }
}