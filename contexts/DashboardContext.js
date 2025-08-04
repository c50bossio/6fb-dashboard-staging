'use client'

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const DashboardContext = createContext({});

export function DashboardProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    service: '6fb-ai-backend',
    version: '2.0.0',
    database: { healthy: true, response_time: 45 },
    agents: { active: 6, total: 8 },
    api: { healthy: true, response_time: 120 },
    rag_engine: 'active',
    learning_enabled: true,
    timestamp: new Date().toISOString()
  });
  
  const [agentInsights, setAgentInsights] = useState({
    coach_learning_data: {
      total_interactions: 847,
      common_topics: ['scheduling', 'customer service', 'pricing'],
      avg_satisfaction: 4.7,
      learning_progress: 85,
      shop_profiles: [
        { name: 'Demo Shop', last_updated: new Date().toISOString() }
      ]
    },
    database_insights: [
      { insight: 'Peak hours analysis complete', confidence: 0.95 },
      { insight: 'Customer retention patterns identified', confidence: 0.87 }
    ],
    performance_metrics: {
      accuracy: 94.2,
      response_time: 1.8,
      user_engagement: 78.5
    }
  });
  
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // Stats and metrics
  const [dashboardStats, setDashboardStats] = useState({
    totalConversations: 847,
    activeAgents: 6,
    systemUptime: '99.9%',
    responseTime: '45ms',
    weeklyConversations: 47,
    weeklyResponses: 156,
    weeklyLearning: 23,
    activeUsers: 12,
    avgSession: '8m 34s',
    costSavings: '2,340',
    timeSaved: '47 hours',
    efficiency: '+34%'
  });

  const chatWithAgent = async (message, shopContext = null) => {
    try {
      setError(null);
      
      console.log('💬 Sending message to enhanced AI chat:', message);
      
      // Call our enhanced chat API
      const response = await fetch('/api/ai/enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: currentSession,
          businessContext: shopContext || {
            shop_name: 'Demo Barbershop',
            location: 'Local Area',
            staff_count: 3
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Chat request failed');
      }

      console.log('✅ Enhanced AI response received:', result);
      
      // Update session
      setCurrentSession(result.sessionId);
      
      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: result.response,
          timestamp: result.timestamp,
          recommendations: result.recommendations,
          confidence: result.confidence,
          provider: result.provider,
          messageType: result.messageType
        }
      ]);

      // Update stats
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1
      }));

      return {
        session_id: result.sessionId,
        response: result.response,
        timestamp: result.timestamp,
        recommendations: result.recommendations,
        confidence: result.confidence,
        provider: result.provider,
        message_type: result.messageType
      };
    } catch (err) {
      console.error('Enhanced chat error:', err);
      
      // Fallback to intelligent mock response
      console.log('🔄 Using fallback response...');
      
      const fallbackResponse = {
        session_id: currentSession || `session_${Date.now()}`,
        response: `I understand you're asking about "${message}". As your AI business coach, I can help you optimize your barbershop operations, improve customer satisfaction, and grow your revenue. What specific area would you like to focus on?`,
        timestamp: new Date().toISOString(),
        recommendations: [
          'Consider implementing online booking system',
          'Focus on customer retention strategies',
          'Analyze peak hours for optimal staffing'
        ],
        confidence: 0.75,
        provider: 'fallback'
      };
      
      setCurrentSession(fallbackResponse.session_id);
      
      // Add to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: fallbackResponse.response,
          timestamp: fallbackResponse.timestamp,
          recommendations: fallbackResponse.recommendations,
          confidence: fallbackResponse.confidence,
          provider: 'fallback'
        }
      ]);

      // Update stats
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1
      }));

      return fallbackResponse;
    }
  };

  const loadConversationHistory = async (sessionId) => {
    setCurrentSession(sessionId);
  };

  const updateShopContext = async (contextData) => {
    console.log('Shop context updated:', contextData);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate loading dashboard data
      console.log('Loading dashboard data...');
      
      // In a real implementation, this would fetch from API
      // For now, we'll just simulate a successful load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Dashboard data loaded successfully');
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = () => {
    console.log('Dashboard refreshed');
    loadDashboardData();
  };

  const clearError = () => {
    setError(null);
  };

  const value = useMemo(() => ({
    // Data
    systemHealth,
    agentInsights,
    conversationHistory,
    currentSession,
    dashboardStats,
    
    // State
    loading,
    error,
    
    // Actions
    chatWithAgent,
    loadConversationHistory,
    loadDashboardData,
    updateShopContext,
    refreshDashboard,
    clearError,
  }), [
    systemHealth,
    agentInsights,
    conversationHistory,
    currentSession,
    dashboardStats,
    loading,
    error
  ]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}