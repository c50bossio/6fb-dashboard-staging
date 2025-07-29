#!/usr/bin/env node

/**
 * 6FB AI Agent System - Puppeteer MCP Debug Utilities
 * Rapid debugging and automation using Puppeteer with MCP integration
 * Part of the Triple Tool Approach: Puppeteer for quick Chrome debugging
 */

const puppeteer = require('puppeteer')
const fs = require('fs').promises
const path = require('path')

/**
 * Puppeteer Debug Utilities Class
 * Provides MCP-compatible methods for rapid testing and debugging
 */
class PuppeteerDebugger {
  constructor() {
    this.browser = null
    this.page = null
    this.baseURL = process.env.BASE_URL || 'http://localhost:9999'
    this.screenshotDir = path.join(__dirname, '../test-results/puppeteer-screenshots')
    this.traceDir = path.join(__dirname, '../test-results/puppeteer-traces')
  }

  /**
   * Initialize Puppeteer browser instance
   * MCP Compatible: mcp__puppeteer__puppeteer_navigate equivalent
   */
  async init(options = {}) {
    const defaultOptions = {
      headless: process.env.NODE_ENV === 'production' ? 'new' : false,
      devtools: true,
      defaultViewport: { width: 1280, height: 720 },
      args: [
        '--enable-web-vitals-reporting',
        '--disable-web-security',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    }

    this.browser = await puppeteer.launch({ ...defaultOptions, ...options })
    this.page = await this.browser.newPage()

    // Enable performance monitoring
    await this.page.setCacheEnabled(false)
    await this.page.setRequestInterception(true)

    // Request logging for debugging
    this.page.on('request', request => {
      if (process.env.DEBUG_REQUESTS) {
        console.log(`→ ${request.method()} ${request.url()}`)
      }
    })

    this.page.on('response', response => {
      if (response.status() >= 400 && process.env.DEBUG_REQUESTS) {
        console.log(`← ${response.status()} ${response.url()}`)
      }
    })

    // Console logging
    this.page.on('console', msg => {
      const type = msg.type()
      if (type === 'error' || type === 'warning' || process.env.DEBUG_CONSOLE) {
        console.log(`[Browser ${type.toUpperCase()}]`, msg.text())
      }
    })

    // Page error handling
    this.page.on('pageerror', error => {
      console.error('[Page Error]', error.message)
    })

    // Ensure directories exist
    await this.ensureDirectories()

    return this.page
  }

  /**
   * Ensure output directories exist
   */
  async ensureDirectories() {
    await fs.mkdir(this.screenshotDir, { recursive: true })
    await fs.mkdir(this.traceDir, { recursive: true })
  }

  /**
   * Navigate to URL with performance monitoring
   * MCP Compatible: mcp__puppeteer__puppeteer_navigate
   */
  async navigate(url, options = {}) {
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`
    const startTime = Date.now()

    console.log(`Navigating to: ${fullURL}`)

    try {
      // Start tracing if requested
      if (options.trace) {
        await this.page.tracing.start({
          path: path.join(this.traceDir, `navigation-${Date.now()}.json`),
          screenshots: true
        })
      }

      await this.page.goto(fullURL, {
        waitUntil: options.waitUntil || 'networkidle2',
        timeout: options.timeout || 30000
      })

      const loadTime = Date.now() - startTime
      console.log(`✓ Page loaded in ${loadTime}ms`)

      // Stop tracing
      if (options.trace) {
        await this.page.tracing.stop()
      }

      return { success: true, loadTime }
    } catch (error) {
      console.error(`✗ Navigation failed: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Take screenshot with debugging info
   * MCP Compatible: mcp__puppeteer__puppeteer_screenshot
   */
  async screenshot(name, options = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${name}-${timestamp}.png`
    const filepath = path.join(this.screenshotDir, filename)

    try {
      await this.page.screenshot({
        path: filepath,
        fullPage: options.fullPage || false,
        clip: options.clip,
        ...options
      })

      console.log(`📸 Screenshot saved: ${filename}`)
      return { success: true, path: filepath, filename }
    } catch (error) {
      console.error(`✗ Screenshot failed: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Click element with debugging
   * MCP Compatible: mcp__puppeteer__puppeteer_click
   */
  async click(selector, options = {}) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 })
      
      // Highlight element if in debug mode
      if (process.env.DEBUG_INTERACTIONS) {
        await this.highlightElement(selector)
      }

      await this.page.click(selector, options)
      console.log(`✓ Clicked: ${selector}`)
      
      // Optional wait after click
      if (options.waitAfter) {
        await this.page.waitForTimeout(options.waitAfter)
      }

      return { success: true }
    } catch (error) {
      console.error(`✗ Click failed: ${selector} - ${error.message}`)
      await this.screenshot(`click-error-${selector.replace(/[^a-zA-Z0-9]/g, '-')}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Fill input with debugging
   * MCP Compatible: mcp__puppeteer__puppeteer_fill
   */
  async fill(selector, value, options = {}) {
    try {
      await this.page.waitForSelector(selector, { timeout: 5000 })
      
      if (process.env.DEBUG_INTERACTIONS) {
        await this.highlightElement(selector)
      }

      // Clear existing value if requested
      if (options.clear !== false) {
        await this.page.click(selector, { clickCount: 3 })
      }

      await this.page.type(selector, value, { delay: options.delay || 0 })
      console.log(`✓ Filled: ${selector} = "${value}"`)

      return { success: true }
    } catch (error) {
      console.error(`✗ Fill failed: ${selector} - ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Execute JavaScript with result logging
   * MCP Compatible: mcp__puppeteer__puppeteer_evaluate
   */
  async evaluate(script, ...args) {
    try {
      const result = await this.page.evaluate(script, ...args)
      console.log('🔧 JavaScript executed successfully')
      return { success: true, result }
    } catch (error) {
      console.error(`✗ JavaScript execution failed: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    try {
      const metrics = await this.page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        const paint = performance.getEntriesByType('paint')
        
        return {
          navigation: {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstByte: navigation.responseStart - navigation.requestStart
          },
          paint: paint.reduce((acc, entry) => {
            acc[entry.name.replace(/-/g, '_')] = entry.startTime
            return acc
          }, {}),
          memory: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          } : null
        }
      })

      console.log('📊 Performance Metrics:')
      console.log(`  DOM Content Loaded: ${metrics.navigation.domContentLoaded.toFixed(2)}ms`)
      console.log(`  Load Complete: ${metrics.navigation.loadComplete.toFixed(2)}ms`)
      console.log(`  First Byte: ${metrics.navigation.firstByte.toFixed(2)}ms`)
      
      if (metrics.paint.first_contentful_paint) {
        console.log(`  First Contentful Paint: ${metrics.paint.first_contentful_paint.toFixed(2)}ms`)
      }

      if (metrics.memory) {
        const memUsageMB = (metrics.memory.used / 1024 / 1024).toFixed(2)
        console.log(`  Memory Usage: ${memUsageMB}MB`)
      }

      return { success: true, metrics }
    } catch (error) {
      console.error(`✗ Performance metrics failed: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  /**
   * Debug booking flow specifically
   */
  async debugBookingFlow() {
    console.log('🔍 Starting booking flow debug...')
    
    // Navigate to booking page
    await this.navigate('/booking')
    await this.screenshot('booking-start')

    // Step 1: Service selection
    console.log('Step 1: Service Selection')
    await this.click('[data-testid="service-haircut-classic"]')
    await this.click('[data-testid="barber-john-smith"]')
    await this.screenshot('booking-step1-complete')

    // Step 2: Date and time
    console.log('Step 2: Date & Time Selection')
    await this.click('[data-testid="next-button"]')
    
    // Select tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    await this.click(`[data-testid="date-${tomorrowStr}"]`)
    await this.click('[data-testid="time-slot-10:00"]')
    await this.screenshot('booking-step2-complete')

    // Step 3: Confirmation
    console.log('Step 3: Confirmation')
    await this.click('[data-testid="next-button"]')
    await this.fill('[data-testid="client-name"]', 'Debug User')
    await this.fill('[data-testid="client-email"]', 'debug@example.com')
    await this.fill('[data-testid="client-phone"]', '+1234567890')
    await this.click('[data-testid="payment-credit-card"]')
    await this.click('[data-testid="terms-checkbox"]')
    await this.screenshot('booking-step3-ready')

    console.log('✓ Booking flow debug complete')
    return { success: true }
  }

  /**
   * Debug AI agents interface
   */
  async debugAIAgents() {
    console.log('🤖 Starting AI agents debug...')
    
    await this.navigate('/dashboard/agents')
    await this.screenshot('agents-page')

    // Test agent selection
    await this.click('[data-testid="agent-financial"]')
    await this.screenshot('agent-selected')

    // Test chat functionality
    await this.fill('[data-testid="message-input"]', 'Debug test message for financial agent')
    await this.click('[data-testid="send-button"]')
    await this.screenshot('message-sent')

    // Switch agents
    await this.click('[data-testid="agent-operations"]')
    await this.screenshot('agent-switched')

    console.log('✓ AI agents debug complete')
    return { success: true }
  }

  /**
   * Debug authentication flow
   */
  async debugAuth() {
    console.log('🔐 Starting authentication debug...')
    
    // Test login
    await this.navigate('/login')
    await this.screenshot('login-page')

    await this.fill('[data-testid="email-input"]', 'debug@example.com')
    await this.fill('[data-testid="password-input"]', 'debugpassword')
    await this.click('[data-testid="login-button"]')
    await this.screenshot('login-submitted')

    // Test registration
    await this.navigate('/register')
    await this.screenshot('register-page')

    await this.fill('[data-testid="name-input"]', 'Debug User')
    await this.fill('[data-testid="email-input"]', 'newdebug@example.com')
    await this.fill('[data-testid="password-input"]', 'securepassword123')
    await this.fill('[data-testid="confirm-password-input"]', 'securepassword123')
    await this.fill('[data-testid="barbershop-name-input"]', 'Debug Barbershop')
    await this.screenshot('register-form-filled')

    console.log('✓ Authentication debug complete')
    return { success: true }
  }

  /**
   * Highlight element for visual debugging
   */
  async highlightElement(selector) {
    await this.page.evaluate((sel) => {
      const element = document.querySelector(sel)
      if (element) {
        const originalOutline = element.style.outline
        element.style.outline = '3px solid red'
        setTimeout(() => {
          element.style.outline = originalOutline
        }, 2000)
      }
    }, selector)
  }

  /**
   * Get JavaScript errors from console
   */
  async getJavaScriptErrors() {
    const errors = []
    
    this.page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    })

    return errors
  }

  /**
   * Monitor network requests
   */
  async monitorNetworkRequests(options = {}) {
    const requests = []
    const responses = []

    this.page.on('request', request => {
      if (!options.filter || options.filter(request)) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          timestamp: Date.now()
        })
      }
      request.continue()
    })

    this.page.on('response', response => {
      if (!options.filter || options.filter(response)) {
        responses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: Date.now()
        })
      }
    })

    return { requests, responses }
  }

  /**
   * Generate debug report
   */
  async generateDebugReport() {
    const report = {
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      title: await this.page.title(),
      performance: await this.getPerformanceMetrics(),
      viewport: this.page.viewport(),
      cookies: await this.page.cookies(),
      localStorage: await this.page.evaluate(() => ({
        ...localStorage
      })),
      sessionStorage: await this.page.evaluate(() => ({
        ...sessionStorage
      })),
      userAgent: await this.page.evaluate(() => navigator.userAgent)
    }

    const reportPath = path.join(this.traceDir, `debug-report-${Date.now()}.json`)
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))

    console.log(`📋 Debug report saved: ${reportPath}`)
    return report
  }

  /**
   * Cleanup and close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close()
      console.log('🔒 Browser closed')
    }
  }
}

/**
 * CLI interface for direct usage
 */
async function main() {
  const debugger = new PuppeteerDebugger()
  
  try {
    await debugger.init()
    
    const command = process.argv[2]
    
    switch (command) {
      case 'booking':
        await debugger.debugBookingFlow()
        break
      case 'agents':
        await debugger.debugAIAgents()
        break
      case 'auth':
        await debugger.debugAuth()
        break
      case 'performance':
        await debugger.navigate('/')
        await debugger.getPerformanceMetrics()
        break
      case 'report':
        await debugger.navigate('/')
        await debugger.generateDebugReport()
        break
      default:
        console.log('Usage: node puppeteer-debug.js [booking|agents|auth|performance|report]')
        console.log('Available commands:')
        console.log('  booking     - Debug booking flow')
        console.log('  agents      - Debug AI agents interface')
        console.log('  auth        - Debug authentication')
        console.log('  performance - Get performance metrics')
        console.log('  report      - Generate debug report')
    }
  } catch (error) {
    console.error('Debug session failed:', error)
  } finally {
    await debugger.close()
  }
}

// Export for use as module
module.exports = PuppeteerDebugger

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error)
}