import OpenAI from 'openai'

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Available models
export const OPENAI_MODELS = {
  GPT_4_TURBO: 'gpt-4-turbo-preview',
  GPT_4: 'gpt-4',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  GPT_3_5_TURBO_16K: 'gpt-3.5-turbo-16k',
}

// Default model
export const DEFAULT_OPENAI_MODEL = OPENAI_MODELS.GPT_3_5_TURBO

// Helper function to check if OpenAI is configured
export function isOpenAIConfigured() {
  return process.env.OPENAI_API_KEY && 
         !process.env.OPENAI_API_KEY.includes('YOUR_OPENAI_KEY_HERE')
}