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

// Mock data for AI agents
const mockAgents = [
  {
    id: 1,
    name: 'Financial Agent',
    type: 'financial',
    status: 'active',
    avatar: null,
    description: 'Helps optimize revenue, pricing strategies, and financial planning',
    totalInteractions: 2847,
    successRate: 96,
    avgResponseTime: 1.2,
    lastActive: '2024-01-15T10:30:00Z',
    specialties: ['Revenue Optimization', 'Pricing Strategy', 'Cost Analysis', 'Profit Maximization'],
    recentActivity: [
      { date: '2024-01-15', interactions: 12 },
      { date: '2024-01-14', interactions: 8 },
      { date: '2024-01-13', interactions: 15 },
      { date: '2024-01-12', interactions: 10 },
      { date: '2024-01-11', interactions: 7 },
      { date: '2024-01-10', interactions: 11 },
      { date: '2024-01-09', interactions: 9 }
    ]
  },
  {
    id: 2,
    name: 'Client Acquisition Agent',
    type: 'client_acquisition',
    status: 'active',
    avatar: null,
    description: 'Specializes in marketing strategies and customer acquisition',
    totalInteractions: 1923,
    successRate: 92,
    avgResponseTime: 1.8,
    lastActive: '2024-01-15T09:45:00Z',
    specialties: ['Social Media Marketing', 'Referral Programs', 'Lead Generation', 'Customer Retention'],
    recentActivity: [
      { date: '2024-01-15', interactions: 8 },
      { date: '2024-01-14', interactions: 12 },
      { date: '2024-01-13', interactions: 6 },
      { date: '2024-01-12', interactions: 14 },
      { date: '2024-01-11', interactions: 10 },
      { date: '2024-01-10', interactions: 5 },
      { date: '2024-01-09', interactions: 13 }
    ]
  },
  {
    id: 3,
    name: 'Operations Agent',
    type: 'operations',
    status: 'active',
    avatar: null,
    description: 'Optimizes scheduling, efficiency, and operational workflows',
    totalInteractions: 1654,
    successRate: 89,
    avgResponseTime: 2.1,
    lastActive: '2024-01-15T08:20:00Z',
    specialties: ['Schedule Optimization', 'Staff Management', 'Workflow Automation', 'Efficiency Analysis'],
    recentActivity: [
      { date: '2024-01-15', interactions: 6 },
      { date: '2024-01-14', interactions: 9 },
      { date: '2024-01-13', interactions: 11 },
      { date: '2024-01-12', interactions: 7 },
      { date: '2024-01-11', interactions: 12 },
      { date: '2024-01-10', interactions: 8 },
      { date: '2024-01-09', interactions: 10 }
    ]
  },
  {
    id: 4,
    name: 'Brand Development Agent',
    type: 'brand',
    status: 'active',
    avatar: null,
    description: 'Focuses on branding, positioning, and premium service development',
    totalInteractions: 1287,
    successRate: 94,
    avgResponseTime: 1.5,
    lastActive: '2024-01-15T07:15:00Z',
    specialties: ['Brand Positioning', 'Premium Services', 'Customer Experience', 'Visual Identity'],
    recentActivity: [
      { date: '2024-01-15', interactions: 4 },
      { date: '2024-01-14', interactions: 7 },
      { date: '2024-01-13', interactions: 9 },
      { date: '2024-01-12', interactions: 5 },
      { date: '2024-01-11', interactions: 8 },
      { date: '2024-01-10', interactions: 6 },
      { date: '2024-01-09', interactions: 7 }
    ]
  },
  {
    id: 5,
    name: 'Growth Strategy Agent',
    type: 'growth',
    status: 'active',
    avatar: null,
    description: 'Specializes in scaling strategies and business expansion',
    totalInteractions: 891,
    successRate: 98,
    avgResponseTime: 1.1,
    lastActive: '2024-01-15T06:30:00Z',
    specialties: ['Expansion Planning', 'Multi-location Strategy', 'Franchising', 'Market Analysis'],
    recentActivity: [
      { date: '2024-01-15', interactions: 3 },
      { date: '2024-01-14', interactions: 5 },
      { date: '2024-01-13', interactions: 4 },
      { date: '2024-01-12', interactions: 6 },
      { date: '2024-01-11', interactions: 2 },
      { date: '2024-01-10', interactions: 7 },
      { date: '2024-01-09', interactions: 5 }
    ]
  }
]

// Mock conversation history
const mockConversations = [
  {
    id: 1,
    agentId: 1,
    agentName: 'Financial Agent',
    user: 'Shop Owner',
    message: 'What pricing strategy would maximize my revenue for premium cuts?',
    response: 'Based on your market analysis, I recommend implementing a tiered pricing model with premium cuts at $95-110, targeting 25% higher margins during peak hours.',
    timestamp: '2024-01-15T10:30:00Z',
    satisfaction: 5,
    category: 'pricing'
  },
  {
    id: 2,
    agentId: 2,
    agentName: 'Client Acquisition Agent',
    user: 'Shop Owner',
    message: 'How can I improve my social media engagement?',
    response: 'Focus on before/after transformation posts, client testimonials, and behind-the-scenes content. Post consistently at 6-8 PM when engagement peaks.',
    timestamp: '2024-01-15T09:45:00Z',
    satisfaction: 4,
    category: 'marketing'
  },
  {
    id: 3,
    agentId: 3,
    agentName: 'Operations Agent',
    user: 'Shop Owner',
    message: 'How should I optimize my weekend schedule?',
    response: 'Based on historical data, block 30-minute slots for premium services and 20-minute for standard cuts. This reduces wait times by 35%.',
    timestamp: '2024-01-15T08:20:00Z',
    satisfaction: 5,
    category: 'scheduling'
  }
]

// Agent Card Component
const AgentCard = ({ agent, onClick }) => (
  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer" onClick={() => onClick(agent)}>
    <CardContent className="p-6">
      <div className="flex items-start space-x-4">
        <Avatar
          name={agent.name}
          src={agent.avatar}
          size="lg"
          className="bg-gradient-to-br from-brand-500 to-brand-600"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {agent.name}
            </h3>
            <StatusBadge status={agent.status} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            {agent.description}
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Interactions</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatNumber(agent.totalInteractions)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-sm font-semibold text-success-600">
                {agent.successRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Response</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {agent.avgResponseTime}s
              </p>
            </div>
          </div>
          
          {/* Specialties */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">Specialties</p>
            <div className="flex flex-wrap gap-1">
              {agent.specialties.slice(0, 3).map((specialty, index) => (
                <Badge key={index} variant="outline" size="sm">
                  {specialty}
                </Badge>
              ))}
              {agent.specialties.length > 3 && (
                <Badge variant="outline" size="sm">
                  +{agent.specialties.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// Chat Interface Component
const ChatInterface = ({ agent, onClose }) => {
  const [message, setMessage] = useState('')
  const [conversation, setConversation] = useState([])
  const [loading, setLoading] = useState(false)

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

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: Date.now() + 1,
        type: 'agent',
        content: `Based on your question about "${message}", I recommend implementing a strategic approach that leverages industry best practices. Here's my detailed analysis and recommendations...`,
        timestamp: new Date().toISOString()
      }
      setConversation(prev => [...prev, aiResponse])
      setLoading(false)
    }, 2000)
  }

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl" title={`Chat with ${agent.name}`}>
      <ModalContent>
        <div className="h-96 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 mb-4">
            {conversation.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-xl">🤖</span>
                </div>
                <p className="font-medium">Start a conversation with {agent.name}</p>
                <p className="text-sm mt-1">Ask about {agent.specialties[0].toLowerCase()} or any business topic</p>
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
                        'max-w-xs lg:max-w-md px-4 py-2 rounded-lg',
                        msg.type === 'user'
                          ? 'bg-brand-500 text-white'
                          : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDate(msg.timestamp, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
              placeholder="Ask me anything about your business..."
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!message.trim() || loading}>
              Send
            </Button>
          </div>
        </div>
      </ModalContent>
    </Modal>
  )
}

// Main AI Agents Dashboard Component
const AIAgentsDashboard = () => {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [agents] = useState(mockAgents)
  const [conversations] = useState(mockConversations)

  const handleAgentClick = (agent) => {
    setSelectedAgent(agent)
    setShowChat(true)
  }

  const handleCloseChat = () => {
    setShowChat(false)
    setSelectedAgent(null)
  }

  // Conversation table columns
  const conversationColumns = [
    {
      accessorKey: 'agentName',
      header: 'Agent',
      cell: ({ value, row }) => (
        <div className="flex items-center space-x-2">
          <Avatar name={value} size="sm" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      accessorKey: 'message',
      header: 'Question',
      cell: ({ value }) => (
        <span className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs block">
          {value}
        </span>
      )
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ value }) => <Badge variant="outline">{value}</Badge>
    },
    {
      accessorKey: 'satisfaction',
      header: 'Rating',
      cell: ({ value }) => (
        <div className="flex space-x-1">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < value ? 'text-yellow-400' : 'text-gray-300'}>
              ⭐
            </span>
          ))}
        </div>
      )
    },
    {
      accessorKey: 'timestamp',
      header: 'Date',
      type: 'date'
    }
  ]

  return (
    <PageWrapper
      title="AI Agents"
      description="Manage and interact with your intelligent business assistants"
      action={
        <Button>
          View All Analytics
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={handleAgentClick}
            />
          ))}
        </div>

        {/* Agent Performance Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BarChart
            data={agents.map(agent => ({
              name: agent.name.replace(' Agent', ''),
              interactions: agent.totalInteractions,
              successRate: agent.successRate
            }))}
            title="Total Interactions by Agent"
            bars={[{ dataKey: 'interactions', fill: '#0ea5e9', name: 'Interactions' }]}
            height={300}
          />
          <BarChart
            data={agents.map(agent => ({
              name: agent.name.replace(' Agent', ''),
              successRate: agent.successRate
            }))}
            title="Success Rate by Agent"
            bars={[{ dataKey: 'successRate', fill: '#10b981', name: 'Success Rate (%)' }]}
            height={300}
          />
        </div>

        {/* Recent Conversations */}
        <DataTable
          data={conversations}
          columns={conversationColumns}
          title="Recent Conversations"
          description="Latest interactions with AI agents"
          searchable={true}
          pageSize={10}
        />
      </div>

      {/* Chat Modal */}
      {showChat && selectedAgent && (
        <ChatInterface
          agent={selectedAgent}
          onClose={handleCloseChat}
        />
      )}
    </PageWrapper>
  )
}

export default AIAgentsDashboard