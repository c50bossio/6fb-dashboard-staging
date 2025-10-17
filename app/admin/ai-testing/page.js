'use client'

import { useState } from 'react'

/**
 * 🧪 Enhanced AI Testing Lab - Agentic Executor Validation
 * 
 * Tests the new multi-agent system with intelligent routing and tool execution
 */

export default function AITestingLab() {
  const [testResults, setTestResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [selectedTest, setSelectedTest] = useState('all')

  // Enhanced test scenarios for the agentic executor
  const testScenarios = [
    {
      id: 'marcus-revenue',
      name: 'Marcus - Revenue Analysis',
      agent: 'Marcus',
      message: 'Show me today\'s revenue and financial forecast',
      expectedAgent: 'marcus',
      expectedTools: ['get_business_metrics', 'get_stripe_data', 'revenue_forecast'],
      category: 'financial'
    },
    {
      id: 'david-booking',
      name: 'David - Appointment Booking',
      agent: 'David',
      message: 'Book John Smith for a haircut tomorrow at 2 PM',
      expectedAgent: 'david',
      expectedTools: ['check_availability', 'book_appointment'],
      category: 'operations'
    },
    {
      id: 'sophia-marketing',
      name: 'Sophia - Marketing Campaign',
      agent: 'Sophia',
      message: 'Create an Instagram marketing campaign to attract new customers',
      expectedAgent: 'sophia',
      expectedTools: ['create_marketing_campaign'],
      category: 'marketing'
    },
    {
      id: 'alex-customer',
      name: 'Alex - Customer Lookup',
      agent: 'Alex',
      message: 'Find information about my most recent customer',
      expectedAgent: 'alex',
      expectedTools: ['get_customer_info'],
      category: 'customer_care'
    },
    {
      id: 'multi-agent-workflow',
      name: 'Multi-Agent Workflow',
      agent: 'Auto',
      message: 'Check availability for tomorrow, analyze revenue, and create a marketing campaign',
      expectedAgent: 'auto', // Should route intelligently
      expectedTools: ['check_availability', 'get_business_metrics', 'create_marketing_campaign'],
      category: 'complex'
    },
    {
      id: 'schedule-optimization',
      name: 'David - Schedule Optimization',
      agent: 'David',
      message: 'Analyze and optimize today\'s schedule for maximum efficiency',
      expectedAgent: 'david',
      expectedTools: ['check_availability', 'get_business_metrics', 'analyze_schedule_efficiency'],
      category: 'operations'
    }
  ]

  const runTest = async (scenario) => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/ai/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: scenario.message,
          agent: 'auto', // Let the system choose the best agent for testing
          context: {
            barbershopId: 'test-shop-123',
            testMode: true,
            dryRun: true,
            expectedTools: scenario.expectedTools
          },
          stream: false // Use JSON response for testing
        }),
      })

      const rawResult = await response.json()
      const executionTime = Date.now() - startTime

      // Map new AI v2 API response to expected format for compatibility
      const result = {
        success: response.ok && (rawResult.message || rawResult.content || rawResult.text),
        message: rawResult.message || rawResult.content || rawResult.text,
        agent: rawResult.agent || { id: 'auto', name: 'AI Assistant' },
        toolsUsed: rawResult.toolsUsed || [],
        model: rawResult.model,
        cost: rawResult.cost,
        executionTime: executionTime,
        // Include raw response for debugging
        rawResponse: rawResult
      }

      // Validate the test result
      const validation = validateTest(result, scenario, executionTime)

      return {
        scenario,
        result,
        validation,
        executionTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        scenario,
        result: null,
        validation: {
          passed: false,
          score: 0,
          maxScore: 100,
          errors: [error.message],
          grade: 'F'
        },
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  const validateTest = (result, scenario, executionTime) => {
    const validation = {
      passed: false,
      score: 0,
      maxScore: 100,
      checks: [],
      errors: [],
      insights: [],
      grade: 'F'
    }

    if (!result?.success) {
      validation.errors.push('API call failed')
      return validation
    }

    // Agent routing validation (30 points)
    if (scenario.expectedAgent !== 'auto') {
      if (result.agent?.id === scenario.expectedAgent) {
        validation.score += 30
        validation.checks.push('✅ Correct agent selected')
      } else {
        validation.errors.push(`❌ Wrong agent: expected ${scenario.expectedAgent}, got ${result.agent?.id}`)
      }
    } else {
      validation.score += 30
      validation.checks.push('✅ Auto-routing accepted')
    }

    // Tool execution validation (40 points)
    if (scenario.expectedTools?.length > 0) {
      const usedTools = result.toolsUsed?.map(t => t.name) || []
      const expectedTools = scenario.expectedTools
      
      const toolsFound = expectedTools.filter(tool => usedTools.includes(tool))
      const toolCoverage = toolsFound.length / expectedTools.length
      const toolScore = Math.round(toolCoverage * 40)
      
      validation.score += toolScore
      
      if (toolCoverage === 1) {
        validation.checks.push('✅ All expected tools executed')
      } else if (toolCoverage > 0.5) {
        validation.checks.push(`⚠️ Partial tool coverage: ${toolsFound.length}/${expectedTools.length}`)
      } else {
        validation.errors.push(`❌ Poor tool coverage: ${toolsFound.length}/${expectedTools.length}`)
      }
    }

    // Response quality validation (20 points)
    if (result.message && result.message.length > 10) {
      validation.score += 15
      validation.checks.push('✅ Generated meaningful response')
    } else {
      validation.errors.push('❌ Response too short or missing')
    }

    // Performance validation (10 points)
    if (executionTime < 1000) {
      validation.score += 10
      validation.checks.push('✅ Fast execution (<1s)')
    } else if (executionTime < 5000) {
      validation.score += 5
      validation.checks.push('⚠️ Acceptable execution time')
    } else {
      validation.errors.push('❌ Slow execution (>5s)')
    }

    // Calculate grade
    const percentage = validation.score / validation.maxScore
    if (percentage >= 0.9) validation.grade = 'A'
    else if (percentage >= 0.8) validation.grade = 'B'
    else if (percentage >= 0.7) validation.grade = 'C'
    else if (percentage >= 0.6) validation.grade = 'D'
    else validation.grade = 'F'

    validation.passed = validation.score >= 70

    // Add insights
    if (result.toolsUsed?.length > scenario.expectedTools?.length) {
      validation.insights.push('🔍 Agent executed additional tools beyond expected')
    }
    
    if (result.agent?.specialties) {
      validation.insights.push(`🎯 Agent specialties: ${result.agent.specialties.join(', ')}`)
    }

    return validation
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults([])
    
    const tests = selectedTest === 'all' 
      ? testScenarios 
      : testScenarios.filter(t => t.category === selectedTest)

    for (const scenario of tests) {
      const result = await runTest(scenario)
      setTestResults(prev => [...prev, result])
    }
    
    setIsRunning(false)
  }

  const getOverallScore = () => {
    if (testResults.length === 0) return 0
    const totalScore = testResults.reduce((sum, test) => sum + test.validation.score, 0)
    const maxScore = testResults.reduce((sum, test) => sum + test.validation.maxScore, 0)
    return Math.round((totalScore / maxScore) * 100)
  }

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600 bg-green-100'
      case 'B': return 'text-blue-600 bg-blue-100'
      case 'C': return 'text-yellow-600 bg-yellow-100'
      case 'D': return 'text-orange-600 bg-orange-100'
      case 'F': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 Enhanced AI Testing Lab
        </h1>
        <p className="text-gray-600">
          Validate the agentic executor with intelligent agent routing and tool execution
        </p>
      </div>

      {/* Test Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Test Category:</label>
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              disabled={isRunning}
            >
              <option value="all">All Tests</option>
              <option value="financial">Financial (Marcus)</option>
              <option value="operations">Operations (David)</option>
              <option value="marketing">Marketing (Sophia)</option>
              <option value="customer_care">Customer Care (Alex)</option>
              <option value="complex">Complex Workflows</option>
            </select>
          </div>
          
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="bg-olive-600 text-white px-6 py-2 rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isRunning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Run Tests</span>
              </>
            )}
          </button>
        </div>

        {testResults.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Overall Performance:</span>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-bold text-gray-900">{getOverallScore()}%</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(getOverallScore() >= 90 ? 'A' : getOverallScore() >= 80 ? 'B' : getOverallScore() >= 70 ? 'C' : getOverallScore() >= 60 ? 'D' : 'F')}`}>
                  {getOverallScore() >= 90 ? 'A' : getOverallScore() >= 80 ? 'B' : getOverallScore() >= 70 ? 'C' : getOverallScore() >= 60 ? 'D' : 'F'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="space-y-4">
        {testResults.map((test, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{test.scenario.name}</h3>
                <p className="text-sm text-gray-600 mt-1">"{test.scenario.message}"</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(test.validation.grade)}`}>
                  {test.validation.grade}
                </span>
                <span className="text-sm text-gray-500">{test.validation.score}/{test.validation.maxScore}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Validation Results */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Validation Results</h4>
                <div className="space-y-2">
                  {test.validation.checks.map((check, i) => (
                    <div key={i} className="text-sm text-green-600">{check}</div>
                  ))}
                  {test.validation.errors.map((error, i) => (
                    <div key={i} className="text-sm text-red-600">{error}</div>
                  ))}
                  {test.validation.insights.map((insight, i) => (
                    <div key={i} className="text-sm text-blue-600">{insight}</div>
                  ))}
                </div>
              </div>

              {/* Execution Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Execution Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Agent:</span> {test.result?.agent?.name || 'N/A'}</div>
                  <div><span className="font-medium">Tools Used:</span> {test.result?.toolsUsed?.length || 0}</div>
                  <div><span className="font-medium">Execution Time:</span> {test.executionTime}ms</div>
                  <div><span className="font-medium">Response Length:</span> {test.result?.message?.length || 0} chars</div>
                </div>
              </div>
            </div>

            {/* Tools Executed */}
            {test.result?.toolsUsed && test.result.toolsUsed.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Tools Executed</h4>
                <div className="flex flex-wrap gap-2">
                  {test.result.toolsUsed.map((tool, i) => (
                    <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tool.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Agent Response */}
            {test.result?.message && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Agent Response</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {test.result.message}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {testResults.length === 0 && !isRunning && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">🧪</div>
          <p className="text-gray-600">Run tests to see results</p>
        </div>
      )}
    </div>
  )
}