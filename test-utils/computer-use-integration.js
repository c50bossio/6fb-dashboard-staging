/**
 * 6FB AI Agent System - Computer Use Integration
 * AI-powered visual validation and UX testing
 * Part of the Triple Tool Approach: Computer Use for AI visual analysis
 */

const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs').promises
const path = require('path')

const execAsync = promisify(exec)

/**
 * Computer Use Integration Class
 * Provides AI-powered visual analysis and UX validation
 */
class ComputerUseIntegration {
  constructor() {
    this.screenshotDir = path.join(__dirname, '../test-results/computer-use-screenshots')
    this.reportsDir = path.join(__dirname, '../test-results/computer-use-reports')
    this.pythonScript = path.join(__dirname, '../../computer_use_basic.py')
  }

  /**
   * Initialize Computer Use integration
   */
  async init() {
    await fs.mkdir(this.screenshotDir, { recursive: true })
    await fs.mkdir(this.reportsDir, { recursive: true })

    try {
      await fs.access(this.pythonScript)
      console.log('✓ Computer Use Python script found')
    } catch (error) {
      console.warn('⚠ Computer Use Python script not found at:', this.pythonScript)
      console.warn('AI visual analysis will be skipped')
      return false
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠ ANTHROPIC_API_KEY not configured')
      console.warn('AI visual analysis will be skipped')
      return false
    }

    return true
  }

  /**
   * Analyze current screen with Claude
   */
  async analyzeScreen(prompt, options = {}) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(this.screenshotDir, `analysis-${timestamp}.png`)
      
      if (!options.screenshotPath) {
        await this.takeScreenshot(screenshotPath)
        options.screenshotPath = screenshotPath
      }

      const command = `cd "${path.dirname(this.pythonScript)}" && python3 computer_use_basic.py "${prompt}"`
      const { stdout, stderr } = await execAsync(command, {
        env: { ...process.env },
        timeout: 30000 // 30 second timeout
      })

      if (stderr) {
        console.warn('Computer Use stderr:', stderr)
      }

      const response = JSON.parse(stdout)
      
      const reportPath = path.join(this.reportsDir, `analysis-${timestamp}.json`)
      await fs.writeFile(reportPath, JSON.stringify({
        timestamp,
        prompt,
        response,
        screenshotPath: options.screenshotPath,
        metadata: options.metadata || {}
      }, null, 2))

      console.log('🤖 AI Visual Analysis completed')
      return {
        success: true,
        response: response.response,
        confidence: response.confidence || null,
        screenshotPath: options.screenshotPath,
        reportPath
      }
    } catch (error) {
      console.error('Computer Use analysis failed:', error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Take screenshot for analysis
   */
  async takeScreenshot(outputPath) {
    try {
      if (process.platform === 'darwin') {
        await execAsync(`screencapture -x "${outputPath}"`)
      } else if (process.platform === 'linux') {
        await execAsync(`gnome-screenshot -f "${outputPath}"`)
      } else if (process.platform === 'win32') {
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds | % { $Bitmap = New-Object System.Drawing.Bitmap($_.Width, $_.Height); $Graphics = [System.Drawing.Graphics]::FromImage($Bitmap); $Graphics.CopyFromScreen($_.X, $_.Y, 0, 0, $Bitmap.Size); $Bitmap.Save('${outputPath}'); }`
        await execAsync(`powershell -Command "${psCommand}"`)
      } else {
        throw new Error(`Unsupported platform: ${process.platform}`)
      }
      
      console.log('📸 Screenshot taken:', outputPath)
      return outputPath
    } catch (error) {
      console.error('Screenshot failed:', error.message)
      throw error
    }
  }

  /**
   * Validate booking flow UX with AI
   */
  async validateBookingFlowUX(page) {
    console.log('🔍 AI UX Validation - Booking Flow')
    
    const results = []

    if (page) {
      await page.goto('/booking')
      await page.waitForSelector('[data-testid="service-grid"]')
    }

    const step1Analysis = await this.analyzeScreen(
      "Analyze this booking interface for user experience. Focus on: 1) Are the services clearly visible and well-organized? 2) Is the layout intuitive for service selection? 3) Are there any visual issues or confusion points? 4) Is the design accessible and professional?",
      { metadata: { step: 'service-selection', page: '/booking' } }
    )
    results.push({ step: 1, analysis: step1Analysis })

    if (page) {
      await page.click('[data-testid="service-haircut-classic"]')
      await page.click('[data-testid="barber-john-smith"]')
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="date-picker"]')
    }

    const step2Analysis = await this.analyzeScreen(
      "Evaluate this date and time selection interface. Check: 1) Is the calendar easy to read and navigate? 2) Are available time slots clearly marked? 3) Is the selection process intuitive? 4) Are there any usability issues with the date/time picker?",
      { metadata: { step: 'date-time-selection', page: '/booking' } }
    )
    results.push({ step: 2, analysis: step2Analysis })

    if (page) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      await page.click(`[data-testid="date-${tomorrowStr}"]`)
      await page.click('[data-testid="time-slot-10:00"]')
      await page.click('[data-testid="next-button"]')
      await page.waitForSelector('[data-testid="booking-summary"]')
    }

    const step3Analysis = await this.analyzeScreen(
      "Review this booking confirmation page for UX quality. Assess: 1) Is the booking summary clear and complete? 2) Are the form fields properly labeled and organized? 3) Is the payment section trustworthy and secure-looking? 4) Are there any barriers to completing the booking?",
      { metadata: { step: 'confirmation', page: '/booking' } }
    )
    results.push({ step: 3, analysis: step3Analysis })

    const uxReport = await this.generateUXReport(results, 'booking-flow')
    
    return {
      success: true,
      steps: results,
      report: uxReport
    }
  }

  /**
   * Validate dashboard UX with AI
   */
  async validateDashboardUX(page) {
    console.log('🔍 AI UX Validation - Dashboard')
    
    if (page) {
      await page.goto('/dashboard')
      await page.waitForSelector('[data-testid="dashboard-content"]')
    }

    const dashboardAnalysis = await this.analyzeScreen(
      "Analyze this dashboard interface for user experience and design quality. Evaluate: 1) Information hierarchy and visual organization 2) Readability of stats and metrics 3) Navigation clarity and accessibility 4) Overall visual appeal and professionalism 5) Any design inconsistencies or issues",
      { metadata: { page: 'dashboard', section: 'main' } }
    )

    if (page) {
      await page.goto('/dashboard/agents')
      await page.waitForSelector('[data-testid="agents-grid"]')
    }

    const agentsAnalysis = await this.analyzeScreen(
      "Evaluate this AI agents interface. Focus on: 1) Clarity of agent cards and their purposes 2) Visual distinction between different agents 3) Ease of agent selection and interaction 4) Chat interface usability 5) Overall user-friendliness for business users",
      { metadata: { page: 'dashboard/agents', section: 'ai-agents' } }
    )

    if (page) {
      await page.goto('/dashboard/integrations')
      await page.waitForSelector('[data-testid="integrations-grid"]')
    }

    const integrationsAnalysis = await this.analyzeScreen(
      "Review this integrations page for UX effectiveness. Check: 1) Clear presentation of available integrations 2) Easy identification of connected vs. disconnected services 3) Intuitive setup process visibility 4) Trust indicators for third-party integrations 5) Overall organization and findability",
      { metadata: { page: 'dashboard/integrations', section: 'integrations' } }
    )

    const results = [
      { section: 'dashboard', analysis: dashboardAnalysis },
      { section: 'agents', analysis: agentsAnalysis },
      { section: 'integrations', analysis: integrationsAnalysis }
    ]

    const uxReport = await this.generateUXReport(results, 'dashboard')
    
    return {
      success: true,
      sections: results,
      report: uxReport
    }
  }

  /**
   * Check accessibility with AI analysis
   */
  async validateAccessibility(page, pageUrl) {
    console.log(`🔍 AI Accessibility Validation - ${pageUrl}`)
    
    if (page) {
      await page.goto(pageUrl)
      await page.waitForLoadState('networkidle')
    }

    const accessibilityAnalysis = await this.analyzeScreen(
      "Perform an accessibility analysis of this interface. Evaluate: 1) Color contrast and readability for visually impaired users 2) Text size and font legibility 3) Button and interactive element visibility 4) Visual hierarchy and structure 5) Potential barriers for users with disabilities 6) Compliance with WCAG guidelines based on visual appearance",
      { metadata: { page: pageUrl, type: 'accessibility' } }
    )

    const specificChecks = await this.analyzeScreen(
      "Focus specifically on accessibility issues: 1) Are there any interactive elements that might be too small for motor-impaired users? 2) Is there sufficient color contrast throughout? 3) Are error states and validation messages clearly visible? 4) Would this interface work well with screen readers based on visual layout? 5) Are there any flashing or problematic animations?",
      { metadata: { page: pageUrl, type: 'accessibility-specific' } }
    )

    return {
      success: true,
      general: accessibilityAnalysis,
      specific: specificChecks,
      page: pageUrl
    }
  }

  /**
   * Validate responsive design across viewports
   */
  async validateResponsiveDesign(page, pageUrl) {
    console.log(`🔍 AI Responsive Design Validation - ${pageUrl}`)
    
    const viewports = [
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 }
    ]

    const results = []

    for (const viewport of viewports) {
      if (page) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(pageUrl)
        await page.waitForLoadState('networkidle')
      }

      const responsiveAnalysis = await this.analyzeScreen(
        `Analyze this ${viewport.name} (${viewport.width}x${viewport.height}) layout for responsive design quality. Check: 1) Element proportions and spacing 2) Text readability at this size 3) Navigation usability 4) Content organization and hierarchy 5) Touch target sizes (if mobile) 6) Overall layout effectiveness at this viewport`,
        { 
          metadata: { 
            page: pageUrl, 
            viewport: viewport.name,
            dimensions: `${viewport.width}x${viewport.height}`
          } 
        }
      )

      results.push({
        viewport: viewport.name,
        dimensions: viewport,
        analysis: responsiveAnalysis
      })
    }

    return {
      success: true,
      viewports: results,
      page: pageUrl
    }
  }

  /**
   * Detect visual bugs and inconsistencies
   */
  async detectVisualBugs(page, pageUrl) {
    console.log(`🔍 AI Visual Bug Detection - ${pageUrl}`)
    
    if (page) {
      await page.goto(pageUrl)
      await page.waitForLoadState('networkidle')
    }

    const bugAnalysis = await this.analyzeScreen(
      "Scan this interface for visual bugs and design inconsistencies. Look for: 1) Misaligned elements or broken layouts 2) Overlapping text or components 3) Inconsistent spacing or margins 4) Missing images or broken icons 5) Color inconsistencies or theme issues 6) Typography problems 7) Any visual elements that appear broken or incomplete",
      { metadata: { page: pageUrl, type: 'bug-detection' } }
    )

    const specificBugCheck = await this.analyzeScreen(
      "Focus on specific visual problems: 1) Are there any form elements that look broken or oddly positioned? 2) Do all buttons and interactive elements appear clickable and properly styled? 3) Are there any text overflow issues or cut-off content? 4) Do modal dialogs and overlays display correctly? 5) Are loading states and animations working as expected?",
      { metadata: { page: pageUrl, type: 'specific-bugs' } }
    )

    return {
      success: true,
      general: bugAnalysis,
      specific: specificBugCheck,
      page: pageUrl
    }
  }

  /**
   * Generate comprehensive UX report
   */
  async generateUXReport(analyses, reportName) {
    const timestamp = new Date().toISOString()
    const reportPath = path.join(this.reportsDir, `${reportName}-ux-report-${timestamp.replace(/[:.]/g, '-')}.json`)
    
    const report = {
      reportName,
      timestamp,
      summary: {
        totalAnalyses: analyses.length,
        successCount: analyses.filter(a => a.analysis.success).length,
        failureCount: analyses.filter(a => a.analysis && !a.analysis.success).length
      },
      analyses,
      recommendations: this.extractRecommendations(analyses),
      overallScore: this.calculateUXScore(analyses)
    }

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`📋 UX Report generated: ${reportPath}`)
    return report
  }

  /**
   * Extract actionable recommendations from AI analyses
   */
  extractRecommendations(analyses) {
    const recommendations = []
    
    analyses.forEach(analysis => {
      if (analysis.analysis && analysis.analysis.success && analysis.analysis.response) {
        const response = analysis.analysis.response.toLowerCase()
        
        if (response.includes('improve') || response.includes('should') || response.includes('recommend')) {
          const sentences = analysis.analysis.response.split('.')
          sentences.forEach(sentence => {
            if (sentence.toLowerCase().includes('improve') || 
                sentence.toLowerCase().includes('should') || 
                sentence.toLowerCase().includes('recommend')) {
              recommendations.push({
                source: analysis.step || analysis.section || analysis.viewport || 'general',
                recommendation: sentence.trim(),
                priority: this.assessRecommendationPriority(sentence)
              })
            }
          })
        }
      }
    })

    return recommendations
  }

  /**
   * Assess recommendation priority based on keywords
   */
  assessRecommendationPriority(recommendation) {
    const text = recommendation.toLowerCase()
    
    if (text.includes('critical') || text.includes('broken') || text.includes('inaccessible')) {
      return 'high'
    } else if (text.includes('improve') || text.includes('enhance') || text.includes('better')) {
      return 'medium'
    } else {
      return 'low'
    }
  }

  /**
   * Calculate overall UX score based on analyses
   */
  calculateUXScore(analyses) {
    const successfulAnalyses = analyses.filter(a => a.analysis && a.analysis.success)
    
    if (successfulAnalyses.length === 0) return 0
    
    let totalScore = 0
    successfulAnalyses.forEach(analysis => {
      const response = analysis.analysis.response.toLowerCase()
      let score = 70 // Base score
      
      if (response.includes('excellent') || response.includes('great')) score += 20
      else if (response.includes('good') || response.includes('well')) score += 10
      else if (response.includes('clear') || response.includes('intuitive')) score += 5
      
      if (response.includes('poor') || response.includes('bad')) score -= 20
      else if (response.includes('confusing') || response.includes('difficult')) score -= 15
      else if (response.includes('issue') || response.includes('problem')) score -= 10
      
      totalScore += Math.max(0, Math.min(100, score))
    })
    
    return Math.round(totalScore / successfulAnalyses.length)
  }

  /**
   * Run comprehensive UX audit
   */
  async runComprehensiveAudit(page) {
    console.log('🚀 Starting Comprehensive AI UX Audit')
    
    const auditResults = {
      timestamp: new Date().toISOString(),
      results: {}
    }

    try {
      auditResults.results.bookingFlow = await this.validateBookingFlowUX(page)

      auditResults.results.dashboard = await this.validateDashboardUX(page)

      const pages = ['/', '/dashboard', '/booking', '/dashboard/agents']
      auditResults.results.accessibility = {}
      
      for (const pageUrl of pages) {
        auditResults.results.accessibility[pageUrl] = await this.validateAccessibility(page, pageUrl)
      }

      auditResults.results.responsive = {}
      for (const pageUrl of pages) {
        auditResults.results.responsive[pageUrl] = await this.validateResponsiveDesign(page, pageUrl)
      }

      auditResults.results.visualBugs = {}
      for (const pageUrl of pages) {
        auditResults.results.visualBugs[pageUrl] = await this.detectVisualBugs(page, pageUrl)
      }

      const masterReportPath = path.join(
        this.reportsDir, 
        `comprehensive-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      )
      await fs.writeFile(masterReportPath, JSON.stringify(auditResults, null, 2))

      console.log('✅ Comprehensive AI UX Audit completed')
      console.log(`📋 Master report: ${masterReportPath}`)

      return auditResults

    } catch (error) {
      console.error('❌ Comprehensive audit failed:', error.message)
      return { success: false, error: error.message }
    }
  }
}

module.exports = ComputerUseIntegration