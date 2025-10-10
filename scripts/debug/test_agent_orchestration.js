#!/usr/bin/env node

/**
 * AI Agent Orchestration Testing Script
 * Tests complex multi-domain queries that should involve multiple agents
 */

const axios = require('axios');
const fs = require('fs');

const FRONTEND_URL = 'http://localhost:9999';
const BACKEND_URL = 'http://localhost:8001';

const TEST_QUERIES = [
  {
    id: 'growth_strategy',
    query: "I want to grow my barbershop revenue by 30% in 6 months. What's my complete strategy?",
    expectedAgents: ['Marcus', 'Sophia', 'David'],
    description: 'Complex growth strategy requiring Financial + Marketing + Operations collaboration'
  },
  {
    id: 'dual_problem',
    query: "My customer retention is low and my costs are high. How do I fix both issues?",
    expectedAgents: ['Marcus', 'David'],
    description: 'Financial + Operations collaboration for cost/retention optimization'
  },
  {
    id: 'staff_marketing',
    query: "I need to hire more staff but also improve my marketing. What's the best approach?",
    expectedAgents: ['Sophia', 'David'],
    description: 'Marketing + Operations collaboration for staffing and promotion'
  },
  {
    id: 'holistic_business',
    query: "What are the top 3 priorities to transform my barbershop into a premium business?",
    expectedAgents: ['Marcus', 'Sophia', 'David', 'Isabella'],
    description: 'Comprehensive business transformation requiring multiple agents'
  }
];

class AgentOrchestrationTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        orchestrationScore: 0
      }
    };
  }

  async testAgentEndpoint() {
    try {
      
      const response = await axios.get(`${BACKEND_URL}/ai-agents/available`);
      .join(', ') || 'None found');
      return response.data;
    } catch (error) {
      
      return null;
    }
  }

  async testOrchestrationEndpoint() {
    try {
      
      const response = await axios.get(`${BACKEND_URL}/ai-orchestrator/status`);
      
      return response.data;
    } catch (error) {
      
      return null;
    }
  }

  async testComplexQuery(testCase) {

    const testResult = {
      id: testCase.id,
      query: testCase.query,
      expectedAgents: testCase.expectedAgents,
      actualAgents: [],
      collaborationDetected: false,
      orchestrationFeatures: {},
      responseQuality: 0,
      passed: false,
      error: null,
      response: null,
      timestamp: new Date().toISOString()
    };

    try {
      const frontendResponse = await axios.post(`${FRONTEND_URL}/api/ai-chat`, {
        message: testCase.query,
        context: { testMode: true }
      }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      testResult.response = frontendResponse.data;

      this.analyzeOrchestrationResponse(testResult);

    } catch (frontendError) {

      try {
        const backendResponse = await axios.post(`${BACKEND_URL}/ai-chat`, {
          message: testCase.query,
          user_id: 'test-user',
          context: { testMode: true }
        }, {
          timeout: 30000,
          headers: { 'Content-Type': 'application/json' }
        });

        testResult.response = backendResponse.data;

        this.analyzeOrchestrationResponse(testResult);

      } catch (backendError) {
        testResult.error = `Both frontend and backend failed: ${frontendError.message} | ${backendError.message}`;
        
      }
    }

    testResult.passed = this.evaluateTestSuccess(testResult);
    this.results.tests.push(testResult);

    return testResult;
  }

  analyzeOrchestrationResponse(testResult) {
    const response = testResult.response;
    
    if (!response) return;

    const responseText = JSON.stringify(response).toLowerCase();
    
    const collaborationKeywords = [
      'primary agent', 'collaboration', 'coordinated', 'multiple agents',
      'marcus', 'sophia', 'david', 'isabella', 'collaboration rate',
      'coordination summary', 'multi-agent', 'comprehensive strategy'
    ];

    testResult.orchestrationFeatures = {
      hasAgentMentions: false,
      hasCollaborationTerms: false,
      hasCoordinationSummary: false,
      hasConfidenceScores: false,
      hasActionItems: false,
      responseLength: responseText.length
    };

    collaborationKeywords.forEach(keyword => {
      if (responseText.includes(keyword)) {
        testResult.orchestrationFeatures.hasCollaborationTerms = true;
        if (['marcus', 'sophia', 'david', 'isabella'].includes(keyword)) {
          testResult.actualAgents.push(keyword);
          testResult.orchestrationFeatures.hasAgentMentions = true;
        }
      }
    });

    if (responseText.includes('coordination') || responseText.includes('collaboration rate')) {
      testResult.orchestrationFeatures.hasCoordinationSummary = true;
      testResult.collaborationDetected = true;
    }

    if (responseText.includes('confidence') || responseText.includes('score')) {
      testResult.orchestrationFeatures.hasConfidenceScores = true;
    }

    if (responseText.includes('action') || responseText.includes('priority') || responseText.includes('step')) {
      testResult.orchestrationFeatures.hasActionItems = true;
    }

    testResult.actualAgents = [...new Set(testResult.actualAgents)];

    let qualityScore = 0;
    if (testResult.orchestrationFeatures.hasAgentMentions) qualityScore += 30;
    if (testResult.orchestrationFeatures.hasCollaborationTerms) qualityScore += 25;
    if (testResult.orchestrationFeatures.hasCoordinationSummary) qualityScore += 20;
    if (testResult.orchestrationFeatures.hasConfidenceScores) qualityScore += 15;
    if (testResult.orchestrationFeatures.hasActionItems) qualityScore += 10;

    testResult.responseQuality = qualityScore;

     || 'None'}`);

  }

  evaluateTestSuccess(testResult) {
    // 1. No error occurred
    // 2. Response was received
    // 3. Either collaboration was detected OR multiple expected agents were mentioned
    // 4. Response quality is above 40/100

    if (testResult.error || !testResult.response) {
      return false;
    }

    const hasGoodQuality = testResult.responseQuality >= 40;
    const hasExpectedAgents = testResult.expectedAgents.some(agent => 
      testResult.actualAgents.includes(agent.toLowerCase())
    );
    const hasCollaboration = testResult.collaborationDetected;

    return hasGoodQuality && (hasExpectedAgents || hasCollaboration);
  }

  async runAllTests() {

    const agentData = await this.testAgentEndpoint();
    const orchestratorData = await this.testOrchestrationEndpoint();

    for (const testCase of TEST_QUERIES) {
      await this.testComplexQuery(testCase);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
    }

    this.results.summary.totalTests = this.results.tests.length;
    this.results.summary.passedTests = this.results.tests.filter(t => t.passed).length;
    this.results.summary.failedTests = this.results.summary.totalTests - this.results.summary.passedTests;
    
    const avgQuality = this.results.tests.reduce((sum, t) => sum + t.responseQuality, 0) / this.results.tests.length;
    this.results.summary.orchestrationScore = Math.round(avgQuality);

    const reportPath = '/Users/bossio/6FB AI Agent System/agent_orchestration_test_results.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    this.printSummary();
    
    return this.results;
  }

  printSummary() {
    );
    
    );

    this.results.tests.forEach(test => {

      }`);
       || 'None'}`);

      if (test.error) {
        
      }
    });

    const features = this.results.tests.map(t => t.orchestrationFeatures);
    .length}/${features.length} tests`);
    .length}/${features.length} tests`);
    .length}/${features.length} tests`);
    .length}/${features.length} tests`);
    .length}/${features.length} tests`);

    if (this.results.summary.orchestrationScore < 50) {

    } else if (this.results.summary.orchestrationScore < 75) {

    } else {

    }
  }
}

if (require.main === module) {
  const tester = new AgentOrchestrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = AgentOrchestrationTester;