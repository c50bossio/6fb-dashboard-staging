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
          <p>Choose between OpenAI (GPT-4, GPT-3.5) and Anthropic (Claude 3.5, Claude 3) models.</p>
          <p>Both providers offer streaming responses for a seamless chat experience.</p>
        </div>
      </div>
    </div>
  )
}