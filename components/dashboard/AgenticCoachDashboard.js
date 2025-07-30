'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge, StatusBadge } from '../ui/Badge'
import { Avatar } from '../ui/Avatar'
import { DataTable } from '../ui/Table'
import { LineChart, BarChart } from '../ui/Charts'
import { Modal, ModalContent, ModalFooter } from '../ui/Modal'
import { Input, FormGroup, Textarea } from '../ui/Input'
import { PageWrapper } from '../layout/Layout'
import { cn, formatDate, formatNumber } from '../../lib/utils'

// Agentic Coach Chat Interface Component
const AgenticChatInterface = ({ onClose }) => {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)
  const [shopContext, setShopContext] = useState({
    monthly_revenue: null,
    monthly_appointments: null,
    staff_count: null,
    location_type: null,
    avg_service_price: null,
    years_in_business: null
  })

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }

    setConversation(prev => [...prev, userMessage])
    setMessage('')
    setLoading(true)

    try {
      // Get authentication token
      const token = localStorage.getItem('access_token')
      
      const response = await fetch('http://localhost:8001/api/v1/agentic-coach/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          shop_context: shopContext,
          session_id: `agentic_${Date.now()}`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response from agentic coach')
      }

      const result = await response.json()

      const aiResponse = {
        id: Date.now() + 1,
        type: 'agent',
        content: result.response,
        recommendations: result.recommendations || [],
        confidence: result.confidence || 0.95,
        domains_addressed: result.domains_addressed || [],
        urgency: result.urgency || 'low',
        timestamp: new Date().toISOString()
      }

      setConversation(prev => [...prev, aiResponse])
    } catch (error) {
      const errorResponse = {
        id: Date.now() + 1,
        type: 'agent',
        content: `I apologize, but I'm having trouble connecting to the agentic coach system. Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
      setConversation(prev => [...prev, errorResponse])
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateContext = (field, value) => {
    setShopContext(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="4xl" title="🎯 Intelligent Business Coach">
      <ModalContent>
        <div className="h-[600px] flex flex-col">
          {/* Shop Context Panel */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
              Shop Context (Optional - helps provide better recommendations)
            </h4>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <Input
                type="number"
                placeholder="Monthly Revenue ($)"
                value={shopContext.monthly_revenue || ''}
                onChange={(e) => handleUpdateContext('monthly_revenue', parseFloat(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Monthly Appointments"
                value={shopContext.monthly_appointments || ''}
                onChange={(e) => handleUpdateContext('monthly_appointments', parseInt(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Staff Count"
                value={shopContext.staff_count || ''}
                onChange={(e) => handleUpdateContext('staff_count', parseInt(e.target.value))}
              />
              <Input
                placeholder="Location Type"
                value={shopContext.location_type || ''}
                onChange={(e) => handleUpdateContext('location_type', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Avg Service Price ($)"
                value={shopContext.avg_service_price || ''}
                onChange={(e) => handleUpdateContext('avg_service_price', parseFloat(e.target.value))}
              />
              <Input
                type="number"
                placeholder="Years in Business"
                value={shopContext.years_in_business || ''}
                onChange={(e) => handleUpdateContext('years_in_business', parseInt(e.target.value))}
              />
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 mb-4">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-2xl">🎯</span>
                </div>
                <p className="font-medium text-lg">Your Intelligent Business Coach</p>
                <p className="text-sm mt-2 max-w-md mx-auto">
                  I combine all business expertise into one intelligent system. Ask me about revenue optimization, 
                  customer acquisition, operations, growth strategy, or any business challenge.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">CAPABILITIES:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Financial Strategy', 'Marketing', 'Operations', 'Growth Planning', 'Brand Development'].map(capability => (
                      <Badge key={capability} variant="outline" size="sm">{capability}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.type === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-2xl px-4 py-3 rounded-lg',
                        msg.type === 'user'
                          ? 'bg-brand-500 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      
                      {/* Show recommendations if available */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">RECOMMENDATIONS:</p>
                          {msg.recommendations.map((rec, idx) => (
                            <div key={idx} className="bg-gray-100 dark:bg-gray-600 p-2 rounded text-xs">
                              <p className="font-semibold">{rec.title}</p>
                              <p className="text-gray-600 dark:text-gray-300">{rec.description}</p>
                              <p className="text-green-600 dark:text-green-400 font-medium">
                                Impact: {rec.estimated_impact}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show metadata */}
                      {msg.domains_addressed && msg.domains_addressed.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {msg.domains_addressed.map(domain => (
                            <Badge key={domain} variant="outline" size="xs">{domain}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs opacity-70">
                          {formatDate(msg.timestamp, 'HH:mm')}
                        </p>
                        {msg.confidence && (
                          <p className="text-xs opacity-70">
                            Confidence: {Math.round(msg.confidence * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-gray-500">Analyzing with RAG engine...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="flex space-x-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask me anything about your business strategy, operations, growth, or specific challenges..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!message.trim() || loading}>
              {loading ? 'Thinking...' : 'Send'}
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}

// Main Agentic Coach Dashboard Component
const AgenticCoachDashboard = () => {
  const [showChat, setShowChat] = useState(false)
  const [coachInfo, setCoachInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCoachInfo()
  }, [])

  const fetchCoachInfo = async () => {
    try {
      const response = await fetch('http://localhost:8001/api/v1/agents')
      const result = await response.json()
      setCoachInfo(result.agents[0]) // Get the agentic coach
    } catch (error) {
      console.error('Failed to fetch coach info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartChat = () => {
    setShowChat(true)
  }

  const handleCloseChat = () => {
    setShowChat(false)
  }

  if (loading) {
    return (
      <PageWrapper title="AI Business Coach" description="Loading...">
        <div className="animate-pulse">Loading agentic coach...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper
      title="🎯 Intelligent Business Coach"
      description="Your single AI assistant that gets smarter with data"
      action={
        <Button onClick={handleStartChat}>
          Start Conversation
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Coach Overview Card */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start space-x-6">
              <div className="w-24 h-24 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
                <span className="text-white text-4xl">🎯</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {coachInfo?.name || 'Intelligent Business Coach'}
                  </h2>
                  <StatusBadge status="active" />
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                  A single, intelligent AI system that combines all business expertise into one context-aware coach. 
                  Powered by RAG learning engine and gets smarter with every interaction.
                </p>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Coach Type</p>
                    <p className="text-lg font-semibold text-brand-600">
                      {coachInfo?.type || 'agentic_rag_powered'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Learning Engine</p>
                    <p className="text-lg font-semibold text-success-600">
                      {coachInfo?.learning_enabled ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Context Awareness</p>
                    <p className="text-lg font-semibold text-purple-600">
                      {coachInfo?.context_aware ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Business Domains</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {coachInfo?.total_capabilities || 'All Domains'}
                    </p>
                  </div>
                </div>

                {/* Capabilities */}
                {coachInfo?.capabilities && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">CORE CAPABILITIES</p>
                    <div className="flex flex-wrap gap-2">
                      {coachInfo.capabilities.map((capability, index) => (
                        <Badge key={index} variant="outline" size="lg">
                          {capability.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-brand-600 text-2xl">🧠</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Context Aware</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Maintains conversation memory and understands your business context for personalized recommendations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-success-100 dark:bg-success-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-success-600 text-2xl">📚</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">RAG Learning</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Continuously learns from interactions and real barbershop data to improve recommendations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 text-2xl">🎯</span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">All-in-One</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Replaces 7 separate agents with one intelligent system that handles all business domains
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Migration Notice */}
        <Card className="border-brand-200 bg-brand-50 dark:bg-brand-900/20">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✨</span>
              </div>
              <div>
                <h3 className="font-semibold text-brand-900 dark:text-brand-100 mb-2">
                  System Upgrade Complete
                </h3>
                <p className="text-brand-700 dark:text-brand-300 text-sm mb-3">
                  Your 7 specialized agents have been consolidated into one intelligent business coach. 
                  This new system provides better context awareness, continuous learning, and more coherent conversations.
                </p>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-brand-600 dark:text-brand-400">
                    ✓ Backward compatibility maintained
                  </span>
                  <span className="text-brand-600 dark:text-brand-400">
                    ✓ All previous capabilities included
                  </span>
                  <span className="text-brand-600 dark:text-brand-400">
                    ✓ Enhanced learning enabled
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" onClick={handleStartChat} className="h-16 flex flex-col items-center justify-center">
                <span className="text-lg mb-1">💬</span>
                <span className="text-xs">Start Chat</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <span className="text-lg mb-1">📊</span>
                <span className="text-xs">View Analytics</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <span className="text-lg mb-1">⚙️</span>
                <span className="text-xs">Configure Context</span>
              </Button>
              <Button variant="outline" className="h-16 flex flex-col items-center justify-center">
                <span className="text-lg mb-1">🎓</span>
                <span className="text-xs">Learning Insights</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <AgenticChatInterface onClose={handleCloseChat} />
      )}
    </PageWrapper>
  )
}

export default AgenticCoachDashboard