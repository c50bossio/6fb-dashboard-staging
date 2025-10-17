/**
 * 6FB AI Agent System - Global Test Teardown
 * Cleans up test environment after Triple Tool testing
 */

const fs = require('fs').promises
const path = require('path')

async function globalTeardown(config) {

  try {
    await generateTestSummary()
    
    await cleanupTempFiles()
    
    if (process.env.CI) {
      await archiveTestResults()
    }
    
    await sendNotifications()

  } catch (error) {
    console.error('❌ Teardown error:', error.message)
  }
}

async function generateTestSummary() {

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
    }
  }
  
  const summaryPath = path.join('test-results', 'test-summary.json')
  await fs.writeFile(summaryPath, JSON.stringify(summaryData, null, 2))

}

async function cleanupTempFiles() {

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
    }
  }
  
  if (cleanedFiles > 0) {
    
  }
}

async function archiveTestResults() {

  try {
    const archiveName = `test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    await execAsync(`tar -czf ${archiveName} test-results/ playwright-report/ || true`)

    try {
      await fs.access('artifacts')
      await fs.rename(archiveName, `artifacts/${archiveName}`)
      
    } catch {
    }
    
  } catch (error) {
    console.warn('⚠️  Failed to archive test results:', error.message)
  }
}

async function sendNotifications() {
  if (!process.env.NOTIFICATION_WEBHOOK && !process.env.SLACK_WEBHOOK) {
    return
  }

  try {
    let testResults = null
    try {
      const resultsData = await fs.readFile('test-results/triple-tool-report.json', 'utf8')
      testResults = JSON.parse(resultsData)
    } catch {
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
    
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK || process.env.SLACK_WEBHOOK
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    })
    
    if (response.ok) {
      
    } else {
      console.warn('⚠️  Failed to send notification:', response.statusText)
    }
    
  } catch (error) {
    console.warn('⚠️  Notification error:', error.message)
  }
}

async function logFinalSummary() {
  try {
    const resultsData = await fs.readFile('test-results/triple-tool-report.json', 'utf8')
    const results = JSON.parse(resultsData)

    const { total, passed, failed, skipped, duration } = results.summary
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

    console.log(`\n📊 Test Summary: ${total} tests, ${passed} passed, ${failed} failed (${passRate}%)`)

    const tools = ['playwright', 'puppeteer', 'computerUse']
    tools.forEach(tool => {
      const toolResults = results.results[tool]
      if (toolResults && toolResults.length > 0) {
        const toolPassed = toolResults.filter(r => r.status === 'passed').length
        const toolTotal = toolResults.length
        const toolName = tool.charAt(0).toUpperCase() + tool.slice(1)
        console.log(`  ${toolName}: ${toolPassed}/${toolTotal} passed`)
      }
    })

    if (failed > 0) {
      console.log('\n❌ Some tests failed')
    } else {
      console.log('\n✅ All tests passed!')
    }

  } catch (error) {
    console.warn('⚠️  Could not generate final summary:', error.message)
  }
}

process.on('exit', () => {
  if (!process.env.SUPPRESS_FINAL_SUMMARY) {
    
  }
})

module.exports = globalTeardown