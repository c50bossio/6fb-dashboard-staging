/**
 * AI Client - Handles communication with AI backend services
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

class AIClient {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/ai`;
    this.conversationId = null;
  }

  /**
   * Get available AI agents
   */
  async getAgents() {
    try {
      const response = await fetch(`${this.baseUrl}/agents`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching agents:', error);
      // Return default agents as fallback
      return [
        {
          id: 'business_coach',
          name: 'Business Coach',
          status: 'active',
          description: 'Strategic business advisor'
        },
        {
          id: 'marketing_expert',
          name: 'Marketing Expert',
          status: 'active',
          description: 'Marketing specialist'
        }
      ];
    }
  }

  /**
   * Send message to AI agent
   */
  async sendMessage(message, agentId = 'business_coach', options = {}) {
    try {
      const payload = {
        message,
        agent_id: agentId,
        barbershop_id: options.barbershopId || null,
        conversation_id: this.conversationId || options.conversationId,
        include_analytics: options.includeAnalytics || false
      };

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      
      // Store conversation ID for context
      if (data.conversation_id) {
        this.conversationId = data.conversation_id;
      }
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/conversation/${conversationId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return { messages: [], error: error.message };
    }
  }

  /**
   * Clear conversation
   */
  async clearConversation(conversationId) {
    try {
      const response = await fetch(`${this.baseUrl}/conversation/${conversationId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      // Clear stored conversation ID
      if (conversationId === this.conversationId) {
        this.conversationId = null;
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return { error: error.message };
    }
  }

  /**
   * Get AI analytics
   */
  async getAnalytics(barbershopId, metrics = null) {
    try {
      const response = await fetch(`${this.baseUrl}/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          metrics: metrics
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return { error: error.message };
    }
  }

  /**
   * Get AI recommendations
   */
  async getRecommendations(barbershopId, category) {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barbershop_id: barbershopId,
          category: category
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return { recommendations: [], error: error.message };
    }
  }

  /**
   * Check AI health status
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error checking AI health:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Reset conversation context
   */
  resetContext() {
    this.conversationId = null;
  }
}

// Export singleton instance
const aiClient = new AIClient();
export default aiClient;