#!/usr/bin/env node

/**
 * AI Agent Orchestration Testing Script with Authentication
 * Tests multi-agent collaboration with proper user authentication
 */

const axios = require('axios')
const fs = require('fs')

const FRONTEND_URL = 'http://localhost:9999'
const BACKEND_URL = 'http://localhost:8001'

// Test queries for agent orchestration
const ORCHESTRATION_TEST_QUERIES = [
  {
    id: 'revenue_growth_complex',
    query: "I want to grow my barbershop revenue by 30% in 6 months. What's my complete strategy involving pricing, marketing, and operations?",
    expectedCollaboration: ['Financial Coach', 'Marketing Expert', 'Operations Manager'],
    description: 'Complex multi-domain strategy requiring Marcus + Sophia + David collaboration'
  },
  {
    id: 'retention_cost_optimization', 
    query: "My customer retention is low at 45% and my costs are too high. How do I fix both issues simultaneously?",
    expectedCollaboration: ['Financial Coach', 'Operations Manager'],
    description: 'Dual problem requiring Financial + Operations collaboration'
  },
  {
    id: 'staff_marketing_growth',
    query: "I need to hire 2 more barbers but also need to improve my social media marketing to justify the expansion. What's the best approach?",  
    expectedCollaboration: ['Marketing Expert', 'Operations Manager'],
    description: 'Growth strategy requiring Marketing + Operations coordination'
  },
  {
    id: 'comprehensive_transformation',
    query: "What are the top 3 priorities to transform my struggling barbershop into a premium, profitable business?",
    expectedCollaboration: ['Financial Coach', 'Marketing Expert', 'Operations Manager'],
    description: 'Holistic transformation requiring all agent collaboration'
  },
  {
    id: 'pricing_brand_strategy',
    query: "How should I price my services to maximize profit while building a premium brand that attracts high-value customers?",
    expectedCollaboration: ['Financial Coach', 'Marketing Expert'],
    description: 'Pricing and branding strategy requiring Financial + Marketing collaboration'
  }
]

class AuthenticatedOrchestrationTester {
  constructor() {
    this.authToken = null
    this.userId = null
    
    this.results = {
      timestamp: new Date().toISOString(),
      authentication: {
        success: false,
        method: null
      },
      orchestration_tests: [],
      orchestration_analysis: {
        totalTests: 0,
        successfulTests: 0,
        collaborationDetected: 0,
        avgConfidence: 0,
        avgResponseLength: 0,
        orchestrationScore: 0
      },
      agent_analysis: {
        agentMentions: {},
        collaborationPatterns: [],
        coordinationQuality: 0
      }
    }
  }

  async createTestUser() {
    console.log('🔐 Creating test user for authentication...')
    
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      shop_name: 'Test Barbershop'
    }

    try {
      // Try to register a new test user
      const registerResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, testUser)
      
      if (registerResponse.data.access_token) {
        this.authToken = registerResponse.data.access_token
        this.userId = registerResponse.data.user.id
        this.results.authentication = {
          success: true,
          method: 'register',
          userId: this.userId
        }
        console.log('✅ Test user created and authenticated')
        return true
      }
    } catch (registerError) {
      console.log('⚠️ Registration failed, trying login with existing user...')
      
      // Try with a known test user
      try {
        const loginResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/login`, {
          email: 'test@example.com',
          password: 'TestPassword123!'
        })
        
        if (loginResponse.data.access_token) {
          this.authToken = loginResponse.data.access_token
          this.userId = loginResponse.data.user.id
          this.results.authentication = {
            success: true,
            method: 'login',
            userId: this.userId
          }
          console.log('✅ Authenticated with existing test user')
          return true
        }
      } catch (loginError) {
        console.log('❌ Authentication failed:', loginError.message)
        return false
      }
    }
    
    return false
  }

  async testAgentSystemStatus() {
    console.log('🔍 Testing agent system status...')
    
    try {
      const response = await axios.get(`${FRONTEND_URL}/api/ai/agents`, {
        headers: this.getAuthHeaders()
      })
      
      console.log('✅ Agent system status:', {
        totalAgents: response.data.agent_system?.total_agents || 0,
        activeAgents: response.data.agent_system?.active_agents || 0,
        collaborationRate: Math.round((response.data.performance_metrics?.collaboration_rate || 0) * 100)
      })
      
      return response.data
    } catch (error) {
      console.log('⚠️ Agent status check failed:', error.message)
      return null
    }
  }

  async testOrchestration(testCase) {
    console.log(`\n🧪 Testing: ${testCase.description}`)
    console.log(`📝 Query: "${testCase.query}"`)
    
    const testResult = {
      id: testCase.id,
      query: testCase.query,
      expectedCollaboration: testCase.expectedCollaboration,
      actualResponse: null,
      orchestrationFeatures: {
        agentMentions: [],
        collaborationTerms: [],
        coordinationSummary: null,
        confidenceScore: 0,
        responseLength: 0,
        structuredOutput: false,
        recommendations: [],
        actionItems: []
      },
      collaborationScore: 0,
      success: false,
      error: null,
      timestamp: new Date().toISOString()
    }

    try {
      const businessContext = {
        shop_name: 'Premium Cuts Barbershop',
        customer_count: 280,
        monthly_revenue: 8500,
        location: 'Downtown Business District',
        staff_count: 2,
        avg_ticket: 42,
        retention_rate: 0.45,
        peak_hours: '10am-2pm, 5pm-7pm'
      }

      const response = await axios.post(`${FRONTEND_URL}/api/ai/agents`, {
        message: testCase.query,
        businessContext,
        sessionId: `orchestration_test_${testCase.id}_${Date.now()}`
      }, {
        headers: this.getAuthHeaders(),
        timeout: 30000
      })

      testResult.actualResponse = response.data
      console.log('✅ Response received from agents API')

      // Analyze orchestration patterns
      this.analyzeOrchestrationResponse(testResult)
      
      // Evaluate success
      testResult.success = this.evaluateOrchestrationSuccess(testResult)
      
      console.log(`🎯 Orchestration Analysis:`)
      console.log(`   - Agent mentions: ${testResult.orchestrationFeatures.agentMentions.join(', ') || 'None'}`)
      console.log(`   - Collaboration terms: ${testResult.orchestrationFeatures.collaborationTerms.length}`)
      console.log(`   - Confidence: ${testResult.orchestrationFeatures.confidenceScore}`)
      console.log(`   - Collaboration score: ${testResult.collaborationScore}/100`)
      console.log(`   - Test result: ${testResult.success ? 'PASSED' : 'FAILED'}`)

    } catch (error) {
      testResult.error = error.message
      console.log('❌ Test failed:', error.message)
    }

    return testResult
  }

  analyzeOrchestrationResponse(testResult) {
    const response = testResult.actualResponse
    
    if (!response || !response.response) {
      return
    }

    const responseText = JSON.stringify(response).toLowerCase()
    const responseContent = response.response.toLowerCase()
    
    // Extract orchestration features
    const features = testResult.orchestrationFeatures
    
    // Check for agent mentions
    const agentKeywords = {
      'marcus': ['marcus', 'financial coach', 'financial advisor', 'revenue optimization'],
      'sophia': ['sophia', 'marketing expert', 'marketing specialist', 'social media'],
      'david': ['david', 'operations manager', 'operations expert', 'scheduling']
    }
    
    Object.entries(agentKeywords).forEach(([agent, keywords]) => {
      if (keywords.some(keyword => responseText.includes(keyword))) {
        features.agentMentions.push(agent)
      }
    })
    
    // Check for collaboration terms
    const collaborationTerms = [
      'coordination', 'collaborate', 'team approach', 'multiple perspectives',
      'comprehensive strategy', 'integrated approach', 'cross-functional',
      'holistic', 'multi-faceted', 'combined expertise'
    ]
    
    collaborationTerms.forEach(term => {
      if (responseContent.includes(term)) {
        features.collaborationTerms.push(term)
      }
    })
    
    // Extract structured elements
    if (response.agent_details) {
      features.structuredOutput = true
      
      if (response.agent_details.primary_agent) {
        features.agentMentions.push(response.agent_details.primary_agent.toLowerCase())
      }
      
      if (response.agent_details.coordination_summary) {
        features.coordinationSummary = response.agent_details.coordination_summary
      }
      
      if (response.agent_details.recommendations) {
        features.recommendations = response.agent_details.recommendations
      }
      
      if (response.agent_details.action_items) {
        features.actionItems = response.agent_details.action_items
      }
    }
    
    // Calculate metrics
    features.confidenceScore = Math.round((response.confidence || 0) * 100)
    features.responseLength = response.response.length
    
    // Remove duplicates
    features.agentMentions = [...new Set(features.agentMentions)]
    features.collaborationTerms = [...new Set(features.collaborationTerms)]
    
    // Calculate collaboration score
    let collaborationScore = 0
    
    // Agent diversity (0-40 points)
    const uniqueAgents = features.agentMentions.length
    collaborationScore += Math.min(uniqueAgents * 13, 40)
    
    // Collaboration indicators (0-30 points)
    collaborationScore += Math.min(features.collaborationTerms.length * 10, 30)
    
    // Structured output (0-15 points)
    if (features.structuredOutput) collaborationScore += 15
    
    // Coordination summary (0-15 points)
    if (features.coordinationSummary) collaborationScore += 15
    
    testResult.collaborationScore = Math.min(collaborationScore, 100)
  }

  evaluateOrchestrationSuccess(testResult) {
    const features = testResult.orchestrationFeatures
    const expectedCount = testResult.expectedCollaboration.length
    
    // Success criteria:
    // 1. Response received without error
    // 2. Collaboration score >= 50
    // 3. At least 2 agents mentioned OR structured agent output
    // 4. Response length >= 300 characters (substantial response)
    
    const hasResponse = testResult.actualResponse && testResult.actualResponse.response
    const goodCollaborationScore = testResult.collaborationScore >= 50
    const hasAgentCollaboration = features.agentMentions.length >= 2 || features.structuredOutput
    const substantialResponse = features.responseLength >= 300
    
    return hasResponse && goodCollaborationScore && hasAgentCollaboration && substantialResponse
  }

  getAuthHeaders() {
    return this.authToken ? {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    } : {
      'Content-Type': 'application/json'
    }
  }

  async runOrchestrationTests() {
    console.log('🚀 Starting AI Agent Orchestration Testing with Authentication...\n')

    // Step 1: Authenticate
    const authenticated = await this.createTestUser()
    if (!authenticated) {
      console.log('❌ Cannot proceed without authentication')
      return this.results
    }

    // Step 2: Check agent system status
    const agentStatus = await this.testAgentSystemStatus()

    // Step 3: Run orchestration tests
    console.log('\n📋 Running Orchestration Tests...')
    
    for (const testCase of ORCHESTRATION_TEST_QUERIES) {
      const testResult = await this.testOrchestration(testCase)
      this.results.orchestration_tests.push(testResult)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Step 4: Calculate summary metrics
    this.calculateSummaryMetrics()

    // Step 5: Save results
    const reportPath = '/Users/bossio/6FB AI Agent System/orchestration_test_results.json'
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))

    // Step 6: Print comprehensive report
    this.printOrchestrationReport()

    return this.results
  }

  calculateSummaryMetrics() {
    const tests = this.results.orchestration_tests
    const analysis = this.results.orchestration_analysis
    
    analysis.totalTests = tests.length
    analysis.successfulTests = tests.filter(t => t.success).length
    analysis.collaborationDetected = tests.filter(t => t.collaborationScore >= 50).length
    
    if (tests.length > 0) {
      analysis.avgConfidence = Math.round(
        tests.reduce((sum, t) => sum + t.orchestrationFeatures.confidenceScore, 0) / tests.length
      )
      analysis.avgResponseLength = Math.round(
        tests.reduce((sum, t) => sum + t.orchestrationFeatures.responseLength, 0) / tests.length
      )
      analysis.orchestrationScore = Math.round(
        tests.reduce((sum, t) => sum + t.collaborationScore, 0) / tests.length
      )
    }

    // Analyze agent mentions
    const agentAnalysis = this.results.agent_analysis
    tests.forEach(test => {
      test.orchestrationFeatures.agentMentions.forEach(agent => {
        agentAnalysis.agentMentions[agent] = (agentAnalysis.agentMentions[agent] || 0) + 1
      })
    })

    // Calculate coordination quality
    const structuredTests = tests.filter(t => t.orchestrationFeatures.structuredOutput).length
    agentAnalysis.coordinationQuality = Math.round((structuredTests / tests.length) * 100)
  }

  printOrchestrationReport() {
    console.log('\n' + '='.repeat(70))
    console.log('🎯 AI AGENT ORCHESTRATION TEST REPORT')
    console.log('='.repeat(70))
    
    // Authentication status
    console.log(`🔐 Authentication: ${this.results.authentication.success ? '✅ SUCCESS' : '❌ FAILED'}`)
    if (this.results.authentication.success) {
      console.log(`   Method: ${this.results.authentication.method}`)
      console.log(`   User ID: ${this.results.authentication.userId}`)
    }
    
    // Overall metrics
    const analysis = this.results.orchestration_analysis
    console.log(`\n📊 Overall Results:`)
    console.log(`   Total Tests: ${analysis.totalTests}`)
    console.log(`   Successful Tests: ${analysis.successfulTests}/${analysis.totalTests} (${Math.round(analysis.successfulTests/analysis.totalTests*100)}%)`)
    console.log(`   Collaboration Detected: ${analysis.collaborationDetected}/${analysis.totalTests} (${Math.round(analysis.collaborationDetected/analysis.totalTests*100)}%)`)
    console.log(`   Average Confidence: ${analysis.avgConfidence}%`)
    console.log(`   Average Response Length: ${analysis.avgResponseLength} characters`)
    console.log(`   🏆 Overall Orchestration Score: ${analysis.orchestrationScore}/100`)

    // Agent analysis
    console.log(`\n🤖 Agent Collaboration Analysis:`)
    Object.entries(this.results.agent_analysis.agentMentions).forEach(([agent, count]) => {
      console.log(`   ${agent}: mentioned in ${count}/${analysis.totalTests} tests (${Math.round(count/analysis.totalTests*100)}%)`)
    })
    console.log(`   Coordination Quality: ${this.results.agent_analysis.coordinationQuality}%`)

    // Individual test results
    console.log(`\n📋 Individual Test Results:`)
    this.results.orchestration_tests.forEach((test, idx) => {
      console.log(`\n${idx + 1}. ${test.success ? '✅' : '❌'} ${test.id}:`)
      console.log(`   Query: "${test.query}"`)
      console.log(`   Expected: ${test.expectedCollaboration.join(', ')}`)
      console.log(`   Detected: ${test.orchestrationFeatures.agentMentions.join(', ') || 'None'}`)
      console.log(`   Collaboration Score: ${test.collaborationScore}/100`)
      console.log(`   Confidence: ${test.orchestrationFeatures.confidenceScore}%`)
      console.log(`   Response Length: ${test.orchestrationFeatures.responseLength} chars`)
      if (test.error) {
        console.log(`   Error: ${test.error}`)
      }
    })

    // Recommendations
    console.log(`\n💡 Orchestration System Assessment:`)
    if (analysis.orchestrationScore >= 80) {
      console.log('   🎉 EXCELLENT: Agent orchestration is working very well!')
      console.log('   - Multi-agent collaboration is clearly demonstrated')
      console.log('   - Responses show coordinated expertise from multiple domains')
      console.log('   - Consider expanding to more specialized agent personalities')
    } else if (analysis.orchestrationScore >= 60) {
      console.log('   ✅ GOOD: Agent orchestration is functioning well with room for improvement')
      console.log('   - Basic collaboration patterns are present')
      console.log('   - Consider enhancing coordination summaries')
      console.log('   - Add more explicit agent handoff messaging')
    } else if (analysis.orchestrationScore >= 40) {
      console.log('   ⚠️ MODERATE: Agent orchestration needs enhancement')
      console.log('   - Limited evidence of multi-agent collaboration')
      console.log('   - Implement clearer agent coordination indicators')
      console.log('   - Add structured agent response formatting')
    } else {
      console.log('   ❌ NEEDS WORK: Agent orchestration system requires significant improvement')
      console.log('   - Little to no evidence of agent collaboration')
      console.log('   - Implement proper multi-agent routing logic')
      console.log('   - Add coordination summaries and agent identification')
    }

    console.log(`\n📄 Full results saved to: orchestration_test_results.json`)
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AuthenticatedOrchestrationTester()
  tester.runOrchestrationTests().catch(console.error)
}

module.exports = AuthenticatedOrchestrationTester