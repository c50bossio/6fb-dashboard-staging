'use client'

import { useState } from 'react'

// import { useChat } from 'ai/react'  // Temporarily disabled for testing
import ModelSelector from './ModelSelector'

export default function StreamingChat() {
  const [modelConfig, setModelConfig] = useState({
    model: 'gpt-4',
    provider: 'openai'
  })

  // Mock chat functionality for testing
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const error = null

  const handleInputChange = (e) => {
    setInput(e.target.value)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim()) return
    
    // Add user message
    const userMessage = { id: Date.now(), content: input, role: 'user' }
    setMessages(prev => [...prev, userMessage])
    
    // Mock AI response
    setTimeout(() => {
      const aiMessage = { 
        id: Date.now() + 1, 
        content: `🤖 AI is not configured yet. To enable real AI chat, please configure your API keys in .env.local`, 
        role: 'assistant' 
      }
      setMessages(prev => [...prev, aiMessage])
    }, 1000)
    
    setInput('')
  }

  const onSubmit = handleSubmit

  return (
    <div className="flex flex-col h-full">
      {/* Model Selector */}
      <div className="p-4 border-b">
        <ModelSelector 
          selectedModel={modelConfig.model}
          onModelChange={setModelConfig}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">Welcome to AI Chat</p>
            <p className="text-sm">Choose a model above and start chatting!</p>
            <div className="mt-4 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-green-800">OpenAI</p>
                <p className="text-xs text-green-600 mt-1">o3, GPT-4.1, o4-mini</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-purple-800">Claude</p>
                <p className="text-xs text-purple-600 mt-1">Claude 4 Opus, Sonnet 4</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs font-semibold text-blue-800">Gemini</p>
                <p className="text-xs text-blue-600 mt-1">Gemini 2.5 Pro, 2.0 Flash</p>
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">
                {message.role === 'user' ? 'You' : 
                 modelConfig.provider === 'openai' ? 'OpenAI' : 
                 modelConfig.provider === 'anthropic' ? 'Claude' : 
                 modelConfig.provider === 'google' ? 'Gemini' : 'AI'}
              </div>
              <div className="whitespace-pre-wrap">{message.content}</div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            Error: {error.message}
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={onSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}