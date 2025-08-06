'use client'

import dynamic from 'next/dynamic'

// Dynamically import to avoid SSR issues with chat hooks
const StreamingChat = dynamic(() => import('@/components/chat/StreamingChat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="text-gray-500">Loading chat...</div>
    </div>
  ),
})

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Chat</h1>
        <div className="bg-white rounded-lg shadow-md overflow-hidden" style={{ height: '700px' }}>
          <StreamingChat />
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Choose between OpenAI (o3, GPT-4.1, o4-mini), Anthropic (Claude 4 Opus, Claude 4 Sonnet), and Google (Gemini 2.5 Pro, Gemini 2.0) models.</p>
          <p>All providers offer streaming responses with the absolute latest 2025 model versions including reasoning models.</p>
        </div>
      </div>
    </div>
  )
}