'use client'

import { useState } from 'react'
import { useAIAgent } from '../hooks/useAIAgent'
import LoadingSpinner from './LoadingSpinner'
import { 
  SparklesIcon,
  LightBulbIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  MegaphoneIcon
} from '@heroicons/react/24/outline'

export default function LangChainAIChat() {
  const [input, setInput] = useState('')
  const [businessContext, setBusinessContext] = useState({
    monthlyRevenue: '',
    clientCount: '',
    avgServicePrice: '',
  })
  
  const {
    loading,
    error,
    messages,
    insights,
    sendMessage,
    coachMarketing,
    coachFinancial,
    coachOperations,
    startNewSession
  } = useAIAgent()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Send message with context
    await sendMessage(input, businessContext)
    setInput('')
  }

  const handleSpecializedQuestion = async (type, question) => {
    setInput(question)
    
    switch(type) {
      case 'marketing':
        await coachMarketing(question, businessContext)
        break
      case 'financial':
        await coachFinancial(question, businessContext)
        break
      case 'operations':
        await coachOperations(question, businessContext)
        break
      default:
        await sendMessage(question, businessContext)
    }
    
    setInput('')
  }

  const quickActions = [
    {
      type: 'marketing',
      icon: MegaphoneIcon,
      label: 'Marketing Strategy',
      question: 'What marketing strategies would work best for my barbershop?',
      color: 'purple'
    },
    {
      type: 'financial',
      icon: CurrencyDollarIcon,
      label: 'Pricing Advice',
      question: 'How should I price my services to maximize revenue?',
      color: 'green'
    },
    {
      type: 'operations',
      icon: ChartBarIcon,
      label: 'Operations',
      question: 'How can I optimize my daily operations and scheduling?',
      color: 'blue'
    }
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6" />
          <div>
            <h2 className="text-xl font-semibold">AI Business Coach</h2>
            <p className="text-sm opacity-90">Powered by LangChain + OpenAI</p>
          </div>
        </div>
        <button
          onClick={startNewSession}
          className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition-colors"
        >
          New Session
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => (
            <button
              key={action.type}
              onClick={() => handleSpecializedQuestion(action.type, action.question)}
              className={`flex flex-col items-center p-3 rounded-lg bg-white border-2 border-gray-200 hover:border-${action.color}-400 transition-colors`}
              disabled={loading}
            >
              <action.icon className={`h-6 w-6 text-${action.color}-600 mb-1`} />
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Business Context (Optional) */}
      <div className="px-4 pt-4">
        <details className="cursor-pointer bg-blue-50 rounded-lg p-3">
          <summary className="text-sm font-medium text-blue-900">
            Add Business Context for Better Advice
          </summary>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-blue-700">Monthly Revenue</label>
              <input
                type="text"
                placeholder="e.g., $10,000"
                value={businessContext.monthlyRevenue}
                onChange={(e) => setBusinessContext(prev => ({
                  ...prev,
                  monthlyRevenue: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-blue-700">Client Count</label>
              <input
                type="text"
                placeholder="e.g., 150"
                value={businessContext.clientCount}
                onChange={(e) => setBusinessContext(prev => ({
                  ...prev,
                  clientCount: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-blue-700">Avg Service Price</label>
              <input
                type="text"
                placeholder="e.g., $45"
                value={businessContext.avgServicePrice}
                onChange={(e) => setBusinessContext(prev => ({
                  ...prev,
                  avgServicePrice: e.target.value
                }))}
                className="w-full px-3 py-2 border rounded-md text-sm mt-1"
              />
            </div>
          </div>
        </details>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <LightBulbIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-6">
              I'm here to help you grow your barbershop business!
            </p>
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
              <button
                onClick={() => setInput("How can I attract more high-paying clients?")}
                className="text-left p-3 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                💰 How can I attract more high-paying clients?
              </button>
              <button
                onClick={() => setInput("What's the best way to build customer loyalty?")}
                className="text-left p-3 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                🤝 What's the best way to build customer loyalty?
              </button>
              <button
                onClick={() => setInput("How do I manage my time more efficiently?")}
                className="text-left p-3 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⏰ How do I manage my time more efficiently?
              </button>
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
              <LoadingSpinner />
              <span className="text-sm text-gray-600">Thinking...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-600 text-sm bg-red-50 rounded-lg p-3">
            Error: {error}
          </div>
        )}
      </div>

      {/* Insights Panel */}
      {insights.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-t">
          <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-1">
            <LightBulbIcon className="h-4 w-4" />
            Key Insights
          </h3>
          <ul className="space-y-1">
            {insights.slice(-3).map((insight, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-1">
                <span className="text-amber-600">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about marketing, pricing, operations, growth strategies..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}