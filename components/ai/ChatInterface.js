'use client';

import { Send, Bot, User, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

/**
 * AI Chat Interface Component
 * Provides interactive chat with AI agents for business insights
 */
export default function ChatInterface({ 
  barbershopId = null,
  initialAgent = 'business_coach',
  className = '' 
}) {
  // State management
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(initialAgent);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Available AI agents
  const defaultAgents = [
    {
      id: 'business_coach',
      name: 'Business Coach',
      avatar: '👔',
      description: 'Strategic business advice'
    },
    {
      id: 'marketing_expert',
      name: 'Marketing Expert',
      avatar: '📈',
      description: 'Marketing and growth strategies'
    },
    {
      id: 'financial_advisor',
      name: 'Financial Advisor',
      avatar: '💰',
      description: 'Financial planning and analysis'
    },
    {
      id: 'operations_manager',
      name: 'Operations Manager',
      avatar: '⚙️',
      description: 'Efficiency and workflow optimization'
    }
  ];
  
  // Load agents on mount
  useEffect(() => {
    fetchAgents();
    // Generate conversation ID
    setConversationId(`conv_${Date.now()}`);
  }, []);
  
  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Fetch available agents from API
  const fetchAgents = async () => {
    try {
      // Import the AI client
      const { default: aiClient } = await import('@/lib/api/ai-client');
      const data = await aiClient.getAgents();
      
      // Map the response to include avatars
      const agentsWithAvatars = data.map(agent => ({
        ...agent,
        avatar: defaultAgents.find(d => d.id === agent.id)?.avatar || '🤖'
      }));
      
      setAgents(agentsWithAvatars);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setAgents(defaultAgents);
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Send message to AI
  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);
    
    try {
      // Use AI client for chat
      const { default: aiClient } = await import('@/lib/api/ai-client');
      
      const data = await aiClient.sendMessage(userMessage, selectedAgent, {
        barbershopId: barbershopId,
        conversationId: conversationId,
        includeAnalytics: true
      });
      
      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        agent_id: selectedAgent,
        content: data.response,
        suggestions: data.suggestions,
        analytics: data.analytics,
        timestamp: data.timestamp
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to get AI response. Please try again.');
      
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        error: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };
  
  // Handle agent change
  const handleAgentChange = (agentId) => {
    setSelectedAgent(agentId);
    // Optionally clear messages when switching agents
    // setMessages([]);
    
    // Add system message about agent switch
    const systemMessage = {
      id: Date.now(),
      role: 'system',
      content: `Switched to ${agents.find(a => a.id === agentId)?.name || agentId}`,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, systemMessage]);
  };
  
  // Clear conversation
  const clearConversation = () => {
    setMessages([]);
    setConversationId(`conv_${Date.now()}`);
    setError(null);
  };
  
  // Get current agent
  const currentAgent = agents.find(a => a.id === selectedAgent) || defaultAgents[0];
  
  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{currentAgent.avatar}</div>
            <div>
              <h3 className="font-semibold text-gray-900">{currentAgent.name}</h3>
              <p className="text-sm text-gray-500">{currentAgent.description}</p>
            </div>
          </div>
          <button
            onClick={clearConversation}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear conversation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Agent selector */}
        <div className="mt-3 flex space-x-2">
          {agents.map(agent => (
            <button
              key={agent.id}
              onClick={() => handleAgentChange(agent.id)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedAgent === agent.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {agent.avatar} {agent.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Hi! I'm your {currentAgent.name}.</p>
            <p className="text-sm mt-2">How can I help you today?</p>
          </div>
        )}
        
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.error
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : message.role === 'system'
                  ? 'bg-gray-100 text-gray-600 text-sm'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {/* Message header */}
              <div className="flex items-center space-x-2 mb-1">
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : message.role === 'system' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
                <span className="text-xs opacity-75">
                  {message.role === 'user' ? 'You' : 
                   message.role === 'system' ? 'System' : currentAgent.name}
                </span>
              </div>
              
              {/* Message content */}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
                  <div className="space-y-1">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="block w-full text-left text-sm bg-white bg-opacity-50 hover:bg-opacity-100 rounded px-2 py-1 transition-colors"
                      >
                        → {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Analytics preview */}
              {message.analytics && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Quick Insights:</p>
                  <div className="text-xs bg-white bg-opacity-50 rounded p-2">
                    <pre>{JSON.stringify(message.analytics, null, 2).substring(0, 200)}...</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-gray-600">Thinking...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Ask ${currentAgent.name} anything...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Quick actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setInputMessage("What are my top revenue opportunities?")}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Revenue opportunities
          </button>
          <button
            onClick={() => setInputMessage("How can I improve customer retention?")}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Customer retention
          </button>
          <button
            onClick={() => setInputMessage("What marketing strategies should I focus on?")}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Marketing strategies
          </button>
          <button
            onClick={() => setInputMessage("How can I optimize my schedule?")}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Schedule optimization
          </button>
        </div>
      </div>
    </div>
  );
}