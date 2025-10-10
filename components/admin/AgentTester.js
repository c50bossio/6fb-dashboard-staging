'use client'

import { useState } from 'react'
import {
  PlayIcon,
  ClockIcon,
  CurrencyDollarIcon,
  WrenchIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

export default function AgentTester({ agent, onClose }) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleTest = async () => {
    if (!query.trim()) {
      setError('Please enter a test query')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/admin/agents/${agent.name}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Test request failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to test agent')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveTestCase = async () => {
    if (!result) return

    try {
      await fetch('/api/admin/agents/test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_name: agent.name,
          query,
          response: result.response,
          metadata: {
            tokens_used: result.tokens_used,
            cost: result.cost,
            response_time: result.response_time,
            tool_calls: result.tool_calls
          }
        })
      })

      alert('Test case saved successfully!')
    } catch (err) {
      alert('Failed to save test case: ' + err.message)
    }
  }

  // Format agent name
  const displayName = agent.name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Test Agent: {displayName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Send a test query to this agent and see the response
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Query Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your test query here... (e.g., 'What was our revenue this month?')"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Test Button */}
          <div>
            <button
              onClick={handleTest}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Testing...
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Test Query
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="rounded-md bg-green-50 p-4 border border-green-200">
                <div className="flex">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Test completed successfully
                    </h3>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Response Time</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {result.response_time ? `${result.response_time.toFixed(2)}s` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Cost</div>
                      <div className="text-lg font-semibold text-gray-900">
                        ${result.cost ? result.cost.toFixed(4) : '0.0000'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center">
                    <WrenchIcon className="w-5 h-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm text-gray-500">Tokens Used</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {result.tokens_used || 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Calls */}
              {result.tool_calls && result.tool_calls.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    Tool Calls Made ({result.tool_calls.length})
                  </h4>
                  <div className="space-y-2">
                    {result.tool_calls.map((call, idx) => (
                      <div key={idx} className="bg-white rounded p-3 border border-blue-100">
                        <div className="font-medium text-sm text-blue-900">
                          {call.name}
                        </div>
                        {call.arguments && (
                          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                            {JSON.stringify(call.arguments, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Response */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  Agent Response
                </h4>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                    {result.response}
                  </div>
                </div>
              </div>

              {/* Save Test Case Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTestCase}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Save as Test Case
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
