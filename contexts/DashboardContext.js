'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';
import { agenticCoach, system } from '../lib/api';
import { useAuth } from './AuthContext';

const DashboardContext = createContext({});

export function DashboardProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
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
    if (isAuthenticated && user) {
      loadDashboardData();
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load system health and insights in parallel
      const [healthData, insightsData] = await Promise.allSettled([
        system.health(),
        agenticCoach.getLearningInsights()
      ]);

      // Process health data
      if (healthData.status === 'fulfilled') {
        setSystemHealth(healthData.value);
        
        // Update stats based on system health
        setDashboardStats(prev => ({
          ...prev,
          systemUptime: healthData.value.status === 'healthy' ? '99.9%' : '95.2%',
          responseTime: healthData.value.database?.healthy ? '< 200ms' : '< 500ms'
        }));
      }

      // Process insights data
      if (insightsData.status === 'fulfilled') {
        setAgentInsights(insightsData.value);
        
        // Update conversation stats
        const totalInteractions = insightsData.value.coach_learning_data?.total_interactions || 0;
        setDashboardStats(prev => ({
          ...prev,
          totalConversations: totalInteractions
        }));
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
      
      const response = await agenticCoach.chat(message, shopContext, currentSession);
      
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

      // Update stats
      setDashboardStats(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1
      }));

      return response;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    }
  };

  const loadConversationHistory = async (sessionId) => {
    try {
      const history = await agenticCoach.getConversationHistory(sessionId);
      setConversationHistory(history.messages || []);
      setCurrentSession(sessionId);
    } catch (err) {
      console.error('Failed to load conversation history:', err);
      setError('Failed to load conversation history');
    }
  };

  const updateShopContext = async (contextData) => {
    try {
      await agenticCoach.updateShopContext(contextData);
      // Refresh insights after context update
      const insightsData = await agenticCoach.getLearningInsights();
      setAgentInsights(insightsData);
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