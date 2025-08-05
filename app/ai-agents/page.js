'use client'

import { useState, useEffect } from 'react'
import AgentCollaborationIndicator from '../../components/AgentCollaborationIndicator'
import AgentActivityMonitor, { MiniAgentActivityIndicator } from '../../components/AgentActivityMonitor'
import { useAgentCollaboration } from '../../hooks/useAgentCollaboration'
import TouchOptimizedButton, { TouchCard, TouchInput, TouchTextarea } from '../../components/TouchOptimizedButton'
import DashboardLayout from '../../components/layout/DashboardLayout'
import ProtectedRoute from '../../components/ProtectedRoute'

export default function AIAgentsPage() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agentStatus, setAgentStatus] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  
  // Use collaboration hook
  const {
    collaborationData,
    isCollaborating,
    activeAgents,
    sendToAgents,
    processAgentResponse,
    getCollaborationStats
  } = useAgentCollaboration()

  useEffect(() => {
    loadAgentStatus()
  }, [])

  const loadAgentStatus = async () => {
    try {
      const res = await fetch('/api/ai/agents')
      const data = await res.json()
      setAgentStatus(data)
    } catch (error) {
      console.error('Failed to load agent status:', error)
    }
  }

  const sendMessage = async () => {
    if (!message.trim()) return

    setLoading(true)
    try {
      const businessContext = {
        shop_name: 'Demo Barbershop',
        customer_count: 150,
        monthly_revenue: 5000,
        location: 'Downtown',
        staff_count: 3
      }

      // Use the collaboration hook for enhanced agent communication
      const result = await sendToAgents(message, {
        businessContext,
        sessionId: `session_${Date.now()}`,
        request_collaboration: true
      })

      if (result.success) {
        setResponse(result.data)
        
        // Add to conversation history with collaboration data
        setConversationHistory(prev => [...prev, 
          { type: 'user', content: message, timestamp: new Date() },
          { 
            type: 'agent', 
            content: result.data, 
            collaboration: result.collaboration,
            timestamp: new Date() 
          }
        ])
        
        setMessage('')
      } else {
        console.error('Agent communication failed:', result.error)
        setResponse({
          success: false,
          error: result.error,
          fallback: true
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
      <DashboardLayout showQuickActions={false}>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          🧠 AI Agent Personalities
        </h1>
        <p className="text-lg text-gray-600">
          Specialized AI business consultants for your barbershop
        </p>
      </div>

      {/* Agent Status Dashboard */}
      {agentStatus && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h3 className="text-lg font-semibold mb-2">💰 Marcus</h3>
            <p className="text-sm text-gray-600 mb-2">Financial Coach</p>
            <p className="text-xs">Revenue optimization, pricing strategy, financial planning</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Active</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h3 className="text-lg font-semibold mb-2">📱 Sophia</h3>
            <p className="text-sm text-gray-600 mb-2">Marketing Expert</p>
            <p className="text-xs">Social media, customer acquisition, brand development</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Active</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h3 className="text-lg font-semibold mb-2">⚙️ David</h3>
            <p className="text-sm text-gray-600 mb-2">Operations Manager</p>
            <p className="text-xs">Scheduling, workflow, staff management, efficiency</p>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600">Active</span>
            </div>
          </div>
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
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
            >
              <p className="text-sm text-gray-700 leading-relaxed">{question}</p>
            </TouchCard>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Chat with AI Specialists</h3>
              <p className="text-sm text-gray-600">Ask about finances, marketing, operations, or any business topic</p>
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
                      <p className="text-gray-800 whitespace-pre-wrap">{entry.content.response}</p>
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
              <p className="text-gray-800 whitespace-pre-wrap mb-4">{response.response}</p>
              
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

        {/* Touch-Optimized Input Area */}
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
                className="w-full"
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
                className="w-full sm:w-auto min-w-[120px]"
              >
                Send
              </TouchOptimizedButton>
            </div>
          </div>
        </div>
      </div>

      {/* System Status with Collaboration Stats */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {agentStatus && (
          <div className="bg-white rounded-lg shadow-md p-6 border">
            <h3 className="text-lg font-semibold mb-4">🔧 System Status</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {agentStatus.agent_system?.total_agents || 3}
                </div>
                <div className="text-sm text-gray-600">Total Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {agentStatus.agent_system?.active_agents || 3}
                </div>
                <div className="text-sm text-gray-600">Active Agents</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((agentStatus.performance_metrics?.avg_confidence || 0.85) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round((agentStatus.performance_metrics?.collaboration_rate || 0.3) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Collaboration Rate</div>
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
      </DashboardLayout>
    </ProtectedRoute>
  )
}