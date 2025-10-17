/**
 * API Client for 6FB AI Agent System
 * Handles authentication, error handling, and API communication
 */

const API_BASE_URL = '';

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

class APIClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new APIError(
          data?.detail || data?.message || `HTTP error! status: ${response.status}`,
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        error.message || 'Network error occurred',
        0,
        null
      );
    }
  }

  async register(userData) {
    const response = await this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.access_token) {
      this.setToken(response.access_token);
    }
    
    return response;
  }

  async login(credentials) {
    const response = await this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.access_token) {
      this.setToken(response.access_token);
    }
    
    return response;
  }

  async logout() {
    try {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Logout API call failed:', error);
    }
    
    this.setToken(null);
    return { message: 'Logged out successfully' };
  }

  async getCurrentUser() {
    return await this.request('/api/v1/auth/me');
  }

  async chatWithCoach(message, shopContext = null, sessionId = null) {
    return await this.request('/api/v1/agentic-coach/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        shop_context: shopContext,
        session_id: sessionId,
      }),
    });
  }

  async updateShopContext(contextData) {
    return await this.request('/api/v1/agentic-coach/shop-context', {
      method: 'PUT',
      body: JSON.stringify(contextData),
    });
  }

  async getConversationHistory(sessionId) {
    return await this.request(`/api/v1/agentic-coach/conversation-history/${sessionId}`);
  }

  async getLearningInsights() {
    return await this.request('/api/v1/agentic-coach/learning-insights');
  }

  async getHealthCheck() {
    return await this.request('/api/v1/health');
  }

  async getDatabaseHealth() {
    return await this.request('/api/v1/database/health');
  }

  async getDatabaseStats() {
    return await this.request('/api/v1/database/stats');
  }

  async getDatabaseInfo() {
    return await this.request('/api/v1/database/info');
  }

  async listAgents() {
    return await this.request('/api/v1/agents');
  }

  async legacyChatWithAgent(message, agentId, context = {}) {
    return await this.request('/api/v1/ai-agents/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        agent_id: agentId,
        context,
      }),
    });
  }
}

const apiClient = new APIClient();

export default apiClient;
export { APIError };

export const auth = {
  register: (userData) => apiClient.register(userData),
  login: (credentials) => apiClient.login(credentials),
  logout: () => apiClient.logout(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  isAuthenticated: () => !!apiClient.token,
};

export const agenticCoach = {
  chat: (message, shopContext, sessionId) => apiClient.chatWithCoach(message, shopContext, sessionId),
  updateShopContext: (contextData) => apiClient.updateShopContext(contextData),
  getConversationHistory: (sessionId) => apiClient.getConversationHistory(sessionId),
  getLearningInsights: () => apiClient.getLearningInsights(),
};

export const system = {
  health: () => apiClient.getHealthCheck(),
  databaseHealth: () => apiClient.getDatabaseHealth(),
  databaseStats: () => apiClient.getDatabaseStats(),
  databaseInfo: () => apiClient.getDatabaseInfo(),
};

export const agents = {
  list: () => apiClient.listAgents(),
  legacyChat: (message, agentId, context) => apiClient.legacyChatWithAgent(message, agentId, context),
};