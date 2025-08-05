#!/usr/bin/env node

/**
 * Direct AI Agent Orchestration Testing Script
 * Tests multi-agent collaboration by calling FastAPI directly
 */

const axios = require('axios')
const fs = require('fs')

const BACKEND_URL = 'http://localhost:8001'

// Test queries designed to trigger agent orchestration
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
    console.log('🔍 Checking system status...')
    
    try {
      const healthResponse = await axios.get(`${BACKEND_URL}/health`)
      this.results.system_info.backend_available = true
      console.log('✅ FastAPI backend is available')
      
      // Test AI endpoint
      const testResponse = await axios.post(`${BACKEND_URL}/api/v1/ai/enhanced-chat`, {
        message: "Hello, testing AI service",
        session_id: "system_test",
        business_context: { test: true }
      })
      
      this.results.system_info.ai_service_status = 'available'
      console.log('✅ AI service is responding')
      
      return true
    } catch (error) {
      console.log('❌ System check failed:', error.message)
      this.results.system_info.ai_service_status = 'unavailable'
      return false
    }
  }

  async testOrchestration(testCase) {
    console.log(`\n🧪 Testing: ${testCase.id}`)
    console.log(`📝 Query: "${testCase.query.substring(0, 100)}..."`)
    console.log(`🎯 Expected domains: ${testCase.domains.join(', ')}`)
    
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
      console.log('✅ Response received')
      
      // Analyze the response for orchestration patterns
      this.analyzeResponse(testResult)
      
      // Evaluate success
      testResult.success = this.evaluateTest(testResult)
      
      console.log(`🎯 Analysis Results:`)
      console.log(`   - Agent mentions: ${testResult.analysis.agent_mentions.join(', ') || 'None'}`)
      console.log(`   - Domain coverage: ${testResult.analysis.domain_coverage.join(', ') || 'None'}`)
      console.log(`   - Collaboration terms: ${testResult.analysis.collaboration_terms.length}`)
      console.log(`   - Orchestration score: ${testResult.analysis.orchestration_score}/100`)
      console.log(`   - Confidence: ${testResult.analysis.confidence}%`)
      console.log(`   - Test result: ${testResult.success ? '✅ PASSED' : '❌ FAILED'}`)

    } catch (error) {
      testResult.error = error.message
      console.log('❌ Test failed:', error.message)
    }

    return testResult
  }

  analyzeResponse(testResult) {
    const response = testResult.response
    if (!response || !response.response) return

    const responseText = response.response.toLowerCase()
    const fullResponse = JSON.stringify(response).toLowerCase()
    
    const analysis = testResult.analysis

    // Analyze agent mentions
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

    // Check domain coverage
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

    // Look for collaboration indicators
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

    // Check for structured response
    if (response.contextual_insights || response.recommendations || 
        responseText.includes('strategy:') || responseText.includes('action plan:')) {
      analysis.structured_response = true
    }

    // Extract metrics
    analysis.confidence = Math.round((response.confidence || 0) * 100)
    analysis.response_length = response.response.length

    // Calculate orchestration score
    let score = 0
    
    // Domain coverage (0-40 points)
    const domainCoverage = analysis.domain_coverage.length / testResult.expected_domains.length
    score += Math.round(domainCoverage * 40)
    
    // Agent mentions (0-30 points)
    score += Math.min(analysis.agent_mentions.length * 10, 30)
    
    // Collaboration terms (0-20 points)
    score += Math.min(analysis.collaboration_terms.length * 5, 20)
    
    // Structured response (0-10 points)
    if (analysis.structured_response) score += 10

    analysis.orchestration_score = Math.min(score, 100)

    // Remove duplicates
    analysis.agent_mentions = [...new Set(analysis.agent_mentions)]
    analysis.domain_coverage = [...new Set(analysis.domain_coverage)]
    analysis.collaboration_terms = [...new Set(analysis.collaboration_terms)]
  }

  evaluateTest(testResult) {
    const analysis = testResult.analysis
    
    // Success criteria:
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
    console.log('🚀 Starting Direct AI Agent Orchestration Testing...\n')

    // Check system status
    const systemReady = await this.checkSystemStatus()
    if (!systemReady) {
      console.log('❌ System not ready for testing')
      return this.results
    }

    // Run tests
    console.log('\n📋 Running Orchestration Tests...')
    for (const testCase of ORCHESTRATION_TESTS) {
      const result = await this.testOrchestration(testCase)
      this.results.tests.push(result)
      
      // Rate limiting between tests
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Calculate summary
    this.calculateSummary()
    
    // Save results
    const reportPath = '/Users/bossio/6FB AI Agent System/direct_orchestration_results.json'
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2))
    
    // Print report
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

    // Analyze orchestration features
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
    console.log('\n' + '='.repeat(80))
    console.log('🎯 DIRECT AI AGENT ORCHESTRATION TEST REPORT')
    console.log('='.repeat(80))
    
    // System status
    console.log(`🔧 System Status:`)
    console.log(`   Backend Available: ${this.results.system_info.backend_available ? '✅' : '❌'}`)
    console.log(`   AI Service: ${this.results.system_info.ai_service_status}`)
    
    // Overall results
    const analysis = this.results.analysis
    console.log(`\n📊 Overall Results:`)
    console.log(`   Total Tests: ${analysis.total_tests}`)
    console.log(`   Successful Responses: ${analysis.successful_responses}/${analysis.total_tests}`)
    console.log(`   Orchestration Detected: ${analysis.orchestration_detected}/${analysis.total_tests}`)
    console.log(`   Average Confidence: ${analysis.avg_confidence}%`)
    console.log(`   Average Response Length: ${analysis.avg_response_length} characters`)
    console.log(`   🏆 Overall Collaboration Score: ${analysis.collaboration_score}/100`)

    // Orchestration analysis
    console.log(`\n🤖 Agent Orchestration Analysis:`)
    Object.entries(this.results.orchestration_features.agent_mentions).forEach(([agent, count]) => {
      console.log(`   ${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent: ${count}/${analysis.total_tests} tests`)
    })
    console.log(`   Multi-domain Responses: ${this.results.orchestration_features.multi_domain_responses}/${analysis.total_tests}`)
    console.log(`   Collaboration Terms Used: ${this.results.orchestration_features.collaboration_indicators.length}`)

    // Individual results
    console.log(`\n📋 Test Results Summary:`)
    this.results.tests.forEach((test, idx) => {
      console.log(`\n${idx + 1}. ${test.success ? '✅' : '❌'} ${test.id} (${test.complexity} complexity):`)
      console.log(`   Expected: ${test.expected_domains.join(', ')}`)
      console.log(`   Covered: ${test.analysis.domain_coverage.join(', ') || 'None'}`)
      console.log(`   Agents: ${test.analysis.agent_mentions.join(', ') || 'None'}`)
      console.log(`   Score: ${test.analysis.orchestration_score}/100`)
      if (test.error) {
        console.log(`   Error: ${test.error}`)
      }
    })

    // Assessment
    console.log(`\n💡 Orchestration System Assessment:`)
    if (analysis.collaboration_score >= 80) {
      console.log(`   🎉 EXCELLENT - Strong multi-agent orchestration detected!`)
      console.log(`   - Responses demonstrate clear coordination between different expertise areas`)
      console.log(`   - Multi-domain coverage is comprehensive`)
      console.log(`   - Consider adding more explicit agent coordination messaging`)
    } else if (analysis.collaboration_score >= 60) {
      console.log(`   ✅ GOOD - Solid orchestration foundation with room for enhancement`)
      console.log(`   - Good domain coverage across different business areas`)
      console.log(`   - Some collaboration patterns are evident`)
      console.log(`   - Enhance with explicit agent handoff and coordination summaries`)
    } else if (analysis.collaboration_score >= 40) {
      console.log(`   ⚠️ MODERATE - Basic orchestration present but needs improvement`)
      console.log(`   - Limited multi-domain coordination`)
      console.log(`   - Implement clearer agent collaboration indicators`)
      console.log(`   - Add structured coordination summaries`)
    } else {
      console.log(`   ❌ NEEDS WORK - Orchestration system requires significant development`)
      console.log(`   - Minimal evidence of multi-agent collaboration`)
      console.log(`   - Single-domain responses predominant`)
      console.log(`   - Implement proper agent routing and coordination logic`)
    }

    console.log(`\n📁 Full results saved to: direct_orchestration_results.json`)
  }
}

// Run the tests
if (require.main === module) {
  const tester = new DirectOrchestrationTester()
  tester.runAllTests().catch(console.error)
}

module.exports = DirectOrchestrationTester