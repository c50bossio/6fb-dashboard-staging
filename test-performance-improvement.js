// Test Performance Improvement after Mock Data Elimination
// Measures API response times before and after the changes

const startTime = Date.now()

async function testAPIPerformance() {
  console.log('🚀 Testing Performance Improvements...\n')
  
  const testEndpoints = [
    { name: 'Dashboard Metrics', url: 'http://localhost:9999/api/dashboard/metrics' },
    { name: 'AI Insights', url: 'http://localhost:9999/api/ai/insights' },
    { name: 'Health Check', url: 'http://localhost:9999/api/health' }
  ]
  
  console.log('📊 Performance Test Results:')
  console.log('=' .repeat(60))
  
  for (const endpoint of testEndpoints) {
    try {
      const startTime = Date.now()
      const response = await fetch(endpoint.url)
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      const status = response.ok ? '✅ Success' : '❌ Failed'
      const data = await response.json()
      
      console.log(`${endpoint.name}:`)
      console.log(`  Status: ${status} (${response.status})`)
      console.log(`  Response Time: ${responseTime}ms`)
      console.log(`  Data Source: ${data.source || data.fallback ? 'fallback' : 'database'}`)
      console.log(`  Mock Data: ${data.fallback ? '❌ YES' : '✅ NO'}`)
      console.log('')
      
      // Performance benchmarks
      if (responseTime > 5000) {
        console.log(`  ⚠️  WARNING: Response time exceeds 5 seconds`)
      } else if (responseTime > 2000) {
        console.log(`  ⚠️  SLOW: Response time exceeds 2 seconds`)
      } else if (responseTime < 500) {
        console.log(`  🚀 FAST: Excellent response time`)
      }
      console.log('-'.repeat(40))
      
    } catch (error) {
      console.log(`${endpoint.name}: ❌ ERROR - ${error.message}`)
      console.log('-'.repeat(40))
    }
  }
  
  const totalTime = Date.now() - startTime
  console.log(`\n📈 Total Test Time: ${totalTime}ms`)
  console.log('\n🎯 Performance Targets:')
  console.log('  ✅ Under 500ms: Excellent')
  console.log('  ⚠️  500-2000ms: Good') 
  console.log('  ❌ Over 2000ms: Needs optimization')
  console.log('  🚨 Over 5000ms: Critical issue')
  
  console.log('\n🔍 What to Look For:')
  console.log('  • No "fallback: true" in responses')
  console.log('  • Response times under 2 seconds')
  console.log('  • Data source should be "database" not "fallback"')
  console.log('  • No mock data generators active')
}

// Simulate dashboard loading sequence
async function testDashboardLoadSequence() {
  console.log('\n🏪 Testing Complete Dashboard Load Sequence...')
  
  const dashboardStartTime = Date.now()
  
  try {
    // Simulate the UnifiedDashboard component loading sequence
    const dashboardPromises = [
      fetch('http://localhost:9999/api/dashboard/metrics'),
      fetch('http://localhost:9999/api/ai/insights?limit=5'),
      // Don't call FastAPI endpoints - they should be eliminated
    ]
    
    console.log('Loading dashboard data in parallel...')
    const responses = await Promise.all(dashboardPromises)
    const dashboardEndTime = Date.now()
    const totalDashboardTime = dashboardEndTime - dashboardStartTime
    
    console.log(`\n📊 Dashboard Load Results:`)
    console.log(`  Total Time: ${totalDashboardTime}ms`)
    console.log(`  Target: Under 2000ms`)
    
    if (totalDashboardTime < 1000) {
      console.log(`  🚀 EXCELLENT: Dashboard loads in under 1 second!`)
    } else if (totalDashboardTime < 2000) {
      console.log(`  ✅ GOOD: Dashboard loads in under 2 seconds`)
    } else if (totalDashboardTime < 5000) {
      console.log(`  ⚠️  SLOW: Dashboard takes more than 2 seconds`)
    } else {
      console.log(`  ❌ CRITICAL: Dashboard takes more than 5 seconds`)
    }
    
    // Check if any responses are using fallback/mock data
    let DataFound = false
    for (let i = 0; i < responses.length; i++) {
      if (responses[i].ok) {
        const data = await responses[i].json()
        if (data.fallback || data.source === 'fallback') {
          console.log(`  ❌ Mock data detected in response ${i + 1}`)
          mockDataFound = true
        }
      }
    }
    
    if (!mockDataFound) {
      console.log(`  ✅ No mock data - all responses use real database operations`)
    }
    
  } catch (error) {
    console.log(`❌ Dashboard load test failed: ${error.message}`)
  }
}

// Main test execution
async function runPerformanceTests() {
  console.log('🧪 Performance Improvement Validation')
  console.log('Testing elimination of mock data generators\n')
  
  try {
    await testAPIPerformance()
    await testDashboardLoadSequence()
    
    console.log('\n🎉 Performance test completed!')
    console.log('\n📋 Next Steps:')
    console.log('1. If any endpoint shows mock/fallback data: Run npm run setup-dashboard')
    console.log('2. If response times > 2s: Check database connection')
    console.log('3. If all tests pass: The 10-second loading issue should be resolved!')
    
  } catch (error) {
    console.error('❌ Performance test failed:', error)
  }
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch('http://localhost:9999/api/health', { timeout: 5000 })
    return response.ok
  } catch (error) {
    return false
  }
}

// Run tests if called directly
if (require.main === module) {
  checkServerRunning().then(isRunning => {
    if (!isRunning) {
      console.log('❌ Server is not running on localhost:9999')
      console.log('📋 Start the server first:')
      console.log('   npm run dev')
      console.log('   or')
      console.log('   ./docker-dev-start.sh')
      process.exit(1)
    } else {
      runPerformanceTests().catch(console.error)
    }
  })
}

module.exports = { testAPIPerformance, testDashboardLoadSequence }