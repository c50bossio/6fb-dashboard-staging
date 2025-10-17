
import { createClient } from '@/lib/supabase/server'

export class AgentMemorySystem {
  constructor() {
    this.supabase = null
    this.conversationHistory = new Map()
    this.businessInsights = new Map()
    this.implementationTracker = new Map()
  }

  async initialize() {
    try {
      this.supabase = createClient()
      return true
    } catch (error) {
      console.error('❌ Failed to initialize memory system:', error)
      return false
    }
  }

  async storeConversation(userId, sessionId, interaction) {
    try {
      const conversationEntry = {
        user_id: userId,
        session_id: sessionId,
        message: interaction.message,
        response: interaction.response,
        agent_type: interaction.agentType,
        collaboration_type: interaction.collaborationType || 'single',
        confidence: interaction.confidence,
        recommendations: JSON.stringify(interaction.recommendations || []),
        action_items: JSON.stringify(interaction.actionItems || []),
        analytics_data: JSON.stringify(interaction.analyticsData || {}),
        created_at: new Date().toISOString()
      }

      if (this.supabase) {
        await this.supabase
          .from('agent_conversations')
          .insert(conversationEntry)
      }

      const userHistory = this.conversationHistory.get(userId) || []
      userHistory.push({
        timestamp: new Date(),
        ...interaction
      })
      
      if (userHistory.length > 20) {
        userHistory.shift()
      }
      
      this.conversationHistory.set(userId, userHistory)

      await this.extractBusinessInsights(userId, interaction)

      return true
      
    } catch (error) {
      console.error('❌ Failed to store conversation:', error)
      return false
    }
  }

  async getConversationContext(userId, sessionId = null, limit = 5) {
    try {
      const context = {
        recentConversations: [],
        businessInsights: {},
        learningProfile: {},
        implementationHistory: []
      }

      const memoryHistory = this.conversationHistory.get(userId) || []
      
      let dbHistory = []
      if (this.supabase) {
        const query = this.supabase
          .from('agent_conversations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (sessionId) {
          query.eq('session_id', sessionId)
        }

        const { data } = await query
        dbHistory = data || []
      }

      const allHistory = [...memoryHistory, ...dbHistory]
        .sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp))
        .slice(0, limit)

      context.recentConversations = allHistory

      context.businessInsights = this.businessInsights.get(userId) || {}

      context.learningProfile = await this.getLearningProfile(userId)

      context.implementationHistory = this.implementationTracker.get(userId) || []

      return context

    } catch (error) {
      console.error('❌ Failed to get conversation context:', error)
      return { recentConversations: [], businessInsights: {}, learningProfile: {}, implementationHistory: [] }
    }
  }

  async extractBusinessInsights(userId, interaction) {
    try {
      const insights = this.businessInsights.get(userId) || {
        commonChallenges: [],
        preferredSolutions: [],
        businessGoals: [],
        decisionPatterns: [],
        implementationSuccessRate: 0.0,
        lastUpdated: new Date()
      }

      const message = interaction.message.toLowerCase()
      const challenges = [
        'revenue growth', 'customer retention', 'staff scheduling', 
        'marketing effectiveness', 'operational efficiency', 'cost management'
      ]

      challenges.forEach(challenge => {
        if (message.includes(challenge.replace(' ', '')) || message.includes(challenge)) {
          if (!insights.commonChallenges.includes(challenge)) {
            insights.commonChallenges.push(challenge)
          }
        }
      })

      const goalKeywords = ['increase', 'improve', 'grow', 'optimize', 'expand']
      goalKeywords.forEach(keyword => {
        if (message.includes(keyword)) {
          const sentence = interaction.message.split(/[.!?]/).find(s => 
            s.toLowerCase().includes(keyword)
          )
          if (sentence && sentence.length < 100) {
            insights.businessGoals.push(sentence.trim())
          }
        }
      })

      if (interaction.agentType) {
        insights.preferredSolutions.push(interaction.agentType)
      }

      insights.commonChallenges = [...new Set(insights.commonChallenges)].slice(-10)
      insights.businessGoals = [...new Set(insights.businessGoals)].slice(-10)
      insights.preferredSolutions = insights.preferredSolutions.slice(-20)

      insights.lastUpdated = new Date()
      this.businessInsights.set(userId, insights)

      if (this.supabase) {
        await this.supabase
          .from('agent_business_insights')
          .upsert({
            user_id: userId,
            insights: JSON.stringify(insights),
            updated_at: new Date().toISOString()
          })
      }

      return insights

    } catch (error) {
      console.error('❌ Failed to extract business insights:', error)
      return {}
    }
  }

  async getLearningProfile(userId) {
    try {
      const history = this.conversationHistory.get(userId) || []
      
      if (history.length === 0) return {}

      const profile = {
        communicationStyle: 'data-driven', // default
        preferredDetail: 'comprehensive',
        topConcerns: [],
        responsePattern: 'analytical',
        confidenceThreshold: 0.8
      }

      const messageTypes = history.map(h => h.message.length)
      const avgMessageLength = messageTypes.reduce((a, b) => a + b, 0) / messageTypes.length

      if (avgMessageLength > 150) {
        profile.preferredDetail = 'comprehensive'
        profile.communicationStyle = 'detailed'
      } else if (avgMessageLength < 50) {
        profile.preferredDetail = 'concise'
        profile.communicationStyle = 'direct'
      }

      const topics = history.flatMap(h => [
        ...(h.recommendations || []),
        ...(h.actionItems || []).map(a => a.task || a)
      ])
      
      const topicCounts = {}
      topics.forEach(topic => {
        if (typeof topic === 'string') {
          const words = topic.toLowerCase().split(' ')
          words.forEach(word => {
            if (word.length > 3) {
              topicCounts[word] = (topicCounts[word] || 0) + 1
            }
          })
        }
      })

      profile.topConcerns = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word)

      return profile

    } catch (error) {
      console.error('❌ Failed to get learning profile:', error)
      return {}
    }
  }

  async trackImplementation(userId, recommendationId, status, outcome = null) {
    try {
      const implementation = {
        recommendationId,
        status, // 'implemented', 'partially_implemented', 'not_implemented', 'failed'
        outcome,
        timestamp: new Date(),
        userId
      }

      const userTracker = this.implementationTracker.get(userId) || []
      userTracker.push(implementation)

      if (userTracker.length > 50) {
        userTracker.shift()
      }

      this.implementationTracker.set(userId, userTracker)

      if (this.supabase) {
        await this.supabase
          .from('agent_implementations')
          .insert({
            user_id: userId,
            recommendation_id: recommendationId,
            status,
            outcome: outcome ? JSON.stringify(outcome) : null,
            created_at: new Date().toISOString()
          })
      }

      await this.updateImplementationSuccessRate(userId)

      return true

    } catch (error) {
      console.error('❌ Failed to track implementation:', error)
      return false
    }
  }

  async updateImplementationSuccessRate(userId) {
    try {
      const implementations = this.implementationTracker.get(userId) || []
      
      if (implementations.length === 0) return

      const successful = implementations.filter(impl => 
        impl.status === 'implemented' || impl.status === 'partially_implemented'
      ).length

      const successRate = successful / implementations.length

      const insights = this.businessInsights.get(userId) || {}
      insights.implementationSuccessRate = successRate
      this.businessInsights.set(userId, insights)


    } catch (error) {
      console.error('❌ Failed to update success rate:', error)
    }
  }

  generatePersonalizedContext(userId, conversationContext) {
    try {
      const { recentConversations, businessInsights, learningProfile } = conversationContext

      let context = '\nPERSONALIZED CONTEXT:\n'

      if (recentConversations.length > 0) {
        context += `RECENT INTERACTIONS (Last ${recentConversations.length}):\n`
        recentConversations.slice(0, 3).forEach((conv, idx) => {
          context += `${idx + 1}. Previous question: "${conv.message}"\n`
          if (conv.recommendations) {
            context += `   Recommendations given: ${conv.recommendations.slice(0, 2).join(', ')}\n`
          }
        })
      }

      if (Object.keys(businessInsights).length > 0) {
        context += `\nBUSINESS LEARNING PROFILE:\n`
        
        if (businessInsights.commonChallenges?.length > 0) {
          context += `- Common Challenges: ${businessInsights.commonChallenges.slice(0, 3).join(', ')}\n`
        }
        
        if (businessInsights.businessGoals?.length > 0) {
          context += `- Stated Goals: ${businessInsights.businessGoals.slice(0, 2).join('; ')}\n`
        }

        if (businessInsights.implementationSuccessRate > 0) {
          context += `- Implementation Success Rate: ${(businessInsights.implementationSuccessRate * 100).toFixed(1)}%\n`
        }
      }

      if (Object.keys(learningProfile).length > 0) {
        context += `\nCOMMUNICATION PREFERENCES:\n`
        context += `- Style: ${learningProfile.communicationStyle || 'adaptive'}\n`
        context += `- Detail Level: ${learningProfile.preferredDetail || 'standard'}\n`
        
        if (learningProfile.topConcerns?.length > 0) {
          context += `- Key Focus Areas: ${learningProfile.topConcerns.slice(0, 3).join(', ')}\n`
        }
      }

      context += `\nADAPT YOUR RESPONSE to match their communication style and build on previous conversations.\n`

      return context

    } catch (error) {
      console.error('❌ Failed to generate personalized context:', error)
      return '\nPERSONALIZED CONTEXT: Standard approach\n'
    }
  }
}

export const agentMemory = new AgentMemorySystem()

export const memorySchemas = {
  agent_conversations: `
    CREATE TABLE IF NOT EXISTS agent_conversations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      message TEXT NOT NULL,
      response TEXT NOT NULL,
      agent_type TEXT,
      collaboration_type TEXT DEFAULT 'single',
      confidence FLOAT DEFAULT 0.0,
      recommendations JSONB DEFAULT '[]',
      action_items JSONB DEFAULT '[]',
      analytics_data JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(user_id),
      INDEX(session_id),
      INDEX(created_at)
    );
  `,
  
  agent_business_insights: `
    CREATE TABLE IF NOT EXISTS agent_business_insights (
      id SERIAL PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      insights JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(user_id)
    );
  `,
  
  agent_implementations: `
    CREATE TABLE IF NOT EXISTS agent_implementations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      recommendation_id TEXT NOT NULL,
      status TEXT NOT NULL,
      outcome JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX(user_id),
      INDEX(recommendation_id)
    );
  `
}