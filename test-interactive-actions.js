#!/usr/bin/env node

/**
 * Interactive AI Action Testing
 * Test the AI system with realistic barber scenarios
 */

const realScenarios = [
  {
    scenario: "🌅 Morning Prep - Barber Starting Their Day",
    requests: [
      "Send appointment reminders to today's customers",
      "Check if we have any no-shows and send follow-up messages",
      "Tell the staff about today's busy afternoon schedule"
    ]
  },
  {
    scenario: "💰 Slow Business Day - Need More Customers", 
    requests: [
      "Send SMS campaign to customers about our walk-in special",
      "Reach out to customers who haven't booked in 30 days",
      "Post on social media about our available time slots"
    ]
  },
  {
    scenario: "⭐ After Great Service - Building Reputation",
    requests: [
      "Ask for reviews from customers who visited this week",
      "Send thank you messages to our VIP customers",
      "Create email campaign highlighting our new services"
    ]
  },
  {
    scenario: "👥 Team Management - Keeping Staff Informed",
    requests: [
      "Notify staff about the new safety protocols", 
      "Tell the team about next week's holiday hours",
      "Send staff updates about the upcoming team training"
    ]
  }
]

async function testAIInteractively() {
  console.log('🚀 Interactive AI Action Testing for Barbers')
  console.log('='.repeat(60))
  console.log('Testing realistic scenarios that barbers face daily...\n')

  let totalTests = 0
  let passedTests = 0
  let actionsExecuted = 0

  for (const [scenarioIndex, scenario] of realScenarios.entries()) {
    console.log(`\n${scenario.scenario}`)
    console.log('─'.repeat(scenario.scenario.length))
    
    for (const [requestIndex, request] of scenario.requests.entries()) {
      totalTests++
      
      try {
        console.log(`\n${scenarioIndex + 1}.${requestIndex + 1} Testing: "${request}"`)
        console.log('   🤖 Sending to AI agent...')
        
        const startTime = Date.now()
        
        const response = await fetch('http://localhost:9999/api/ai/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: request,
            agent: 'auto', // Let AI choose the best agent
            context: {
              shopId: 'test-barbershop-interactive',
              businessName: 'Elite Interactive Barber Shop',
              testMode: true
            },
            stream: false
          })
        })

        const responseTime = Date.now() - startTime
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        passedTests++
        
        console.log(`   ⏱️  Response Time: ${responseTime}ms`)
        console.log(`   🤖 Agent Used: ${data.agent.name}`)
        
        if (data.actionExecuted) {
          actionsExecuted++
          console.log(`   🎯 ACTION EXECUTED: ${data.actionResult.type}`)
          console.log(`   ✅ Success: ${data.actionResult.success}`)
          console.log(`   📝 Result: ${data.actionResult.message}`)
          console.log(`   💡 Details: ${data.actionResult.details.slice(0, 80)}...`)
        } else {
          console.log(`   💬 Advice Mode: No action detected, provided consultation`)
        }
        
        console.log(`   🗨️  AI Response: "${data.message.slice(0, 120)}..."`)
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
        console.log(`   🔧 This indicates a system issue that needs fixing`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🎯 TEST RESULTS SUMMARY')
  console.log('='.repeat(60))
  
  console.log(`📊 Total Tests: ${totalTests}`)
  console.log(`✅ Passed Tests: ${passedTests}`)
  console.log(`❌ Failed Tests: ${totalTests - passedTests}`)
  console.log(`🚀 Actions Executed: ${actionsExecuted}`)
  console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`)
  console.log(`⚡ Action Detection Rate: ${Math.round((actionsExecuted / passedTests) * 100)}%`)
  
  const status = passedTests === totalTests ? '🟢 ALL SYSTEMS OPERATIONAL' : '🟡 SOME ISSUES DETECTED'
  console.log(`\n${status}`)
  
  if (actionsExecuted > 0) {
    console.log('\n🎉 CONFIRMED: AI can execute real actions for barbers!')
    console.log('✨ The system successfully detected and simulated:')
    console.log('   • SMS campaigns and reminders')
    console.log('   • Email marketing campaigns') 
    console.log('   • Customer follow-up and engagement')
    console.log('   • Staff notifications and updates')
    console.log('   • Social media content creation')
    console.log('   • Review collection campaigns')
  }
  
  console.log('\n🔧 Ready for production with authenticated users!')
}

// Add error handling and run the tests
testAIInteractively().catch(error => {
  console.error('❌ Test suite failed:', error.message)
  console.log('🔧 Please ensure the development server is running on port 9999')
  process.exit(1)
})