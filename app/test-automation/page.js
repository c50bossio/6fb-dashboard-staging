'use client'

import React, { useState, useEffect } from 'react'
import TaskExecutionDashboard from '../../components/TaskExecutionDashboard'
import { 
  BoltIcon, 
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  CogIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

export default function TestAutomationPage() {
  const [testResults, setTestResults] = useState([])
  const [isRunningTest, setIsRunningTest] = useState(false)
  const [systemHealth, setSystemHealth] = useState(null)
  const [selectedTestScenario, setSelectedTestScenario] = useState(null)

  // Predefined test scenarios that combine emotions with business events
  const testScenarios = [
    {
      id: 'angry_cancellation',
      name: 'Angry Customer Cancellation',
      emotion: 'angry',
      confidence: 0.92,
      message: "I'm really angry about the poor service! I want to cancel my appointment right now!",
      expectedActions: ['escalate_to_manager', 'apologize_and_credit', 'priority_support'],
      urgency: 'high'
    },
    {
      id: 'frustrated_payment',
      name: 'Frustrated Payment Issue',
      emotion: 'frustrated',
      confidence: 0.87,
      message: "This payment system is so frustrating! It keeps failing when I try to pay my bill.",
      expectedActions: ['offer_help', 'payment_assistance', 'schedule_callback'],
      urgency: 'medium'
    },
    {
      id: 'excited_review',
      name: 'Excited Customer Review',
      emotion: 'excited',
      confidence: 0.94,
      message: "This is incredible! I absolutely love my haircut. You guys are amazing!",
      expectedActions: ['request_review', 'upsell_services', 'offer_referral_bonus'],
      urgency: 'low'
    },
    {
      id: 'confused_booking',
      name: 'Confused About Booking Process',
      emotion: 'confused',
      confidence: 0.78,
      message: "I'm confused about how this booking system works. Can someone help me understand?",
      expectedActions: ['send_tutorial', 'schedule_demo', 'simplify_process'],
      urgency: 'medium'
    },
    {
      id: 'satisfied_followup',
      name: 'Satisfied Customer Follow-up',
      emotion: 'satisfied',
      confidence: 0.81,
      message: "The service was fine and met my expectations. Everything worked as expected.",
      expectedActions: ['request_feedback', 'suggest_additional_services', 'loyalty_program'],
      urgency: 'low'
    },
    {
      id: 'anxious_first_visit',
      name: 'Anxious First-time Customer',
      emotion: 'anxious',
      confidence: 0.85,
      message: "I'm worried about trying a new barbershop. What if I don't like the results?",
      expectedActions: ['provide_reassurance', 'reduce_uncertainty', 'clear_next_steps'],
      urgency: 'medium'
    }
  ]

  useEffect(() => {
    checkSystemHealth()
  }, [])

  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/ai/task-execution?action=health')
      const data = await response.json()
      setSystemHealth(data.success ? data.result : null)
    } catch (error) {
      console.error('Error checking system health:', error)
    }
  }

  const runSingleTest = async (scenario) => {
    setIsRunningTest(true)
    setSelectedTestScenario(scenario)
    
    try {
      console.log(`🧪 Testing scenario: ${scenario.name}`)
      
      const startTime = Date.now()
      
      // Create test context with business event
      const testContext = {
        message: scenario.message,
        emotion: scenario.emotion,
        emotionConfidence: scenario.confidence,
        userId: 'test_user_automation',
        timestamp: new Date().toISOString(),
        businessEvent: {
          type: detectBusinessEventType(scenario.message, scenario.emotion),
          data: {
            message: scenario.message,
            emotion: scenario.emotion,
            confidence: scenario.confidence,
            testScenario: true
          }
        }
      }

      // Call automated task execution API
      const response = await fetch('/api/ai/task-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_triggers',
          context: testContext,
          userId: 'test_user_automation',
          businessContext: {
            shopName: 'Test Barbershop',
            isOwner: true,
            testMode: true
          }
        })
      })

      const result = await response.json()
      const endTime = Date.now()
      
      const testResult = {
        id: Date.now(),
        scenario: scenario,
        success: result.success,
        triggersProcessed: result.result?.triggers_processed || 0,
        processingTime: endTime - startTime,
        timestamp: new Date(),
        details: result,
        expectedMet: result.success && result.result?.triggers_processed > 0
      }
      
      setTestResults(prev => [testResult, ...prev.slice(0, 9)]) // Keep last 10 results
      
      console.log(`✅ Test completed: ${scenario.name}`, testResult)
      
    } catch (error) {
      console.error('Test execution error:', error)
      
      setTestResults(prev => [{
        id: Date.now(),
        scenario: scenario,
        success: false,
        error: error.message,
        timestamp: new Date(),
        expectedMet: false
      }, ...prev.slice(0, 9)])
    } finally {
      setIsRunningTest(false)
      setSelectedTestScenario(null)
    }
  }

  const runAllTests = async () => {
    for (const scenario of testScenarios) {
      await runSingleTest(scenario)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  const detectBusinessEventType = (message, emotion) => {
    const text = message.toLowerCase()
    
    // Enhanced business event detection with new patterns
    if (text.includes('cancel')) return 'appointment_cancellation'
    if (text.includes('payment') || text.includes('bill') || text.includes('charge') || text.includes('card')) return 'payment_issue'
    if (text.includes('love') || text.includes('amazing') || text.includes('incredible')) return 'positive_feedback'
    if (text.includes('confused') || text.includes('help') || text.includes('understand')) return 'customer_confusion'
    if (text.includes('worried') || text.includes('anxious') || text.includes('first time') || text.includes('trying')) return 'first_time_customer'
    if (text.includes('service') || text.includes('quality') || text.includes('dissatisfied')) return 'service_complaint'
    
    return 'general_interaction'
  }

  const getTestStatusIcon = (result) => {
    if (result.success && result.expectedMet) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />
    } else if (result.success) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
    } else {
      return <StopIcon className="h-5 w-5 text-red-500" />
    }
  }

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      satisfied: '😌',
      excited: '🤩',
      frustrated: '😤',
      angry: '😠',
      confused: '😕',
      anxious: '😰',
      neutral: '😐'
    }
    return icons[emotion] || '😐'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <BoltIcon className="h-8 w-8 text-blue-600" />
            <span>Automated Task Execution Testing</span>
          </h1>
          <p className="text-gray-600 mt-2">
            Test AI agents' ability to automatically execute tasks based on emotional triggers and business events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Testing Interface */}
          <div className="space-y-6">
            {/* System Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <CogIcon className="h-5 w-5 text-green-600" />
                <span>System Status</span>
              </h2>

              {systemHealth ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Service Status:</span>
                    <span className="font-medium text-green-600">
                      {systemHealth.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Executions:</span>
                    <span className="font-medium">{systemHealth.active_executions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pending Approval:</span>
                    <span className="font-medium">{systemHealth.pending_approval}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium text-green-600">{systemHealth.success_rate}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500">Loading system status...</div>
              )}
            </div>

            {/* Test Scenarios */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5 text-purple-600" />
                  <span>Test Scenarios</span>
                </h2>
                <button
                  onClick={runAllTests}
                  disabled={isRunningTest}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Run All Tests
                </button>
              </div>

              <div className="space-y-3">
                {testScenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => runSingleTest(scenario)}
                    disabled={isRunningTest}
                    className={`w-full text-left p-4 rounded-lg border transition-all hover:bg-gray-50 disabled:opacity-50 ${
                      selectedTestScenario?.id === scenario.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getEmotionIcon(scenario.emotion)}</span>
                        <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          scenario.urgency === 'high' ? 'text-red-600 bg-red-100' :
                          scenario.urgency === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                          'text-green-600 bg-green-100'
                        }`}>
                          {scenario.urgency}
                        </span>
                        {isRunningTest && selectedTestScenario?.id === scenario.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      "{scenario.message}"
                    </p>
                    
                    <div className="text-xs text-gray-500">
                      Expected: {scenario.expectedActions.slice(0, 2).join(', ')}
                      {scenario.expectedActions.length > 2 && ` +${scenario.expectedActions.length - 2} more`}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <ClockIcon className="h-5 w-5 text-blue-600" />
                <span>Test Results</span>
              </h2>

              {testResults.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {testResults.map((result) => (
                    <div key={result.id} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {getTestStatusIcon(result)}
                          <span className="font-medium text-gray-900">
                            {result.scenario.name}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                        <div>
                          <span className="text-gray-600">Triggers Processed:</span>
                          <span className="ml-2 font-medium">{result.triggersProcessed || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Processing Time:</span>
                          <span className="ml-2 font-medium">{result.processingTime}ms</span>
                        </div>
                      </div>

                      <div className="text-xs">
                        {result.success ? (
                          <div className="flex items-center space-x-1">
                            <CheckCircleIcon className="h-3 w-3 text-green-500" />
                            <span className="text-green-700">
                              {result.expectedMet ? 'Test passed - Actions triggered as expected' : 'Test passed - No actions needed'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <StopIcon className="h-3 w-3 text-red-500" />
                            <span className="text-red-700">
                              Test failed: {result.error || 'Unknown error'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No test results yet</p>
                  <p className="text-sm text-gray-500">Run a test scenario to see results</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {testResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900 mb-3">Test Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {testResults.filter(r => r.success && r.expectedMet).length}
                    </div>
                    <div className="text-xs text-gray-600">Passed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {testResults.filter(r => r.success && !r.expectedMet).length}
                    </div>
                    <div className="text-xs text-gray-600">No Action</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-600">
                      {testResults.filter(r => !r.success).length}
                    </div>
                    <div className="text-xs text-gray-600">Failed</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task Execution Dashboard */}
        <div className="mt-12">
          <TaskExecutionDashboard userId="test_user_automation" />
        </div>
      </div>
    </div>
  )
}