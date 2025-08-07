import { BufferMemory } from 'langchain/memory'
import { OpenAI } from 'openai'

import { supabase } from '../supabase'

// Initialize OpenAI (using the package you already have)
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Only for client-side, move to API route in production
})

// Memory management class
class ConversationMemory {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.messages = []
  }

  async loadFromSupabase() {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', this.sessionId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      this.messages = data.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    }
  }

  async saveMessage(role, content) {
    const message = { role, content }
    this.messages.push(message)

    // Save to Supabase
    await supabase.from('messages').insert({
      session_id: this.sessionId,
      role,
      content,
      metadata: {},
      created_at: new Date().toISOString()
    })
  }

  getContext(maxTokens = 2000) {
    // Get recent messages that fit within token limit
    // Simplified - in production, use tiktoken for accurate counting
    const context = []
    let tokenCount = 0
    
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i]
      const msgTokens = msg.content.length / 4 // Rough estimate
      
      if (tokenCount + msgTokens > maxTokens) break
      
      context.unshift(msg)
      tokenCount += msgTokens
    }
    
    return context
  }
}

// Main AI Agent class
export class BusinessCoachAgent {
  constructor() {
    this.systemPrompt = `You are an expert business coach for barbershops, following the Six Figure Barber methodology.

Your role is to:
1. Provide actionable business advice focused on revenue growth
2. Help optimize operations and efficiency
3. Build strong client relationships
4. Develop professional brand
5. Enable business scalability

Always be encouraging, specific, and results-focused. Provide concrete action items.`
  }

  async createSession(userId) {
    const { data, error } = await supabase
      .from('ai_sessions')
      .insert({
        user_id: userId,
        session_type: 'business_coaching',
        agent_type: 'business_coach',
        context: {},
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  async chat(sessionId, message, context = {}) {
    // Load conversation memory
    const memory = new ConversationMemory(sessionId)
    await memory.loadFromSupabase()

    // Save user message
    await memory.saveMessage('user', message)

    // Prepare messages for API
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...memory.getContext(),
      { role: 'user', content: this.formatMessageWithContext(message, context) }
    ]

    try {
      // Get AI response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      })

      const aiResponse = completion.choices[0].message.content

      // Save AI response
      await memory.saveMessage('assistant', aiResponse)

      // Extract insights and action items
      const insights = this.extractInsights(aiResponse)
      const actionItems = this.extractActionItems(aiResponse)

      // Save insights to Supabase
      if (insights.length > 0) {
        await this.saveInsights(sessionId, insights)
      }

      return {
        response: aiResponse,
        insights,
        actionItems,
        sessionId
      }
    } catch (error) {
      console.error('AI chat error:', error)
      throw error
    }
  }

  formatMessageWithContext(message, context) {
    if (!context || Object.keys(context).length === 0) {
      return message
    }

    let contextStr = '\n\nBarbershop Context:\n'
    for (const [key, value] of Object.entries(context)) {
      contextStr += `- ${key}: ${value}\n`
    }

    return message + contextStr
  }

  extractInsights(response) {
    const insights = []
    
    // Look for patterns that indicate insights
    const insightPatterns = [
      /insight:|key finding:|important:/gi,
      /you should consider|i recommend|my advice/gi,
      /opportunity:|potential:/gi
    ]

    const sentences = response.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      for (const pattern of insightPatterns) {
        if (pattern.test(sentence)) {
          insights.push(sentence.trim())
          break
        }
      }
    }

    return insights.slice(0, 3) // Top 3 insights
  }

  extractActionItems(response) {
    const actionItems = []
    
    // Look for action-oriented patterns
    const actionPatterns = [
      /\d+\.\s+(.+)/g, // Numbered lists
      /•\s+(.+)/g, // Bullet points
      /try|implement|create|start|begin|establish|set up|develop/gi
    ]

    const lines = response.split('\n')
    
    for (const line of lines) {
      for (const pattern of actionPatterns) {
        const matches = line.match(pattern)
        if (matches) {
          actionItems.push(line.trim())
          break
        }
      }
    }

    return actionItems.slice(0, 5) // Top 5 action items
  }

  async saveInsights(sessionId, insights) {
    const insightPromises = insights.map((insight, index) => 
      supabase.from('business_insights').insert({
        user_id: null, // Will be set from session
        session_id: sessionId,
        insight_type: 'ai_recommendation',
        title: `Insight ${index + 1}`,
        content: insight,
        priority: 'medium',
        status: 'pending',
        created_at: new Date().toISOString()
      })
    )

    await Promise.all(insightPromises)
  }

  // Specialized methods for different coaching areas
  async coachMarketing(sessionId, question, businessData) {
    const marketingContext = {
      ...businessData,
      focus: 'marketing and customer acquisition'
    }
    
    const prompt = `Marketing question: ${question}`
    return this.chat(sessionId, prompt, marketingContext)
  }

  async coachFinancial(sessionId, question, financialData) {
    const financialContext = {
      ...financialData,
      focus: 'financial optimization and profitability'
    }
    
    const prompt = `Financial question: ${question}`
    return this.chat(sessionId, prompt, financialContext)
  }

  async coachOperations(sessionId, question, operationsData) {
    const operationsContext = {
      ...operationsData,
      focus: 'operational efficiency and scalability'
    }
    
    const prompt = `Operations question: ${question}`
    return this.chat(sessionId, prompt, operationsContext)
  }
}

// Export singleton instance
export const businessCoach = new BusinessCoachAgent()