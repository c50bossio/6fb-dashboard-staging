'use client'

import { useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import ProtectedRoute from '../../../components/ProtectedRoute'
import AIChat from '../../../components/AIChat'
import Link from 'next/link'
import { 
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function ChatDashboard() {
  const { user } = useAuth()
  const [selectedAgent, setSelectedAgent] = useState('business_coach')
  const [showChat, setShowChat] = useState(true)

  const agents = [
    {
      id: 'business_coach',
      name: 'Business Coach',
      description: 'Strategic guidance for growing your barbershop',
      avatar: '💼',
      color: 'blue',
      topics: ['Growth strategies', 'Operations', 'Customer service', 'Team management']
    },
    {
      id: 'marketing_expert',
      name: 'Marketing Expert',
      description: 'Marketing campaigns and customer engagement',
      avatar: '📣',
      color: 'purple',
      topics: ['Social media', 'Promotions', 'Brand building', 'Customer acquisition']
    },
    {
      id: 'financial_advisor',
      name: 'Financial Advisor',
      description: 'Revenue optimization and financial insights',
      avatar: '💰',
      color: 'green',
      topics: ['Pricing strategy', 'Cost management', 'Profit margins', 'Financial planning']
    }
  ]

  const currentAgent = agents.find(a => a.id === selectedAgent)

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
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgent(agent.id)
                      setShowChat(false)
                      setTimeout(() => setShowChat(true), 100)
                    }}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAgent === agent.id
                        ? `border-${agent.color}-500 bg-${agent.color}-50`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-3xl">{agent.avatar}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                        <div className="mt-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Ask about:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.topics.map((topic, index) => (
                              <span
                                key={index}
                                className={`inline-block px-2 py-1 text-xs rounded-full bg-${agent.color}-100 text-${agent.color}-700`}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                    Real-time responses tailored to your barbershop
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Conversation history saved for future reference
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Industry-specific insights and recommendations
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    Available 24/7 to answer your questions
                  </li>
                </ul>
              </div>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              {showChat && currentAgent && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Chat with {currentAgent.name}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Get personalized advice for your barbershop business
                    </p>
                  </div>
                  <AIChat agentId={selectedAgent} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}