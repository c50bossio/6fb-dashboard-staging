'use client'

import { SparklesIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'

const AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Claude', models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'] },
  { id: 'gemini', name: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'] },
]

export default function AITestPage() {
  const [provider, setProvider] = useState('openai')
  const [model, setModel] = useState('gpt-4o-mini')
  const [prompt, setPrompt] = useState('Tell me a short joke about programming')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedProvider = AI_PROVIDERS.find(p => p.id === provider)

  const testAI = async () => {
    setLoading(true)
    setError('')
    setResponse('')

    try {
      const res = await fetch('/api/ai/unified-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          provider,
          model,
          stream: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setResponse(data.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const testAllProviders = async () => {
    setLoading(true)
    setError('')
    setResponse('')

    const results = []

    for (const provider of AI_PROVIDERS) {
      try {
        const res = await fetch('/api/ai/unified-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            provider: provider.id,
            model: provider.models[0],
            stream: false,
          }),
        })

        const data = await res.json()

        if (res.ok) {
          results.push(`**${provider.name}**: ${data.content}\n`)
        } else {
          results.push(`**${provider.name}**: ❌ ${data.error}\n`)
        }
      } catch (err) {
        results.push(`**${provider.name}**: ❌ ${err.message}\n`)
      }
    }

    setResponse(results.join('\n'))
    setLoading(false)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <SparklesIcon className="h-8 w-8 text-purple-600" />
          AI Provider Test
        </h1>
        <p className="text-gray-600 mt-2">Test all three AI providers: OpenAI, Claude, and Gemini</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value)
                const newProvider = AI_PROVIDERS.find(p => p.id === e.target.value)
                setModel(newProvider.models[0])
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              {AI_PROVIDERS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              {selectedProvider?.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={testAI}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Selected'}
            </button>
            <button
              onClick={testAllProviders}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test All
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            placeholder="Enter your prompt here..."
          />
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">Error: {error}</p>
          </div>
        )}

        {response && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-semibold text-gray-700 mb-2">Response:</h3>
            <div className="text-gray-600 whitespace-pre-wrap">{response}</div>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Configuration Status:</h3>
        <div className="space-y-1 text-sm">
          <p className="text-blue-700">
            <span className="font-medium">OpenAI:</span> {process.env.NEXT_PUBLIC_OPENAI_CONFIGURED === 'true' ? '✅ Configured' : '❌ Add API key to OPENAI_API_KEY'}
          </p>
          <p className="text-blue-700">
            <span className="font-medium">Claude:</span> ✅ Configured
          </p>
          <p className="text-blue-700">
            <span className="font-medium">Gemini:</span> {process.env.NEXT_PUBLIC_GEMINI_CONFIGURED === 'true' ? '✅ Configured' : '❌ Add API key to GOOGLE_GEMINI_API_KEY'}
          </p>
        </div>
      </div>
    </div>
  )
}