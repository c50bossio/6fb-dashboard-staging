/**
 * AI Agent System API Connection Test
 * Tests all AI agent endpoints for proper staff data access and API connectivity
 */

async function testAIAgentAPIs() {
  const results = {
    aiEndpoints: {},
    staffAccess: {},
    dataIntegration: {},
    overallHealth: 0
  }
  
  const baseUrl = 'http://localhost:9999'
  const testBarbershopId = 'test-shop-123'
  const testUserId = 'test-user-456'
  
  try {

    // Test scheduling optimization
    const schedulingResponse = await fetch(`${baseUrl}/api/ai/scheduling/optimization?barbershop_id=${testBarbershopId}`)
    results.aiEndpoints.schedulingOptimization = schedulingResponse.status

    // Test predictive analytics
    const predictiveResponse = await fetch(`${baseUrl}/api/ai/predictive`)
    results.aiEndpoints.predictiveAnalytics = predictiveResponse.status

    // Test AI insights (with barbershop_id for public access)
    const insightsResponse = await fetch(`${baseUrl}/api/ai/insights?barbershop_id=${testBarbershopId}`)
    results.aiEndpoints.insights = insightsResponse.status

    // Test unified chat
    const chatResponse = await fetch(`${baseUrl}/api/ai/unified-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Show me staff availability' })
    })
    results.aiEndpoints.unifiedChat = chatResponse.status

    // Test multi-agent collaboration
    const collaborationResponse = await fetch(`${baseUrl}/api/ai/collaborate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        topic: 'staff optimization',
        context: { barbershop_id: testBarbershopId }
      })
    })
    results.aiEndpoints.collaboration = collaborationResponse.status

    // Test AI health check
    const healthResponse = await fetch(`${baseUrl}/api/ai/health`)
    results.aiEndpoints.health = healthResponse.status

    // Test if AI can access staff data
    const agentStaffResponse = await fetch(`${baseUrl}/api/ai/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_type: 'scheduling',
        action: 'get_staff_availability',
        barbershop_id: testBarbershopId
      })
    })
    results.staffAccess.agentStaffAccess = agentStaffResponse.status

    // Test if AI can analyze staff performance
    const performanceResponse = await fetch(`${baseUrl}/api/ai/performance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff_analysis',
        barbershop_id: testBarbershopId
      })
    })
    results.staffAccess.performanceAnalysis = performanceResponse.status

    // Test suggestions API
    const suggestionsResponse = await fetch(`${baseUrl}/api/suggestions/business-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessType: 'barbershop',
        location: 'test-location'
      })
    })
    results.dataIntegration.suggestions = suggestionsResponse.status

    // Test pricing suggestions
    const pricingResponse = await fetch(`${baseUrl}/api/suggestions/pricing-suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessType: 'barbershop',
        location: 'test-location'
      })
    })
    results.dataIntegration.pricing = pricingResponse.status

    // Test workflow automation
    const workflowResponse = await fetch(`${baseUrl}/api/ai/workflow-automation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow_type: 'new_staff_onboarding',
        barbershop_id: testBarbershopId
      })
    })
    results.dataIntegration.workflow = workflowResponse.status

    // Test daily report generation
    const dailyReportResponse = await fetch(`${baseUrl}/api/ai/daily-report`)
    results.dataIntegration.dailyReport = dailyReportResponse.status

    // Test business monitor
    const monitorResponse = await fetch(`${baseUrl}/api/ai/business-monitor`)
    results.dataIntegration.businessMonitor = monitorResponse.status

    // Calculate health scores
    const aiEndpointsWorking = Object.values(results.aiEndpoints).filter(s => s === 200 || s === 201).length
    const staffAccessWorking = Object.values(results.staffAccess).filter(s => s === 200 || s === 201).length
    const dataIntegrationWorking = Object.values(results.dataIntegration).filter(s => s === 200 || s === 201).length
    
    const aiScore = (aiEndpointsWorking / Object.keys(results.aiEndpoints).length) * 100
    const staffScore = (staffAccessWorking / Object.keys(results.staffAccess).length) * 100
    const integrationScore = (dataIntegrationWorking / Object.keys(results.dataIntegration).length) * 100
    
    results.overallHealth = (aiScore + staffScore + integrationScore) / 3
    
    }% operational`)
    }% working`)
    }% connected`)
    }%`)

    const issues = []
    
    // Check for critical failures
    if (results.aiEndpoints.schedulingOptimization >= 400) {
      issues.push('❌ Scheduling optimization is not accessing staff data properly')
    }
    if (results.staffAccess.agentStaffAccess >= 400) {
      issues.push('❌ AI agents cannot access staff information')
    }
    if (results.dataIntegration.workflow >= 400) {
      issues.push('❌ Workflow automation cannot process staff onboarding')
    }
    
    if (issues.length === 0) {
      
    } else {
      issues.forEach(issue => )
    }

    if (results.overallHealth < 50) {

    } else if (results.overallHealth < 80) {

    } else {

    }
    
    // Test specific AI agent features with staff

    // Test if AI can recommend staff schedules
    
    const scheduleRecommendation = await fetch(`${baseUrl}/api/ai/scheduling/analytics?barbershop_id=${testBarbershopId}`)

    // Test if AI can predict staff performance
    
    const performancePrediction = await fetch(`${baseUrl}/api/ai/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff_performance',
        barbershop_id: testBarbershopId
      })
    })

    // Test if AI can handle staff-related tasks
    
    const taskAutomation = await fetch(`${baseUrl}/api/ai/task-execution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task: 'assign_appointments_to_staff',
        barbershop_id: testBarbershopId
      })
    })

    if (results.overallHealth >= 80) {

    } else if (results.overallHealth >= 50) {

    } else {

    }
    
    return results
    
  } catch (error) {
    console.error('💥 Test error:', error)
    return { error: error.message, overallHealth: 0 }
  }
}

// Run the test
testAIAgentAPIs()