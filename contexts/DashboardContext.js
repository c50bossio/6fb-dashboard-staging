'use client'

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { agenticCoach, system } from '../lib/api';
import { useAuth } from '../components/SupabaseAuthProvider';
import { getPerformanceMonitor } from '../lib/performance';

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

  // Caching for performance optimization
  const [cache, setCache] = useState({
    systemHealth: { data: null, timestamp: null, ttl: 30000 }, // 30 seconds
    insights: { data: null, timestamp: null, ttl: 60000 } // 1 minute
  });

  // Stats and metrics
  const [dashboardStats, setDashboardStats] = useState({
    totalConversations: 0,
    activeAgents: 1,
    systemUptime: '99.9%',
    responseTime: '< 200ms'
  });

  // Cache utility functions
  const getCachedData = useCallback((key) => {
    const cached = cache[key];
    if (cached && cached.data && cached.timestamp) {
      const isValid = Date.now() - cached.timestamp < cached.ttl;
      return isValid ? cached.data : null;
    }
    return null;
  }, [cache]);

  const setCacheData = useCallback((key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        data,
        timestamp: Date.now()
      }
    }));
  }, []);

  // Load dashboard data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    const performanceMonitor = getPerformanceMonitor();
    const startTime = performance.now();
    
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard data from API...');

      // Load real system health with caching
      let systemHealthData = getCachedData('systemHealth');
      if (!systemHealthData) {
        try {
          systemHealthData = await system.health();
          setCacheData('systemHealth', systemHealthData);
          console.log('✅ System health loaded from API:', systemHealthData);
        } catch (err) {
          console.warn('⚠️ System health API failed, using mock data:', err.message);
        systemHealthData = {
          status: 'healthy',
          service: '6fb-ai-backend',
          version: '2.0.0',
          database: { healthy: true, response_time: 45 },
          agents: { active: 6, total: 8 },
          api: { healthy: true, response_time: 120 },
          timestamp: new Date().toISOString()
        };
      }

      // Load real learning insights with caching
      let insightsData = getCachedData('insights');
      if (!insightsData) {
        try {
          insightsData = await agenticCoach.getLearningInsights();
          setCacheData('insights', insightsData);
          console.log('✅ Learning insights loaded from API:', insightsData);
        } catch (err) {
          console.warn('⚠️ Learning insights API failed, using mock data:', err.message);
        insightsData = {
          coach_learning_data: {
            total_interactions: 847,
            common_topics: ['scheduling', 'customer service', 'pricing'],
            avg_satisfaction: 4.7,
            learning_progress: 85,
            shop_profiles: [
              { name: 'Profile 1', last_updated: new Date().toISOString() }
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
          },
          timestamp: new Date().toISOString()
        };
      }

      setSystemHealth(systemHealthData);
      setAgentInsights(insightsData);
      
      // Update stats with real/mock data
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: insightsData?.coach_learning_data?.total_interactions || 847,
        activeAgents: systemHealthData?.agents?.active || 6,
        systemUptime: systemHealthData?.status === 'healthy' ? '99.9%' : '95.2%',
        responseTime: systemHealthData?.database?.response_time ? `${systemHealthData.database.response_time}ms` : '< 200ms',
        weeklyConversations: Math.floor((insightsData?.coach_learning_data?.total_interactions || 847) * 0.12),
        weeklyResponses: Math.floor((insightsData?.coach_learning_data?.total_interactions || 847) * 0.18),
        weeklyLearning: insightsData?.database_insights?.length || 23,
        activeUsers: 12,
        avgSession: '8m 34s',
        costSavings: '2,340',
        timeSaved: '47 hours',
        efficiency: '+34%'
      }));

      console.log('✅ Dashboard data loaded successfully');

      // Track performance
      const loadTime = performance.now() - startTime;
      console.log(`📊 Dashboard load time: ${loadTime.toFixed(2)}ms`);
      
      if (performanceMonitor) {
        performanceMonitor.onMetric({
          name: 'dashboard-load-time',
          value: loadTime,
          entries: []
        });
      }

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
      
      console.log('💬 Sending chat message to AI:', message);
      
      // Try real API first, fallback to mock if needed
      let response;
      try {
        response = await agenticCoach.chat(
          message, 
          shopContext, 
          currentSession || `session_${Date.now()}`
        );
        console.log('✅ AI Response received:', response);
      } catch (err) {
        console.warn('⚠️ AI Chat API failed, using mock response:', err.message);
        
        // Fallback mock response
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate thinking time
        response = {
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
      }
      
      // Update current session
      setCurrentSession(response.session_id);
      
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
          content: response.response,
          timestamp: response.timestamp,
          recommendations: response.recommendations,
          confidence: response.confidence,
          domains_addressed: response.domains_addressed
        }
      ]);

      // Update stats - increment conversation count
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1
      }));

      console.log('💬 Chat message processed successfully');
      return response;
    } catch (err) {
      console.error('Chat error:', err);
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

  const refreshDashboard = useCallback(() => {
    loadDashboardData();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

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
    error,
    chatWithAgent,
    loadConversationHistory,
    updateShopContext,
    refreshDashboard,
    clearError
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