'use client'

import { useState, useEffect } from 'react'
import StreamingChat from '../../../../components/ai/StreamingChat'
import { createClient } from '../../../../lib/supabase/client'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function ChatDashboard() {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      
      setAgents(data)
      if (data.length > 0 && !selectedAgent) {
        setSelectedAgent(data[0])
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (message) => {
    console.log('New message:', message)
    // You can add additional handling here like analytics tracking
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <Link href="/dashboard" className="mr-4">
                  <ArrowLeftIcon className="h-6 w-6 text-gray-600 hover:text-gray-900" />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">AI Business Advisors</h1>
                  <p className="mt-1 text-gray-600">Chat with AI experts to grow your barbershop</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Agent Selection */}
            <div className="lg:col-span-1">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Choose Your Advisor</h2>
              <div className="space-y-4">
                {agents.map((agent) => {
                  const agentColors = {
                    booking: 'blue',
                    marketing: 'purple',
                    analytics: 'green',
                    support: 'yellow',
                  }
                  const color = agentColors[agent.type] || 'gray'
                  
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAgent?.id === agent.id
                          ? `border-${color}-500 bg-${color}-50`
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="text-3xl">
                          {agent.type === 'booking' && '📅'}
                          {agent.type === 'marketing' && '📣'}
                          {agent.type === 'analytics' && '📊'}
                          {agent.type === 'support' && '💬'}
                          {!['booking', 'marketing', 'analytics', 'support'].includes(agent.type) && '🤖'}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                          {agent.capabilities && agent.capabilities.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-2">Capabilities:</p>
                              <div className="flex flex-wrap gap-1">
                                {agent.capabilities.slice(0, 3).map((capability, index) => (
                                  <span
                                    key={index}
                                    className={`inline-block px-2 py-1 text-xs rounded-full bg-${color}-100 text-${color}-700`}
                                  >
                                    {capability}
                                  </span>
                                ))}
                                {agent.capabilities.length > 3 && (
                                  <span className="inline-block px-2 py-1 text-xs text-gray-500">
                                    +{agent.capabilities.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* AI Features */}
              <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
                <div className="flex items-center mb-3">
                  <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">AI-Powered Features</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Streaming responses with GPT-4
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Conversation history saved automatically
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Industry-specific barbershop insights
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Available 24/7 to answer questions
                  </li>
                </ul>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              {selectedAgent && (
                <div className="h-[600px]">
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Chat with {selectedAgent.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Get personalized advice for your barbershop business
                    </p>
                  </div>
                  <StreamingChat
                    key={selectedAgent.id} // Force remount when agent changes
                    agentId={selectedAgent.id}
                    placeholder={`Ask ${selectedAgent.name} anything...`}
                    onNewMessage={handleNewMessage}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}