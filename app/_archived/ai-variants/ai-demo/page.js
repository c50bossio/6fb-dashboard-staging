'use client'

import { useState } from 'react'
// Simple demo page using standard HTML elements

export default function AIDemoPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(`demo_session_${Date.now()}`)

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const newMessage = { role: 'user', content: input, timestamp: new Date() }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)

    try {
      // Use the enhanced chat endpoint directly (bypassing auth for demo)
      const response = await fetch('/api/ai/enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          sessionId: sessionId,
          businessContext: {
            shop_name: 'Demo Barbershop',
            location: 'Downtown',
            staff_count: 3
          }
        })
      })

      const data = await response.json()

      if (data.success || data.response) {
        const aiMessage = {
          role: 'assistant',
          content: data.response,
          provider: data.provider,
          confidence: data.confidence,
          messageType: data.messageType,
          knowledgeEnhanced: data.knowledgeEnhanced,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      const errorMessage = {
        role: 'assistant',
        content: `I apologize, but I'm experiencing technical difficulties. As your AI business coach, I'm here to help with barbershop operations, customer service, scheduling, and financial management. Could you try rephrasing your question?`,
        provider: 'error_fallback',
        confidence: 0.5,
        error: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
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

  const exampleQuestions = [
    "How can I increase revenue in my barbershop?",
    "What's the best way to reduce no-shows?",
    "How do I improve customer retention?",
    "What social media strategy works for barbershops?",
    "How should I price my services?"
  ]

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          🤖 AI Business Coach Demo
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Experience the power of our AI-driven barbershop business intelligence system
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <h3 className="text-sm font-semibold mb-2">🧠 Multi-Model AI</h3>
            <p className="text-xs text-gray-600">OpenAI, Anthropic, Google with intelligent routing</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <h3 className="text-sm font-semibold mb-2">📚 RAG Knowledge</h3>
            <p className="text-xs text-gray-600">Contextual business insights from vector database</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 border">
            <h3 className="text-sm font-semibold mb-2">🎯 Specialized Coaching</h3>
            <p className="text-xs text-gray-600">Expert guidance for barbershop operations</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">AI Business Coach Chat</h2>
          <p className="text-gray-600">
            Ask questions about barbershop management, customer service, marketing, or operations
          </p>
        </div>
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="mb-4">👋 Hello! I'm your AI business coach specializing in barbershop operations.</p>
                <p className="text-sm">Try asking one of these questions to get started:</p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.error
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === 'assistant' && !message.error && (
                    <div className="mt-2 text-xs opacity-70">
                      <span className="inline-block mr-3">🤖 {message.provider}</span>
                      <span className="inline-block mr-3">📊 {Math.round((message.confidence || 0) * 100)}%</span>
                      {message.knowledgeEnhanced && <span className="inline-block">🧠 Enhanced</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about barbershop operations, customer service, marketing, or financial management..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none"
              rows="3"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>

          {messages.length === 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Try these example questions:</p>
              <div className="flex flex-wrap gap-2">
                {exampleQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(question)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    disabled={loading}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">🚀 Week 2 AI System Features</h2>
        </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">✅ Completed:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• AI Orchestrator Service - Central coordination</li>
                <li>• Multi-model AI integration (OpenAI, Anthropic, Google)</li>
                <li>• Vector Knowledge Service with RAG</li>
                <li>• Intelligent message routing</li>
                <li>• Context management across sessions</li>
                <li>• Business-specific prompt engineering</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">🎯 Architecture:</h3>
              <ul className="space-y-1 text-gray-600">
                <li>• Next.js 14 frontend with real-time UI</li>
                <li>• FastAPI backend with AI services</li>
                <li>• ChromaDB vector database for RAG</li>
                <li>• Supabase for conversation storage</li>
                <li>• Intelligent provider fallbacks</li>
                <li>• Production-ready error handling</li>
              </ul>
            </div>
          </div>
      </div>
    </div>
  )
}