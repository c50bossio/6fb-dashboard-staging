#!/usr/bin/env node

/**
 * AI Agent Orchestration Testing Script with Authentication
 * Tests multi-agent collaboration with proper user authentication
 */

const axios = require('axios')
const fs = require('fs')

const FRONTEND_URL = 'http://localhost:9999'
const BACKEND_URL = 'http://localhost:8001'

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

    const testUser = {
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      shop_name: 'Test Barbershop'
    }

    try {
      const registerResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/register`, testUser)
      
      if (registerResponse.data.access_token) {
        this.authToken = registerResponse.data.access_token
        this.userId = registerResponse.data.user.id
        this.results.authentication = {
          success: true,
          method: 'register',
          userId: this.userId
        }
        
        return true
      }
    } catch (registerError) {

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
          
          return true
        }
      } catch (loginError) {
        
        return false
      }
    }
    
    return false
  }

  async testAgentSystemStatus() {

    try {
      const response = await axios.get(`${FRONTEND_URL}/api/ai/agents`, {
        headers: this.getAuthHeaders()
      })
      
       * 100)
      })
      
      return response.data
    } catch (error) {
      
      return null
    }
  }

  async testOrchestration(testCase) {

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

      this.analyzeOrchestrationResponse(testResult)
      
      testResult.success = this.evaluateOrchestrationSuccess(testResult)

       || 'None'}`)

    } catch (error) {
      testResult.error = error.message
      
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
    
    const features = testResult.orchestrationFeatures
    
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
    
    features.confidenceScore = Math.round((response.confidence || 0) * 100)
    features.responseLength = response.response.length
    
    features.agentMentions = [...new Set(features.agentMentions)]
    features.collaborationTerms = [...new Set(features.collaborationTerms)]
    
    let collaborationScore = 0
    
    const uniqueAgents = features.agentMentions.length
    collaborationScore += Math.min(uniqueAgents * 13, 40)
    
    collaborationScore += Math.min(features.collaborationTerms.length * 10, 30)
    
    if (features.structuredOutput) collaborationScore += 15
    
    if (features.coordinationSummary) collaborationScore += 15
    
    testResult.collaborationScore = Math.min(collaborationScore, 100)
  }

  evaluateOrchestrationSuccess(testResult) {
    const features = testResult.orchestrationFeatures
    const expectedCount = testResult.expectedCollaboration.length
    
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

    const authenticated = await this.createTestUser()
    if (!authenticated) {
      
      return this.results
    }

    const agentStatus = await this.testAgentSystemStatus()

    for (const testCase of ORCHESTRATION_TEST_QUERIES) {
      const testResult = await this.testOrchestration(testCase)
      this.results.orchestration_tests.push(testResult)
      
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    this.calculateSummaryMetrics()

    const reportPath = '/Users/bossio/6FB AI Agent System/orchestration_test_results.json'
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))

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

    const agentAnalysis = this.results.agent_analysis
    tests.forEach(test => {
      test.orchestrationFeatures.agentMentions.forEach(agent => {
        agentAnalysis.agentMentions[agent] = (agentAnalysis.agentMentions[agent] || 0) + 1
      })
    })

    const structuredTests = tests.filter(t => t.orchestrationFeatures.structuredOutput).length
    agentAnalysis.coordinationQuality = Math.round((structuredTests / tests.length) * 100)
  }

  printOrchestrationReport() {
    )
    
    )

    if (this.results.authentication.success) {

    }
    
    const analysis = this.results.orchestration_analysis

    }%)`)
    }%)`)

    Object.entries(this.results.agent_analysis.agentMentions).forEach(([agent, count]) => {
      }%)`)
    })

    this.results.orchestration_tests.forEach((test, idx) => {

      }`)
       || 'None'}`)

      if (test.error) {
        
      }
    })

    if (analysis.orchestrationScore >= 80) {

    } else if (analysis.orchestrationScore >= 60) {

    } else if (analysis.orchestrationScore >= 40) {

    } else {

    }

  }
}

if (require.main === module) {
  const tester = new AuthenticatedOrchestrationTester()
  tester.runOrchestrationTests().catch(console.error)
}

module.exports = AuthenticatedOrchestrationTester