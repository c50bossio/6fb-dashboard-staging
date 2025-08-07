import { streamText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { openai as openaiClient } from '@/lib/openai'
import { anthropic as anthropicClient, formatMessagesForClaude, extractSystemMessage, DEFAULT_CLAUDE_MODEL } from '@/lib/anthropic'
import { openai as openaiProvider } from '@ai-sdk/openai'
import { anthropic as anthropicProvider } from '@ai-sdk/anthropic'

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

    let result

    if (provider === 'anthropic') {
      // Use Claude
      const claudeMessages = formatMessagesForClaude(messages)
      const systemMessage = extractSystemMessage(messages)
      
      result = await streamText({
        model: anthropicProvider(model || DEFAULT_CLAUDE_MODEL),
        messages: claudeMessages,
        system: systemMessage,
        maxTokens: 4096,
        onFinish: async ({ text: completion }) => {
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
      result = await streamText({
        model: openaiProvider(model),
        messages,
        temperature: 0.7,
        onFinish: async ({ text: completion }) => {
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

    return result.toAIStreamResponse()
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