import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { BufferMemory } from 'langchain/memory'
import { ConversationChain } from 'langchain/chains'
import { PromptTemplate } from '@langchain/core/prompts'
import { supabase } from './supabase'

// Initialize LLMs
const openAIModel = new ChatOpenAI({
  openAIApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  modelName: 'gpt-4-turbo-preview',
  temperature: 0.7,
})

const anthropicModel = new ChatAnthropic({
  anthropicApiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY,
  modelName: 'claude-3-opus-20240229',
  temperature: 0.7,
})

// Business Coach Prompt Template
const businessCoachPrompt = PromptTemplate.fromTemplate(`
You are an expert business coach for barbershops, following the Six Figure Barber methodology.

Your role is to:
1. Provide actionable business advice
2. Help increase revenue and efficiency
3. Build strong client relationships
4. Develop professional brand
5. Enable business scalability

Current conversation:
{history}

Barbershop Context:
{context}

User: {input}