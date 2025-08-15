'use client'

import dynamic from 'next/dynamic'

const AIAgentChat = dynamic(() => import('@/components/ai/AIAgentChat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px]">
      <div className="text-gray-500">Loading AI Business Assistant...</div>
    </div>
  ),
})

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Business Assistant</h1>
          <p className="text-gray-600">
            Get real-time insights about your bookings, revenue, customers, and business performance. 
            Connected to live business data for accurate recommendations.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <AIAgentChat />
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-olive-50 p-4 rounded-lg">
            <h3 className="font-semibold text-olive-900 mb-2">📅 Booking Insights</h3>
            <p className="text-olive-700 text-sm">Ask about today's appointments, weekly schedule, and booking patterns</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">💰 Revenue Analysis</h3>
            <p className="text-green-700 text-sm">Get insights on daily revenue, popular services, and pricing optimization</p>
          </div>
          <div className="bg-gold-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gold-900 mb-2">👥 Customer Analytics</h3>
            <p className="text-gold-700 text-sm">Understand customer behavior, retention, and engagement patterns</p>
          </div>
        </div>
      </div>
    </div>
  )
}