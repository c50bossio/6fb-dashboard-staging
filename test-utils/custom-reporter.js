/**
 * 6FB AI Agent System - Custom Test Reporter
 * Integrates results from Playwright, Puppeteer, and Computer Use
 * Part of the Triple Tool Approach reporting
 */

const fs = require('fs').promises
const path = require('path')

class TripleToolReporter {
  constructor(options = {}) {
    this.config = options
    this.results = {
      playwright: [],
      puppeteer: [],
      computerUse: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      }
    }
  }

  onBegin(config, suite) {
    this.startTime = Date.now()
    console.log(`🚀 Starting Triple Tool Testing Suite`)
    console.log(`   Playwright: E2E Tests`)
    console.log(`   Puppeteer: Quick Debug`)
    console.log(`   Computer Use: AI Visual Validation`)
    console.log('')
  }

  onTestBegin(test, result) {
    const testType = this.categorizeTest(test)
    console.log(`${this.getTestIcon(testType)} ${test.title}`)
  }

  onTestEnd(test, result) {
    const testType = this.categorizeTest(test)
    const duration = result.duration
    const status = result.status
    
    const testResult = {
      title: test.title,
      file: test.location.file,
      line: test.location.line,
      status,
      duration,
      type: testType,
      error: result.error,
      attachments: result.attachments
    }

    this.results[testType].push(testResult)
    this.results.summary.total++
    
    switch (status) {
      case 'passed':
        this.results.summary.passed++
        console.log(`   ✅ Passed (${duration}ms)`)
        break
      case 'failed':
        this.results.summary.failed++
        console.log(`   ❌ Failed (${duration}ms)`)
        if (result.error) {
          console.log(`      ${result.error.message}`)
        }
        break
      case 'skipped':
        this.results.summary.skipped++
        console.log(`   ⏭️  Skipped`)
        break
    }
  }

  onEnd() {
    this.results.summary.duration = Date.now() - this.startTime
    this.generateReport()
  }

  categorizeTest(test) {
    const title = test.title.toLowerCase()
    const file = test.location.file.toLowerCase()
    
    if (file.includes('visual') || title.includes('@visual')) {
      return 'playwright'
    } else if (title.includes('performance') || title.includes('@performance')) {
      return 'playwright'
    } else if (title.includes('accessibility') || title.includes('@accessibility')) {
      return 'playwright'
    } else if (file.includes('puppeteer') || title.includes('debug')) {
      return 'puppeteer'
    } else if (title.includes('ai') || title.includes('computer use')) {
      return 'computerUse'
    } else {
      return 'playwright'
    }
  }

  getTestIcon(testType) {
    switch (testType) {
      case 'playwright': return '🎭'
      case 'puppeteer': return '🚀'
      case 'computerUse': return '🤖'
      default: return '🧪'
    }
  }

  async generateReport() {
    console.log('\n📊 Triple Tool Testing Results Summary')
    console.log('=' .repeat(50))
    
    const { total, passed, failed, skipped, duration } = this.results.summary
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    
    console.log(`Total Tests:     ${total}`)
    console.log(`✅ Passed:        ${passed}`)
    console.log(`❌ Failed:        ${failed}`)
    console.log(`⏭️  Skipped:       ${skipped}`)
    console.log(`📈 Pass Rate:     ${passRate}%`)
    console.log(`⏱️  Duration:      ${Math.round(duration / 1000)}s`)
    console.log('')

    console.log('📋 Results by Testing Tool:')
    console.log('-'.repeat(30))
    
    const tools = ['playwright', 'puppeteer', 'computerUse']
    tools.forEach(tool => {
      const toolResults = this.results[tool]
      const toolPassed = toolResults.filter(r => r.status === 'passed').length
      const toolFailed = toolResults.filter(r => r.status === 'failed').length
      const toolTotal = toolResults.length
      const toolPassRate = toolTotal > 0 ? Math.round((toolPassed / toolTotal) * 100) : 0
      
      if (toolTotal > 0) {
        const icon = this.getTestIcon(tool)
        const toolName = tool.charAt(0).toUpperCase() + tool.slice(1)
        console.log(`${icon} ${toolName}: ${toolPassed}/${toolTotal} (${toolPassRate}%)`)
      }
    })

    console.log('\n⚡ Performance Highlights:')
    console.log('-'.repeat(25))
    
    const performanceTests = this.results.playwright.filter(t => 
      t.title.toLowerCase().includes('performance') || 
      t.title.toLowerCase().includes('load')
    )
    
    if (performanceTests.length > 0) {
      const avgDuration = Math.round(
        performanceTests.reduce((sum, test) => sum + test.duration, 0) / performanceTests.length
      )
      console.log(`Avg Performance Test Duration: ${avgDuration}ms`)
    }

    const visualTests = this.results.playwright.filter(t => 
      t.title.toLowerCase().includes('visual') || 
      t.title.toLowerCase().includes('screenshot')
    )
    
    if (visualTests.length > 0) {
      const visualPassed = visualTests.filter(t => t.status === 'passed').length
      console.log(`Visual Regression Tests: ${visualPassed}/${visualTests.length}`)
    }

    const a11yTests = this.results.playwright.filter(t => 
      t.title.toLowerCase().includes('accessibility') || 
      t.title.toLowerCase().includes('wcag')
    )
    
    if (a11yTests.length > 0) {
      const a11yPassed = a11yTests.filter(t => t.status === 'passed').length
      console.log(`Accessibility Tests: ${a11yPassed}/${a11yTests.length}`)
    }

    const failedTests = [
      ...this.results.playwright,
      ...this.results.puppeteer,
      ...this.results.computerUse
    ].filter(t => t.status === 'failed')

    if (failedTests.length > 0) {
      console.log('\n🚨 Failed Tests:')
      console.log('-'.repeat(15))
      
      failedTests.forEach((test, index) => {
        console.log(`${index + 1}. ${test.title}`)
        console.log(`   File: ${path.basename(test.file)}:${test.line}`)
        if (test.error) {
          console.log(`   Error: ${test.error.message}`)
        }
        console.log('')
      })
    }

    await this.generateJSONReport()
    
    await this.generateHTMLReport()
    
    console.log('\n📁 Reports Generated:')
    console.log(`   JSON: test-results/triple-tool-report.json`)
    console.log(`   HTML: test-results/triple-tool-report.html`)
    
    if (failed > 0) {
      console.log(`\n❌ ${failed} test(s) failed. See details above.`)
      process.exit(1)
    } else {
      console.log(`\n✅ All ${passed} tests passed!`)
    }
  }

  async generateJSONReport() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      results: this.results,
      metadata: {
        framework: '6FB AI Agent System - Triple Tool Approach',
        tools: ['Playwright', 'Puppeteer', 'Computer Use'],
        version: '1.0.0'
      }
    }

    const reportPath = path.join(process.cwd(), 'test-results', 'triple-tool-report.json')
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2))
  }

  async generateHTMLReport() {
    const html = this.generateHTMLContent()
    const reportPath = path.join(process.cwd(), 'test-results', 'triple-tool-report.html')
    await fs.writeFile(reportPath, html)
  }

  generateHTMLContent() {
    const { total, passed, failed, skipped, duration } = this.results.summary
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB AI Agent System - Test Results</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .header h1 { color: #2563eb; margin: 0; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #2563eb; }
        .metric.passed { border-left-color: #10b981; }
        .metric.failed { border-left-color: #ef4444; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #64748b; font-size: 0.9em; }
        .tools-section { margin-bottom: 40px; }
        .tool-results { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .tool-card { background: #f8fafc; border-radius: 6px; padding: 20px; }
        .tool-header { display: flex; align-items: center; margin-bottom: 15px; }
        .tool-icon { font-size: 1.5em; margin-right: 10px; }
        .tool-name { font-weight: bold; font-size: 1.1em; }
        .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 10px; }
        .progress-fill { height: 100%; background: #10b981; transition: width 0.3s ease; }
        .test-list { margin-top: 30px; }
        .test-item { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .test-item.failed { border-left: 4px solid #ef4444; }
        .test-item.passed { border-left: 4px solid #10b981; }
        .test-title { font-weight: 500; margin-bottom: 5px; }
        .test-meta { font-size: 0.9em; color: #64748b; }
        .error-message { background: #fef2f2; color: #dc2626; padding: 10px; border-radius: 4px; margin-top: 10px; font-family: monospace; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 6FB AI Agent System</h1>
            <h2>Triple Tool Testing Results</h2>
            <p>Playwright + Puppeteer + Computer Use</p>
        </div>

        <div class="summary">
            <div class="metric">
                <div class="metric-value">${total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric passed">
                <div class="metric-value">${passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric failed">
                <div class="metric-value">${failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">${passRate}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric">
                <div class="metric-value">${Math.round(duration / 1000)}s</div>
                <div class="metric-label">Duration</div>
            </div>
        </div>

        <div class="tools-section">
            <h3>Results by Testing Tool</h3>
            <div class="tool-results">
                ${this.generateToolCards()}
            </div>
        </div>

        <div class="test-list">
            <h3>Test Details</h3>
            ${this.generateTestItems()}
        </div>
    </div>

    <script>
        console.log('6FB AI Agent System Test Results Loaded');
    </script>
</body>
</html>`
  }

  generateToolCards() {
    const tools = [
      { key: 'playwright', name: 'Playwright', icon: '🎭', description: 'E2E & Visual Tests' },
      { key: 'puppeteer', name: 'Puppeteer', icon: '🚀', description: 'Quick Debug & Automation' },
      { key: 'computerUse', name: 'Computer Use', icon: '🤖', description: 'AI Visual Validation' }
    ]

    return tools.map(tool => {
      const results = this.results[tool.key]
      const total = results.length
      const passed = results.filter(r => r.status === 'passed').length
      const passRate = total > 0 ? Math.round((passed / total) * 100) : 0
      
      if (total === 0) return ''
      
      return `
        <div class="tool-card">
            <div class="tool-header">
                <span class="tool-icon">${tool.icon}</span>
                <span class="tool-name">${tool.name}</span>
            </div>
            <p style="color: #64748b; margin: 0 0 15px 0; font-size: 0.9em;">${tool.description}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${passRate}%"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                <span>${passed}/${total} passed</span>
                <span>${passRate}%</span>
            </div>
        </div>
      `
    }).join('')
  }

  generateTestItems() {
    const allTests = [
      ...this.results.playwright,
      ...this.results.puppeteer,
      ...this.results.computerUse
    ].sort((a, b) => a.title.localeCompare(b.title))

    return allTests.map(test => `
      <div class="test-item ${test.status}">
          <div class="test-title">
              ${this.getTestIcon(test.type)} ${test.title}
          </div>
          <div class="test-meta">
              ${path.basename(test.file)} • ${test.duration}ms • ${test.status}
          </div>
          ${test.error ? `<div class="error-message">${test.error.message}</div>` : ''}
      </div>
    `).join('')
  }
}

module.exports = TripleToolReporter