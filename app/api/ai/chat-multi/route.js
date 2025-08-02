import { OpenAIStream, StreamingTextResponse, AnthropicStream } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { anthropic, formatMessagesForClaude, extractSystemMessage, DEFAULT_CLAUDE_MODEL } from '@/lib/anthropic'

export const runtime = 'edge'

export async function POST(req) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, model = 'gpt-4', provider = 'openai' } = await req.json()

    // Store initial message
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === 'user') {
        await supabase
          .from('chat_history')
          .insert({
            user_id: user.id,
            agent_id: 'general',
            message: lastMessage.content,
            response: '',
            created_at: new Date().toISOString(),
          })
      }
    }

    let stream
    let completion

    if (provider === 'anthropic') {
      // Use Claude
      const claudeMessages = formatMessagesForClaude(messages)
      const systemMessage = extractSystemMessage(messages)
      
      const response = await anthropic.messages.create({
        model: model || DEFAULT_CLAUDE_MODEL,
        messages: claudeMessages,
        system: systemMessage,
        max_tokens: 4096,
        stream: true,
      })

      stream = AnthropicStream(response, {
        async onCompletion(completion) {
          // Store the completion
          const lastUserMessage = messages.filter(m => m.role === 'user').pop()
          if (lastUserMessage) {
            await supabase
              .from('chat_history')
              .insert({
                user_id: user.id,
                agent_id: 'general',
                message: lastUserMessage.content,
                response: completion,
                created_at: new Date().toISOString(),
              })
          }
        },
      })
    } else {
      // Use OpenAI (default)
      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      })

      stream = OpenAIStream(response, {
        async onCompletion(completion) {
          // Store the completion
          const lastUserMessage = messages.filter(m => m.role === 'user').pop()
          if (lastUserMessage) {
            await supabase
              .from('chat_history')
              .insert({
                user_id: user.id,
                agent_id: 'general',
                message: lastUserMessage.content,
                response: completion,
                created_at: new Date().toISOString(),
              })
          }
        },
      })
    }

    return new StreamingTextResponse(stream)
  } catch (error) {
    console.error('Chat error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Chat failed' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}