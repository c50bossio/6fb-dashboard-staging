#!/usr/bin/env node

/**
 * Quick test script for AI agent chat endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8002';

async function testAgentChat(agentType) {
  const requestData = {
    agent_type: agentType,
    message: "Hello, this is a test message. Please respond with your agent name and specialty.",
    context: { test: true },
    priority: "medium",
    request_type: "analysis",
    structured_output: false,
    include_knowledge: true,
    user_id: "test_user",
    session_id: "test_session_" + Date.now()
  };

  try {
    console.log(`🤖 Testing ${agentType} agent...`);
    
    const response = await axios.post(`${BASE_URL}/agents/${agentType}/chat`, requestData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    console.log(`✅ ${agentType} Success:`, {
      status: response.status,
      agent_type: response.data.agent_type,
      response_length: response.data.result?.length || 0,
      confidence: response.data.confidence,
      execution_time: response.data.execution_time
    });

    return { success: true, response: response.data };

  } catch (error) {
    console.log(`❌ ${agentType} Failed:`, {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      detail: error.response?.data?.detail
    });

    return { success: false, error: error.message };
  }
}

async function testAllAgents() {
  const agents = ['master_coach', 'financial', 'marketing', 'technical_operations', 'customer_success'];
  
  console.log('🧪 Testing all AI agents...\n');
  
  for (const agent of agents) {
    await testAgentChat(agent);
    console.log(''); // blank line
  }
}

testAllAgents().catch(console.error);