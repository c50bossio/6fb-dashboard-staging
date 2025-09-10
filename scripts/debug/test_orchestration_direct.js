#!/usr/bin/env node

/**
 * Direct AI Agent Orchestration Testing Script
 * Tests multi-agent collaboration by calling FastAPI directly
 */

const axios = require('axios')
const fs = require('fs')

const BACKEND_URL = 'http://localhost:8001'

const ORCHESTRATION_TESTS = [
  {
    id: 'complex_growth_strategy',
    query: "I want to grow my barbershop revenue by 30% in 6 months. I need a complete strategy that covers pricing optimization, marketing campaigns, operational efficiency, and staff management. What's my comprehensive roadmap?",
    expectedAgents: ['Financial', 'Marketing', 'Operations'],
    complexity: 'high',
    domains: ['finance', 'marketing', 'operations']
  },
  {
    id: 'dual_challenge_solution',
    query: "My barbershop is struggling with two major issues: customer retention is only 45% and my operating costs are 20% higher than industry average. I need solutions that address both problems in an integrated way.",
    expectedAgents: ['Financial', 'Operations'],
    complexity: 'medium',
    domains: ['finance', 'operations']
  },
  {
    id: 'expansion_marketing_strategy',
    query: "I want to hire 2 additional barbers and expand to premium services, but I need to build my customer base and brand presence first. How do I coordinate staffing expansion with marketing growth?",
    expectedAgents: ['Marketing', 'Operations'],
    complexity: 'medium',
    domains: ['marketing', 'operations']
  },
  {
    id: 'premium_transformation',
    query: "Transform my basic barbershop into a premium men's grooming destination. I need pricing strategy, service upgrades, marketing positioning, and operational changes. What's the complete transformation plan?",
    expectedAgents: ['Financial', 'Marketing', 'Operations'],
    complexity: 'high',
    domains: ['finance', 'marketing', 'operations']
  },
  {
    id: 'competitive_positioning',
    query: "Three new barbershops opened nearby. I need to differentiate through pricing, services, and marketing while optimizing operations to maintain profitability. How do I stay competitive?",
    expectedAgents: ['Financial', 'Marketing', 'Operations'],
    complexity: 'high',
    domains: ['finance', 'marketing', 'operations']
  }
]

class DirectOrchestrationTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      system_info: {
        backend_available: false,
        ai_service_status: null
      },
      tests: [],
      analysis: {
        total_tests: 0,
        successful_responses: 0,
        orchestration_detected: 0,
        avg_confidence: 0,
        avg_response_length: 0,
        collaboration_score: 0
      },
      orchestration_features: {
        agent_mentions: {},
        collaboration_indicators: [],
        coordination_patterns: [],
        multi_domain_responses: 0
      }
    }
  }

  async checkSystemStatus() {

    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/health`)
      this.results.system_info.backend_available = true

      const testResponse = await axios.post(`${BACKEND_URL}/api/v1/ai/enhanced-chat`, {
        message: "Hello, testing AI service",
        session_id: "system_test",
        business_context: { test: true }
      })
      
      this.results.system_info.ai_service_status = 'available'

      return true
    } catch (error) {
      
      this.results.system_info.ai_service_status = 'unavailable'
      return false
    }
  }

  async testOrchestration(testCase) {
    
    }..."`)
    }`)
    
    const testResult = {
      id: testCase.id,
      query: testCase.query,
      expected_agents: testCase.expectedAgents,
      expected_domains: testCase.domains,
      complexity: testCase.complexity,
      response: null,
      analysis: {
        agent_mentions: [],
        domain_coverage: [],
        collaboration_terms: [],
        structured_response: false,
        confidence: 0,
        response_length: 0,
        orchestration_score: 0
      },
      success: false,
      error: null,
      timestamp: new Date().toISOString()
    }

    try {
      const businessContext = {
        shop_name: 'Elite Men\'s Grooming',
        location: 'Downtown Business District',
        monthly_revenue: 12000,
        customer_count: 320,
        staff_count: 2,
        avg_ticket: 48,
        retention_rate: 0.45,
        competition_level: 'high',
        target_demographic: 'professionals_25_45'
      }

      const response = await axios.post(`${BACKEND_URL}/api/v1/ai/enhanced-chat`, {
        message: testCase.query,
        session_id: `orchestration_${testCase.id}_${Date.now()}`,
        business_context: businessContext
      }, {
        timeout: 35000,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      testResult.response = response.data

      this.analyzeResponse(testResult)
      
      testResult.success = this.evaluateTest(testResult)

       || 'None'}`)
       || 'None'}`)

    } catch (error) {
      testResult.error = error.message
      
    }

    return testResult
  }

  analyzeResponse(testResult) {
    const response = testResult.response
    if (!response || !response.response) return

    const responseText = response.response.toLowerCase()
    const fullResponse = JSON.stringify(response).toLowerCase()
    
    const analysis = testResult.analysis

    const agentPatterns = {
      'financial': ['financial', 'revenue', 'pricing', 'profit', 'cost', 'budget', 'marcus'],
      'marketing': ['marketing', 'brand', 'customer', 'social', 'promotion', 'advertising', 'sophia'],
      'operations': ['operations', 'scheduling', 'staff', 'efficiency', 'workflow', 'management', 'david']
    }

    Object.entries(agentPatterns).forEach(([agent, keywords]) => {
      if (keywords.some(keyword => responseText.includes(keyword))) {
        analysis.agent_mentions.push(agent)
      }
    })

    const domainKeywords = {
      'finance': ['price', 'revenue', 'profit', 'cost', 'budget', 'roi', 'margin'],
      'marketing': ['brand', 'customer', 'social media', 'promotion', 'advertising', 'positioning'],
      'operations': ['staff', 'scheduling', 'efficiency', 'process', 'workflow', 'management']
    }

    Object.entries(domainKeywords).forEach(([domain, keywords]) => {
      if (keywords.some(keyword => responseText.includes(keyword))) {
        analysis.domain_coverage.push(domain)
      }
    })

    const collaborationTerms = [
      'comprehensive', 'integrated', 'holistic', 'coordinated', 'strategic',
      'multi-faceted', 'combined approach', 'synergy', 'alignment',
      'cross-functional', 'interdependent', 'simultaneous'
    ]

    collaborationTerms.forEach(term => {
      if (responseText.includes(term)) {
        analysis.collaboration_terms.push(term)
      }
    })

    if (response.contextual_insights || response.recommendations || 
        responseText.includes('strategy:') || responseText.includes('action plan:')) {
      analysis.structured_response = true
    }

    analysis.confidence = Math.round((response.confidence || 0) * 100)
    analysis.response_length = response.response.length

    let score = 0
    
    const domainCoverage = analysis.domain_coverage.length / testResult.expected_domains.length
    score += Math.round(domainCoverage * 40)
    
    score += Math.min(analysis.agent_mentions.length * 10, 30)
    
    score += Math.min(analysis.collaboration_terms.length * 5, 20)
    
    if (analysis.structured_response) score += 10

    analysis.orchestration_score = Math.min(score, 100)

    analysis.agent_mentions = [...new Set(analysis.agent_mentions)]
    analysis.domain_coverage = [...new Set(analysis.domain_coverage)]
    analysis.collaboration_terms = [...new Set(analysis.collaboration_terms)]
  }

  evaluateTest(testResult) {
    const analysis = testResult.analysis
    
    // 1. Response received
    // 2. Orchestration score >= 60 for high complexity, >= 40 for medium
    // 3. At least 2 domains covered for multi-domain queries
    // 4. Response length >= 400 characters
    
    const hasResponse = testResult.response && testResult.response.response
    const minScore = testResult.complexity === 'high' ? 60 : 40
    const goodScore = analysis.orchestration_score >= minScore
    const domainCoverage = analysis.domain_coverage.length >= Math.min(2, testResult.expected_domains.length)
    const substantialResponse = analysis.response_length >= 400
    
    return hasResponse && goodScore && domainCoverage && substantialResponse
  }

  async runAllTests() {

    const systemReady = await this.checkSystemStatus()
    if (!systemReady) {
      
      return this.results
    }

    for (const testCase of ORCHESTRATION_TESTS) {
      const result = await this.testOrchestration(testCase)
      this.results.tests.push(result)
      
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    this.calculateSummary()
    
    const reportPath = '/Users/bossio/6FB AI Agent System/direct_orchestration_results.json'
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    
    this.printReport()
    
    return this.results
  }

  calculateSummary() {
    const tests = this.results.tests
    const analysis = this.results.analysis
    
    analysis.total_tests = tests.length
    analysis.successful_responses = tests.filter(t => t.response).length
    analysis.orchestration_detected = tests.filter(t => t.analysis.orchestration_score >= 50).length
    
    if (tests.length > 0) {
      analysis.avg_confidence = Math.round(
        tests.reduce((sum, t) => sum + t.analysis.confidence, 0) / tests.length
      )
      analysis.avg_response_length = Math.round(
        tests.reduce((sum, t) => sum + t.analysis.response_length, 0) / tests.length
      )
      analysis.collaboration_score = Math.round(
        tests.reduce((sum, t) => sum + t.analysis.orchestration_score, 0) / tests.length
      )
    }

    const features = this.results.orchestration_features
    tests.forEach(test => {
      test.analysis.agent_mentions.forEach(agent => {
        features.agent_mentions[agent] = (features.agent_mentions[agent] || 0) + 1
      })
      
      if (test.analysis.domain_coverage.length > 1) {
        features.multi_domain_responses++
      }
      
      features.collaboration_indicators.push(...test.analysis.collaboration_terms)
    })

    features.collaboration_indicators = [...new Set(features.collaboration_indicators)]
  }

  printReport() {
    )
    
    )

    const analysis = this.results.analysis

    Object.entries(this.results.orchestration_features.agent_mentions).forEach(([agent, count]) => {
      .toUpperCase() + agent.slice(1)} Agent: ${count}/${analysis.total_tests} tests`)
    })

    this.results.tests.forEach((test, idx) => {
      :`)
      }`)
       || 'None'}`)
       || 'None'}`)
      
      if (test.error) {
        
      }
    })

    if (analysis.collaboration_score >= 80) {

    } else if (analysis.collaboration_score >= 60) {

    } else if (analysis.collaboration_score >= 40) {

    } else {

    }

  }
}

if (require.main === module) {
  const tester = new DirectOrchestrationTester()
  tester.runAllTests().catch(console.error)
}

module.exports = DirectOrchestrationTester