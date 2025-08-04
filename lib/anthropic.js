import Anthropic from '@anthropic-ai/sdk'

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model configurations
export const CLAUDE_MODELS = {
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet-20241022',
  CLAUDE_3_5_HAIKU: 'claude-3-5-haiku-20241022',
  CLAUDE_3_OPUS: 'claude-3-opus-20240229',
  CLAUDE_3_SONNET: 'claude-3-sonnet-20240229',
  CLAUDE_3_HAIKU: 'claude-3-haiku-20240307',
}

// Default model settings
export const DEFAULT_CLAUDE_MODEL = CLAUDE_MODELS.CLAUDE_3_5_SONNET
export const DEFAULT_MAX_TOKENS = 4096

// Helper function to format messages for Claude
export function formatMessagesForClaude(messages) {
  // Claude expects a specific message format
  return messages.map(msg => {
    if (msg.role === 'system') {
      // Claude doesn't have a system role, so we prepend it to the first user message
      return null
    }
    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }
  }).filter(Boolean)
}

// Get system message from messages array
export function extractSystemMessage(messages) {
  const systemMsg = messages.find(msg => msg.role === 'system')
  return systemMsg?.content || null
}