'use client'

import { useState } from 'react'
import { 
  UserGroupIcon, 
  LightBulbIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function TestCollaborationPage() {
  const [query, setQuery] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [selectedExample, setSelectedExample] = useState(null)

  // Example complex queries
  const exampleQueries = [
    {
      title: 'Business Growth Strategy',
      query: 'How can I grow my barbershop business and maximize profit while improving customer satisfaction?',
      complexity: 'high',
      agents: ['Master Coach', 'Marcus', 'Sophia', 'David'],
      icon: ChartBarIcon
    },
    {
      title: 'Revenue Optimization',
      query: 'I need to increase revenue by 20% this month. What pricing, marketing, and scheduling changes should I make?',
      complexity: 'high',
      agents: ['Marcus', 'Sophia', 'David'],
      icon: SparklesIcon
    },
    {
      title: 'Customer Acquisition',
      query: 'How do I get more customers while keeping costs low and maintaining service quality?',
      complexity: 'medium',
      agents: ['Sophia', 'Marcus', 'David'],
      icon: UserGroupIcon
    },
    {
      title: 'Crisis Management',
      query: 'Emergency! I lost 3 barbers and revenue is down 40%. What should I do immediately?',
      complexity: 'critical',
      agents: ['Master Coach', 'Marcus', 'Sophia', 'David'],
      icon: LightBulbIcon
    }
  ]

  const handleCollaboration = async () => {
    if (!query.trim()) return

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/ai/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userId: 'demo-user',
          barbershopId: 'demo-shop',
          forceCollaboration: true
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Collaboration failed:', error)
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleExampleClick = (example) => {
    setQuery(example.query)
    setSelectedExample(example)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Agent Collaboration Testing 🤝
          </h1>
          <p className="text-gray-600">
            Test complex queries that require multiple AI agents working together
          </p>
        </div>

        {/* Example Queries */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Example Complex Queries</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exampleQueries.map((example, index) => {
              const Icon = example.icon
              return (
                <div
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="h-6 w-6 text-blue-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {example.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {example.query}
                      </p>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className={`px-2 py-1 rounded-full ${
                          example.complexity === 'critical' 
                            ? 'bg-red-100 text-red-700'
                            : example.complexity === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {example.complexity} complexity
                        </span>
                        <span className="text-gray-500">
                          {example.agents.length} agents
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Query Input */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Query</h2>
          
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a complex business query that requires multiple perspectives..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
          
          {selectedExample && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {selectedExample.title}
              </p>
            </div>
          )}
          
          <button
            onClick={handleCollaboration}
            disabled={!query.trim() || isProcessing}
            className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isProcessing ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                <span>Agents Collaborating...</span>
              </>
            ) : (
              <>
                <UserGroupIcon className="h-5 w-5" />
                <span>Start Multi-Agent Collaboration</span>
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Collaboration Results
              {result.success && <CheckCircleIcon className="h-6 w-6 text-green-500 inline ml-2" />}
            </h2>
            
            {result.success ? (
              <div className="space-y-6">
                {/* Collaboration Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Pattern</p>
                    <p className="font-medium">{result.pattern}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Complexity</p>
                    <p className="font-medium capitalize">{result.complexity}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Confidence</p>
                    <p className="font-medium">{Math.round(result.confidence * 100)}%</p>
                  </div>
                </div>

                {/* Participating Agents */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Participating Agents</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.agents?.map((agent, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Synthesis */}
                {result.synthesis && (
                  <>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
                      <p className="text-gray-700 leading-relaxed">
                        {result.synthesis.summary}
                      </p>
                    </div>

                    {/* Key Insights */}
                    {result.synthesis.key_insights?.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Key Insights</h3>
                        <div className="space-y-2">
                          {result.synthesis.key_insights.map((insight, index) => (
                            <div key={index} className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-900 mb-1">
                                {insight.agent}
                              </p>
                              <ul className="text-sm text-blue-700 space-y-1">
                                {insight.insights.map((item, i) => (
                                  <li key={i}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Plan */}
                    {result.synthesis.action_plan?.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Action Plan</h3>
                        <div className="space-y-2">
                          {result.synthesis.action_plan.map((action, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                              <span className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                {action.priority}
                              </span>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-900">
                                  {action.action}
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                  Owner: {action.owner} • Timeline: {action.timeline}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Expected Outcomes */}
                    {result.synthesis.expected_outcomes?.length > 0 && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Expected Outcomes</h3>
                        <ul className="space-y-2">
                          {result.synthesis.expected_outcomes.map((outcome, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              <span className="text-gray-700">{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}

                {/* Performance Metrics */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Collaboration completed in {result.duration}ms
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-red-800">
                  {result.error || 'Collaboration failed'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* How It Works */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">How Multi-Agent Collaboration Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium mb-2">Query Analysis</h3>
              <p className="text-sm text-gray-600">
                System analyzes query complexity and determines which agents are needed
              </p>
            </div>
            
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h3 className="font-medium mb-2">Agent Collaboration</h3>
              <p className="text-sm text-gray-600">
                Multiple agents work together using patterns like sequential, parallel, or hierarchical
              </p>
            </div>
            
            <div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h3 className="font-medium mb-2">Synthesis</h3>
              <p className="text-sm text-gray-600">
                Responses are synthesized into actionable insights and a comprehensive plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}