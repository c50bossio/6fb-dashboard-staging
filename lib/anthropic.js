import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const CLAUDE_MODELS = {
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
}

export const DEFAULT_CLAUDE_MODEL = CLAUDE_MODELS.CLAUDE_3_5_SONNET
export const DEFAULT_MAX_TOKENS = 4096

export function formatMessagesForClaude(messages) {
  return messages.map(msg => {
    if (msg.role === 'system') {
      return null
    }
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }
  }).filter(Boolean)
}

export function extractSystemMessage(messages) {
  const systemMsg = messages.find(msg => msg.role === 'system')
  return systemMsg?.content || null
}