'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import AgentActivityMonitor, { MiniAgentActivityIndicator } from '../../components/AgentActivityMonitor'
import AgentCollaborationIndicator from '../../components/AgentCollaborationIndicator'
import ProtectedRoute from '../../components/ProtectedRoute'
import TouchOptimizedButton, { TouchCard, TouchInput, TouchTextarea } from '../../components/TouchOptimizedButton'
import VoiceAssistant from '../../components/VoiceAssistant'
import PredictiveAnalyticsDashboard from '../../components/PredictiveAnalyticsDashboard'
import WorkflowAutomationDashboard from '../../components/WorkflowAutomationDashboard'
import SocialMediaDashboard from '../../components/SocialMediaDashboard'
import { useAgentCollaboration } from '../../hooks/useAgentCollaboration'

export default function AIAgentsPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agentStatus, setAgentStatus] = useState(null)
  const [lastStatusUpdate, setLastStatusUpdate] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [conversationContext, setConversationContext] = useState(null)
  
  // Use collaboration hook
  const {
    collaborationData,
    isCollaborating,
    activeAgents,
    sendToAgents,
    processAgentResponse,
    getCollaborationStats
  } = useAgentCollaboration()

  // Initialize persistent session ID
  useEffect(() => {
    // Try to get existing session from localStorage or create new one
    let existingSession = null
    try {
      existingSession = localStorage.getItem('ai_chat_session_id')
    } catch (e) {
      console.warn('LocalStorage not available')
    }
    
    if (existingSession) {
      setSessionId(existingSession)
      // Load conversation history from memory
      loadConversationHistory(existingSession)
    } else {
      const newSessionId = `persistent_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      try {
        localStorage.setItem('ai_chat_session_id', newSessionId)
      } catch (e) {
        console.warn('Could not save session ID to localStorage')
      }
    }
  }, [])

  useEffect(() => {
    loadAgentStatus()
    
    // Set up real-time status updates every 30 seconds
    const statusInterval = setInterval(() => {
      loadAgentStatus()
    }, 30000)

    return () => clearInterval(statusInterval)
  }, [])

  const loadAgentStatus = async () => {
    try {
      const res = await fetch('/api/ai/agents/status')
      const data = await res.json()
      setAgentStatus(data)
      setLastStatusUpdate(new Date())
    } catch (error) {
      console.error('Failed to load agent status:', error)
    }
  }

  const loadConversationHistory = async (sessionId) => {
    try {
      const response = await fetch(`/api/ai/memory?sessionId=${sessionId}`)
      const data = await response.json()
      
      if (data.success && data.memory && data.memory.recentMessages) {
        const historyMessages = data.memory.recentMessages.map((msg, idx) => [
          { 
            type: 'user', 
            content: msg.userMessage, 
            timestamp: new Date(msg.timestamp),
            id: `${msg.id}_user`
          },
          { 
            type: 'agent', 
            content: {
              message: msg.aiResponse,
              agent_details: { primary_agent: msg.agent },
              message_type: msg.messageType,
              confidence: 0.8,
              concerns: msg.concerns || [],
              sentiment: msg.sentiment || 'neutral'
            }, 
            timestamp: new Date(msg.timestamp),
            id: `${msg.id}_agent`
          }
        ]).flat()
        
        setConversationHistory(historyMessages)
        setConversationContext(data.memory)
      }
    } catch (error) {
      console.warn('Could not load conversation history:', error)
    }
  }

  const sendMessage = async () => {
    if (!message.trim() || !sessionId) return

    setLoading(true)
    try {
      const businessContext = {
        shop_name: 'Demo Barbershop',
        customer_count: 150,
        monthly_revenue: 5000,
        location: 'Downtown',
        staff_count: 3,
        barbershop_id: 'demo'
      }

      // Call the analytics-enhanced chat API with persistent session
      const response = await fetch('/api/ai/analytics-enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          business_context: businessContext,
          barbershop_id: 'demo'
        })
      })

      const aiData = await response.json()
      
      if (aiData.success) {
        setResponse(aiData)
        
        // Add to conversation history 
        const newUserMessage = { 
          type: 'user', 
          content: message, 
          timestamp: new Date(),
          id: `user_${Date.now()}`
        }
        const newAgentMessage = { 
          type: 'agent', 
          content: aiData, 
          timestamp: new Date(),
          id: `agent_${Date.now()}`
        }
        
        setConversationHistory(prev => [...prev, newUserMessage, newAgentMessage])
        
        // Update conversation context
        if (conversationContext) {
          setConversationContext(prev => ({
            ...prev,
            messages: [...(prev.messages || []), {
              userMessage: message,
              aiResponse: aiData.message,
              messageType: aiData.message_type,
              agent: aiData.agent_details?.primary_agent || 'AI Assistant',
              timestamp: new Date().toISOString(),
              concerns: aiData.contextual_insights?.concerns || [],
              sentiment: aiData.contextual_insights?.sentiment || 'neutral'
            }]
          }))
        }
        
        setMessage('')
      } else {
        console.error('AI communication failed:', aiData.error)
        setResponse({
          success: false,
          error: aiData.error || 'Failed to get AI response',
          fallback: true,
          message: "I'm having trouble right now. Please try asking about your revenue, bookings, or customer metrics."
        })
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setResponse({
        success: false,
        error: error.message,
        fallback: true
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getAgentIcon = (agentName) => {
    if (agentName?.toLowerCase().includes('financial') || agentName?.toLowerCase().includes('marcus')) return '💰'
    if (agentName?.toLowerCase().includes('marketing') || agentName?.toLowerCase().includes('sophia')) return '📱'
    if (agentName?.toLowerCase().includes('operations') || agentName?.toLowerCase().includes('david')) return '⚙️'
    return '🤖'
  }

  const testQuestions = [
    "How can I increase my barbershop's revenue?",
    "What's the best social media strategy for my barbershop?",
    "How should I schedule my staff for maximum efficiency?",
    "Help me improve customer retention and loyalty",
    "What pricing strategy should I use for premium services?"
  ]

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* AI Agents Header - Dashboard Style */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-black/10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>
          
          <div className="relative px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 leading-tight text-white drop-shadow-sm flex items-center">
                    <span className="text-4xl mr-3">🧠</span>
                    AI Agent Personalities
                  </h1>
                  <p className="text-blue-100 text-base sm:text-lg leading-relaxed">
                    Specialized AI business consultants for your barbershop
                  </p>
                </div>
                
                {/* Quick stats for AI agents */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <div className="bg-purple-500 p-1.5 rounded-lg mr-3">
                      <span className="text-white font-bold text-sm">AI</span>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{agentStatus?.active_agents || 6}</div>
                      <div className="text-xs text-blue-200">active agents</div>
                    </div>
                  </div>
                  <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <div className="bg-blue-500 p-1.5 rounded-lg mr-3">
                      <span className="text-white font-bold text-sm">💬</span>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-white">{conversationHistory.length}</div>
                      <div className="text-xs text-blue-200">conversations</div>
                    </div>
                  </div>
                  <div className="flex items-center bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg">
                    <div className="bg-green-500 p-1.5 rounded-lg mr-3">
                      <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-200">Online</div>
                      <div className="text-xs text-green-300">system status</div>
                    </div>
                  </div>
                </div>
                
                {/* Real-time Status Indicator */}
                {lastStatusUpdate && (
                  <div className="mt-2 text-center">
                    <div className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full inline-flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-200">
                        Updated {lastStatusUpdate.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Back to Dashboard Link */}
              <div className="mt-4 lg:mt-0">
                <Link
                  href="/dashboard"
                  className="flex items-center bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 hover:border-white/50 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
                >
                  <ArrowLeftIcon className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
          
          {/* Bottom gradient fade */}
          <div className="h-2 sm:h-4 bg-gradient-to-b from-purple-600/20 to-transparent"></div>
        </div>
        
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4 sm:p-6 max-w-6xl">

      {/* Chat Interface - Moved to Top for Prominence */}
      <div className="bg-white rounded-lg shadow-md border mb-8">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <span className="text-3xl mr-3">💬</span>
                Chat with AI Business Experts
              </h3>
              <p className="text-lg text-gray-600 mt-2">Get instant insights about finances, marketing, operations, and growth strategies</p>
            </div>
            <MiniAgentActivityIndicator />
          </div>
        </div>

        {/* Chat History */}
        {conversationHistory.length > 0 && (
          <div className="p-6 border-b bg-gray-50 max-h-96 overflow-y-auto">
            <h4 className="font-medium mb-4">Conversation History</h4>
            {conversationHistory.map((entry, idx) => (
              <div key={idx} className={`mb-4 ${entry.type === 'user' ? 'text-right' : 'text-left'}`}>
                {entry.type === 'user' ? (
                  <div className="inline-block max-w-xs lg:max-w-md px-4 py-2 bg-blue-600 text-white rounded-lg">
                    {entry.content}
                  </div>
                ) : (
                  <div className="max-w-4xl">
                    {/* Enhanced Collaboration Indicator for this response */}
                    {entry.collaboration && (
                      <div className="mb-3">
                        <AgentCollaborationIndicator 
                          collaborationData={entry.collaboration}
                          isVisible={true}
                        />
                      </div>
                    )}
                    
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-2xl">{getAgentIcon(entry.content.agent_details?.primary_agent)}</span>
                      <div>
                        <div className="font-medium text-sm text-gray-700">
                          {entry.content.agent_details?.primary_agent || 'AI Assistant'}
                        </div>
                        {entry.content.agent_details?.coordination_summary && (
                          <div className="text-xs text-gray-500 mb-2">
                            {entry.content.agent_details.coordination_summary}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white border rounded-lg p-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{entry.content.message || entry.content.response || "AI response"}</p>
                      {entry.content.agent_details?.recommendations && (
                        <div className="mt-4">
                          <h5 className="font-medium text-sm mb-2">🎯 Key Recommendations:</h5>
                          <ul className="text-sm space-y-1">
                            {entry.content.agent_details.recommendations.slice(0, 3).map((rec, ridx) => (
                              <li key={ridx} className="flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>Confidence: {Math.round((entry.content.confidence || 0) * 100)}%</span>
                      {entry.content.agent_enhanced && <span className="text-green-600">✨ Specialized Agent</span>}
                      {entry.content.fallback && <span className="text-yellow-600">⚠️ Fallback Mode</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Current Response Display */}
        {response && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">{getAgentIcon(response.agent_details?.primary_agent)}</span>
              <div>
                <h4 className="font-semibold text-lg">
                  {response.agent_details?.primary_agent || 'AI Assistant'}
                </h4>
                {response.agent_details?.coordination_summary && (
                  <p className="text-sm text-gray-600 mb-2">
                    {response.agent_details.coordination_summary}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Confidence: {Math.round((response.confidence || 0) * 100)}%</span>
                  <span>Provider: {response.provider}</span>
                  {response.agent_enhanced && <span className="text-green-600">✨ Specialized Agent</span>}
                  {response.fallback && <span className="text-yellow-600">⚠️ Fallback Mode</span>}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border">
              <p className="text-gray-800 whitespace-pre-wrap mb-4">{response.message || response.response || "I'm here to help with your business needs!"}</p>
              
              {response.agent_details?.recommendations && (
                <div className="mb-4">
                  <h5 className="font-semibold mb-2">🎯 Recommendations:</h5>
                  <ul className="space-y-2">
                    {response.agent_details.recommendations.slice(0, 5).map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">•</span>
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.agent_details?.action_items && response.agent_details.action_items.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold mb-2">✅ Action Items:</h5>
                  <div className="space-y-2">
                    {response.agent_details.action_items.slice(0, 3).map((action, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          action.priority === 'high' ? 'bg-red-100 text-red-800' :
                          action.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {action.priority}
                        </span>
                        <span>{action.task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {response.agent_details?.follow_up_questions && (
                <div>
                  <h5 className="font-semibold mb-2">❓ Follow-up Questions:</h5>
                  <div className="space-y-1">
                    {response.agent_details.follow_up_questions.slice(0, 2).map((question, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMessage(question)}
                        className="block text-left text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Input - Prominent Position */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <TouchTextarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about revenue, marketing, operations, staff management, or any business topic..."
                rows={3}
                disabled={loading}
                className="w-full text-lg"
              />
            </div>
            <div className="flex-shrink-0">
              <TouchOptimizedButton
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                loading={loading}
                size="large"
                variant="primary"
                icon={!loading && '🚀'}
                className="w-full sm:w-auto min-w-[120px] text-lg py-3"
              >
                Send
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Dashboard */}
      {agentStatus && agentStatus.agents && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {agentStatus.agents.slice(0, 6).map((agent, index) => (
            <div key={agent.id} className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center">
                  <span className="text-2xl mr-2">{getAgentIcon(agent.name)}</span>
                  {agent.name}
                </h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'online' ? 'bg-green-500 animate-pulse' :
                    agent.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className={`text-xs font-medium ${
                    agent.status === 'online' ? 'text-green-600' :
                    agent.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {agent.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2 capitalize">{agent.type} specialist</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {agent.type === 'strategic' ? 'Business strategy, decision making, growth planning' :
                 agent.type === 'analytical' ? 'Revenue optimization, financial analysis, pricing strategy' :
                 agent.type === 'marketing' ? 'Customer acquisition, social media, brand development' :
                 agent.type === 'operational' ? 'Scheduling, workflow optimization, staff management' :
                 agent.type === 'creative' ? 'Brand strategy, creative campaigns, visual design' :
                 agent.type === 'growth' ? 'Growth hacking, performance optimization, scaling' :
                 'Mindset coaching, strategic thinking, leadership development'}
              </p>
              <div className="mt-4 text-xs text-gray-400 flex items-center justify-between">
                <span>Provider: {agent.provider}</span>
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                  AI
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Touch-Optimized Quick Test Questions */}
      <div className="bg-white rounded-lg shadow-md p-6 border mb-8">
        <h3 className="text-lg font-semibold mb-4">💡 Try These Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testQuestions.map((question, idx) => (
            <TouchCard
              key={idx}
              onClick={() => setMessage(question)}
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors cursor-pointer"
            >
              <p className="text-sm text-gray-700 leading-relaxed">{question}</p>
            </TouchCard>
          ))}
        </div>
      </div>

      {/* Advanced AI Features Grid */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Voice Assistant */}
        <div>
          <VoiceAssistant barbershop_id="demo" />
        </div>
        
        {/* Predictive Analytics */}
        <div>
          <PredictiveAnalyticsDashboard barbershop_id="demo" compact={true} />
        </div>
      </div>

      {/* Workflow Automation - Full Width */}
      <div className="mt-8 mb-8">
        <WorkflowAutomationDashboard barbershop_id="demo" />
      </div>

      {/* Social Media Integration - Full Width */}
      <div className="mt-8 mb-8">
        <SocialMediaDashboard barbershop_id="demo" />
      </div>

      {/* System Status with Collaboration Stats */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agentStatus && (
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="text-2xl mr-2">🔧</span>
              System Status
              <div className={`ml-auto w-3 h-3 rounded-full ${
                agentStatus.system_status === 'healthy' ? 'bg-green-500 animate-pulse' :
                agentStatus.system_status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {agentStatus.total_agents || 7}
                </div>
                <div className="text-sm text-gray-600">Total Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {agentStatus.active_agents || 6}
                </div>
                <div className="text-sm text-gray-600">Active Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {agentStatus.system_metrics?.success_rate || '98.5%'}
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {agentStatus.system_metrics?.uptime || '99.7%'}
                </div>
                <div className="text-sm text-gray-600">System Uptime</div>
              </div>
            </div>
            
            {/* AI Services Status */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Services</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(agentStatus.ai_services || {}).map(([service, status]) => 
                  service !== 'system_healthy' && (
                    <div key={service} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        status ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <span className={`text-xs ${
                        status ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {service.charAt(0).toUpperCase() + service.slice(1)}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Collaboration Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6 border">
          <h3 className="text-lg font-semibold mb-4">🤝 Collaboration Stats</h3>
          {(() => {
            const stats = getCollaborationStats()
            return (
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {stats.total_collaborations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Queries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((stats.avg_collaboration_score || 0) * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Quality</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {stats.multi_agent_collaborations || 0}
                  </div>
                  <div className="text-sm text-gray-600">Multi-Agent</div>
                </div>
                <div>
                  <div className="text-lg font-medium text-gray-700">
                    {stats.most_active_agent || 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Most Active</div>
                </div>
              </div>
            )
          })()} 
        </div>
      </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}