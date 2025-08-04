'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { agenticCoach, system } from '../lib/api';
import { useAuth } from '../components/SupabaseAuthProvider';

const DashboardContext = createContext({});

export function DashboardProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dashboard data
  const [systemHealth, setSystemHealth] = useState(null);
  const [agentInsights, setAgentInsights] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  // Stats and metrics
  const [dashboardStats, setDashboardStats] = useState({
    totalConversations: 0,
    activeAgents: 1,
    systemUptime: '99.9%',
    responseTime: '< 200ms'
  });

  // Load dashboard data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard data...');

      // Create mock data for development
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading

      // Mock system health data
      const mockSystemHealth = {
        status: 'healthy',
        database: { healthy: true, response_time: 45 },
        agents: { active: 6, total: 8 },
        api: { healthy: true, response_time: 120 },
        timestamp: new Date().toISOString()
      };

      // Mock insights data
      const mockInsights = {
        coach_learning_data: {
          total_interactions: 847,
          common_topics: ['scheduling', 'customer service', 'pricing'],
          avg_satisfaction: 4.7,
          learning_progress: 85
        },
        performance_metrics: {
          accuracy: 94.2,
          response_time: 1.8,
          user_engagement: 78.5
        }
      };

      setSystemHealth(mockSystemHealth);
      setAgentInsights(mockInsights);
      
      // Update stats with mock data
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: mockInsights.coach_learning_data.total_interactions,
        activeAgents: mockSystemHealth.agents.active,
        systemUptime: '99.9%',
        responseTime: '< 200ms'
      }));

      console.log('✅ Dashboard data loaded successfully');

    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chatWithAgent = async (message, shopContext = null) => {
    try {
      setError(null);
      
      // Mock AI response for development
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking time
      
      const mockResponse = {
        session_id: currentSession || `session_${Date.now()}`,
        response: `I understand you're asking about "${message}". As your AI business coach, I can help you optimize your barbershop operations, improve customer satisfaction, and grow your revenue. What specific area would you like to focus on?`,
        timestamp: new Date().toISOString(),
        recommendations: [
          'Consider implementing online booking system',
          'Focus on customer retention strategies',
          'Analyze peak hours for optimal staffing'
        ],
        confidence: 0.92,
        domains_addressed: ['business_strategy', 'customer_service']
      };
      
      // Update current session
      setCurrentSession(mockResponse.session_id);
      
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
          content: mockResponse.response,
          timestamp: mockResponse.timestamp,
          recommendations: mockResponse.recommendations,
          confidence: mockResponse.confidence,
          domains_addressed: mockResponse.domains_addressed
        }
      ]);

      // Update stats
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1
      }));

      return mockResponse;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    }
  };

  const loadConversationHistory = async (sessionId) => {
    try {
      // Mock conversation history for development
      const mockHistory = {
        messages: [
          {
            role: 'user',
            content: 'How can I increase my barbershop revenue?',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            role: 'assistant', 
            content: 'Great question! Here are several proven strategies to boost your barbershop revenue: 1) Implement premium services like beard treatments, 2) Create loyalty programs, 3) Optimize your booking schedule during peak hours.',
            timestamp: new Date(Date.now() - 3500000).toISOString(),
            recommendations: ['Add premium services', 'Create loyalty program', 'Optimize scheduling']
          }
        ]
      };
      
      setConversationHistory(mockHistory.messages || []);
      setCurrentSession(sessionId);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
      setError('Failed to load conversation history');
    }
  };

  const updateShopContext = async (contextData) => {
    try {
      // Mock context update for development
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🔄 Shop context updated:', contextData);
      
      // Mock refresh of insights
      loadDashboardData();
    } catch (err) {
      console.error('Failed to update shop context:', err);
      setError('Failed to update shop context');
      throw err;
    }
  };

  const refreshDashboard = () => {
    loadDashboardData();
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
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
    updateShopContext,
    refreshDashboard,
    clearError,
  };

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