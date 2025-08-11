'use client'

import AIAgentChat from '@/components/ai/AIAgentChat'

export default function TestAIChatPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          AI Chat Integration Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            AI Business Assistant
          </h2>
          <p className="text-gray-600 mb-6">
            Testing the internal API connection between AI chat and business features
          </p>
          
          <AIAgentChat />
        </div>
      </div>
    </div>
  )
}