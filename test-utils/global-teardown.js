/**
 * 6FB AI Agent System - Global Test Teardown
 * Cleans up test environment after Triple Tool testing
 */

const fs = require('fs').promises
const path = require('path')

async function globalTeardown(config) {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Generate final test summary
    await generateTestSummary()
    
    // Clean up temporary files
    await cleanupTempFiles()
    
    // Archive test results if in CI
    if (process.env.CI) {
      await archiveTestResults()
    }
    
    // Send notifications if configured
    await sendNotifications()
    
    console.log('✅ Global teardown completed successfully')
    
  } catch (error) {
    console.error('❌ Teardown error:', error.message)
  }
}

async function generateTestSummary() {
  console.log('📊 Generating final test summary...')
  
  const summaryData = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      ci: !!process.env.CI
    },
    testRun: {
      duration: Date.now() - (global.testStartTime || Date.now()),
      resultsPath: 'test-results/',
      reportsGenerated: []
    }
  }
  
  // Check for generated reports
  const reportFiles = [
    'test-results/triple-tool-report.json',
    'test-results/triple-tool-report.html',
    'playwright-report/index.html',
    'test-results/results.json'
  ]
  
  for (const file of reportFiles) {
    try {
      await fs.access(file)
      summaryData.testRun.reportsGenerated.push(file)
    } catch {
      // File doesn't exist, skip
    }
  }
  
  // Save summary
  const summaryPath = path.join('test-results', 'test-summary.json')
  await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2))
  
  console.log('✓ Test summary generated')
  console.log(`   Reports available: ${summaryData.testRun.reportsGenerated.length}`)
}

async function cleanupTempFiles() {
  console.log('🗑️  Cleaning up temporary files...')
  
  const tempPatterns = [
    'test-results/tmp-*',
    'test-results/*.tmp',
    'playwright/.auth/*.tmp',
    'test-results/puppeteer-screenshots/debug-*'
  ]
  
  let cleanedFiles = 0
  
  for (const pattern of tempPatterns) {
    try {
      const { glob } = require('glob')
      const files = await glob(pattern)
      
      for (const file of files) {
        await fs.unlink(file)
        cleanedFiles++
      }
    } catch (error) {
      // Pattern didn't match or glob not available
    }
  }
  
  if (cleanedFiles > 0) {
    console.log(`✓ Cleaned up ${cleanedFiles} temporary files`)
  }
}

async function archiveTestResults() {
  console.log('📦 Archiving test results for CI...')
  
  try {
    const archiveName = `test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    // Create archive of test results
    await execAsync(`tar -czf ${archiveName} test-results/ playwright-report/ || true`)
    
    console.log(`✓ Test results archived as ${archiveName}`)
    
    // Move to artifacts directory if it exists
    try {
      await fs.access('artifacts')
      await fs.rename(archiveName, `artifacts/${archiveName}`)
      console.log('✓ Archive moved to artifacts directory')
    } catch {
      // Artifacts directory doesn't exist, leave in root
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to archive test results:', error.message)
  }
}

async function sendNotifications() {
  // Skip notifications if not configured
  if (!process.env.NOTIFICATION_WEBHOOK && !process.env.SLACK_WEBHOOK) {
    return
  }
  
  console.log('📤 Sending test notifications...')
  
  try {
    // Read test results
    let testResults = null
    try {
      const resultsData = await fs.readFile('test-results/triple-tool-report.json', 'utf8')
      testResults = JSON.parse(resultsData)
    } catch {
      // Results file not available
      return
    }
    
    const { total, passed, failed, skipped } = testResults.summary
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    const status = failed > 0 ? 'FAILED' : 'PASSED'
    const emoji = failed > 0 ? '❌' : '✅'
    
    const message = {
      text: `${emoji} 6FB AI Agent System Tests ${status}`,
      attachments: [
        {
          color: failed > 0 ? 'danger' : 'good',
          fields: [
            {
              title: 'Test Results',
              value: `${passed}/${total} passed (${passRate}%)`,
              short: true
            },
            {
              title: 'Failed',
              value: failed.toString(),
              short: true
            },
            {
              title: 'Branch',
              value: process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown',
              short: true
            },
            {
              title: 'Commit',
              value: process.env.GITHUB_SHA?.substring(0, 7) || process.env.COMMIT_SHA || 'unknown',
              short: true
            }
          ]
        }
      ]
    }
    
    // Send to webhook
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK || process.env.SLACK_WEBHOOK
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })
    
    if (response.ok) {
      console.log('✓ Notification sent successfully')
    } else {
      console.warn('⚠️  Failed to send notification:', response.statusText)
    }
    
  } catch (error) {
    console.warn('⚠️  Notification error:', error.message)
  }
}

async function logFinalSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('🏁 6FB AI Agent System - Testing Complete')
  console.log('='.repeat(60))
  
  try {
    const resultsData = await fs.readFile('test-results/triple-tool-report.json', 'utf8')
    const results = JSON.parse(resultsData)
    
    const { total, passed, failed, skipped, duration } = results.summary
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    
    console.log(`📊 Final Results:`)
    console.log(`   Total Tests: ${total}`)
    console.log(`   ✅ Passed: ${passed}`)
    console.log(`   ❌ Failed: ${failed}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   📈 Pass Rate: ${passRate}%`)
    console.log(`   ⏱️  Duration: ${Math.round(duration / 1000)}s`)
    console.log('')
    
    // Show tool breakdown
    console.log('🛠️  Tool Breakdown:')
    const tools = ['playwright', 'puppeteer', 'computerUse']
    tools.forEach(tool => {
      const toolResults = results.results[tool]
      if (toolResults && toolResults.length > 0) {
        const toolPassed = toolResults.filter(r => r.status === 'passed').length
        const toolTotal = toolResults.length
        const toolName = tool.charAt(0).toUpperCase() + tool.slice(1)
        console.log(`   ${toolName}: ${toolPassed}/${toolTotal}`)
      }
    })
    
    console.log('')
    console.log('📁 View Results:')
    console.log('   HTML Report: test-results/triple-tool-report.html')
    console.log('   Playwright Report: playwright-report/index.html')
    console.log('   JSON Data: test-results/triple-tool-report.json')
    
    if (failed > 0) {
      console.log('')
      console.log('❌ Some tests failed. Check the reports for details.')
      console.log('   Debug with: npm run test:e2e:debug')
      console.log('   Puppeteer debug: npm run puppeteer:debug')
    } else {
      console.log('')
      console.log('🎉 All tests passed! Great job!')
    }
    
  } catch (error) {
    console.log('📝 Test execution completed')
    console.log('   Check test-results/ directory for output')
  }
  
  console.log('='.repeat(60))
}

// Always show final summary
process.on('exit', () => {
  if (!process.env.SUPPRESS_FINAL_SUMMARY) {
    // This runs synchronously, so we can't use async functions
    console.log('\n🏁 6FB AI Agent System testing session ended')
  }
})

module.exports = globalTeardown