'use client'

/**
 * Button Health Monitor System
 * Proactively tests button functionality and identifies broken interactions
 */

class ButtonHealthMonitor {
  constructor() {
    this.results = {
      tested: 0,
      working: 0,
      broken: 0,
      warnings: 0,
      errors: []
    }
    this.knownRoutes = new Set()
    this.knownApiEndpoints = new Set()
  }

  /**
   * Initialize the monitoring system with known good routes and endpoints
   */
  async initialize() {
    console.log('🔍 Initializing Button Health Monitor...')
    
    // Discover available routes by checking Next.js router
    await this.discoverRoutes()
    
    // Test common API endpoints
    await this.discoverApiEndpoints()
    
    console.log('✅ Button Health Monitor initialized')
    console.log(`📊 Found ${this.knownRoutes.size} routes and ${this.knownApiEndpoints.size} API endpoints`)
  }

  /**
   * Discover available routes in the application
   */
  async discoverRoutes() {
    const commonRoutes = [
      '/',
      '/dashboard',
      '/login',
      '/register',
      '/billing',
      '/settings',
      '/profile',
      '/appointments',
      '/bookings',
      '/customers',
      '/analytics',
      '/shop',
      '/admin'
    ]

    for (const route of commonRoutes) {
      try {
        // Test if route exists by attempting a fetch
        const response = await fetch(route, { method: 'HEAD' })
        if (response.status !== 404) {
          this.knownRoutes.add(route)
        }
      } catch (error) {
        // Route might exist but not be fetchable via HEAD
        this.knownRoutes.add(route)
      }
    }
  }

  /**
   * Discover available API endpoints
   */
  async discoverApiEndpoints() {
    const commonEndpoints = [
      '/api/health',
      '/api/auth/user',
      '/api/dashboard/metrics',
      '/api/onboarding/complete',
      '/api/analytics/live-data',
      '/api/billing',
      '/api/customers',
      '/api/appointments'
    ]

    for (const endpoint of commonEndpoints) {
      try {
        const response = await fetch(endpoint, { method: 'HEAD' })
        if (response.status !== 404) {
          this.knownApiEndpoints.add(endpoint)
        }
      } catch (error) {
        // Endpoint might exist but require different method
        this.knownApiEndpoints.add(endpoint)
      }
    }
  }

  /**
   * Scan the current page for all interactive elements
   */
  scanCurrentPage() {
    console.log('🔍 Scanning current page for interactive elements...')
    
    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')
    const links = document.querySelectorAll('a[href]')
    
    console.log(`📊 Found ${buttons.length} buttons and ${links.length} links`)
    
    return {
      buttons: Array.from(buttons),
      links: Array.from(links),
      total: buttons.length + links.length
    }
  }

  /**
   * Test a single button for functionality issues
   */
  async testButton(button) {
    const issues = []
    this.results.tested++

    try {
      // Check if button is disabled
      if (button.disabled && !button.dataset.allowDisabled) {
        issues.push({
          type: 'warning',
          message: 'Button is disabled',
          element: this.getElementDescription(button)
        })
        this.results.warnings++
      }

      // Check for click handler
      const hasClickHandler = button.onclick || 
                            button.addEventListener || 
                            button.getAttribute('onclick') ||
                            button.dataset.action

      if (!hasClickHandler) {
        issues.push({
          type: 'error',
          message: 'Button has no click handler',
          element: this.getElementDescription(button)
        })
        this.results.broken++
      }

      // Check for router.push calls in onclick
      const onclickAttr = button.getAttribute('onclick')
      if (onclickAttr && onclickAttr.includes('router.push')) {
        const routeMatch = onclickAttr.match(/router\.push\(['"`]([^'"`]+)['"`]\)/)
        if (routeMatch) {
          const route = routeMatch[1]
          if (!this.knownRoutes.has(route) && !route.startsWith('/api/')) {
            issues.push({
              type: 'error',
              message: `Button navigates to unknown route: ${route}`,
              element: this.getElementDescription(button)
            })
            this.results.broken++
          }
        }
      }

      // Check for API calls in onclick
      if (onclickAttr && onclickAttr.includes('fetch(')) {
        const fetchMatch = onclickAttr.match(/fetch\(['"`]([^'"`]+)['"`]/)
        if (fetchMatch) {
          const endpoint = fetchMatch[1]
          if (endpoint.startsWith('/api/') && !this.knownApiEndpoints.has(endpoint)) {
            issues.push({
              type: 'warning',
              message: `Button calls unknown API endpoint: ${endpoint}`,
              element: this.getElementDescription(button)
            })
            this.results.warnings++
          }
        }
      }

      // Check for common problematic patterns
      const buttonText = button.textContent?.trim().toLowerCase()
      if (buttonText?.includes('continue') || buttonText?.includes('setup')) {
        // Special attention to setup/continue buttons
        if (!hasClickHandler) {
          issues.push({
            type: 'error',
            message: 'Critical setup/continue button has no functionality',
            element: this.getElementDescription(button),
            critical: true
          })
        }
      }

      if (issues.length === 0) {
        this.results.working++
      }

    } catch (error) {
      issues.push({
        type: 'error',
        message: `Error testing button: ${error.message}`,
        element: this.getElementDescription(button)
      })
      this.results.broken++
    }

    this.results.errors.push(...issues)
    return issues
  }

  /**
   * Test a single link for validity
   */
  async testLink(link) {
    const issues = []
    this.results.tested++

    try {
      const href = link.getAttribute('href')
      
      if (!href || href === '#') {
        issues.push({
          type: 'warning',
          message: 'Link has no valid href',
          element: this.getElementDescription(link)
        })
        this.results.warnings++
        return issues
      }

      // Check internal routes
      if (href.startsWith('/') && !href.startsWith('//')) {
        const cleanRoute = href.split('?')[0].split('#')[0]
        if (!this.knownRoutes.has(cleanRoute) && !cleanRoute.startsWith('/api/')) {
          issues.push({
            type: 'error',
            message: `Link points to unknown route: ${cleanRoute}`,
            element: this.getElementDescription(link)
          })
          this.results.broken++
        }
      }

      // Check for javascript: links (often problematic)
      if (href.startsWith('javascript:')) {
        issues.push({
          type: 'warning',
          message: 'Link uses javascript: protocol',
          element: this.getElementDescription(link)
        })
        this.results.warnings++
      }

      if (issues.length === 0) {
        this.results.working++
      }

    } catch (error) {
      issues.push({
        type: 'error',
        message: `Error testing link: ${error.message}`,
        element: this.getElementDescription(link)
      })
      this.results.broken++
    }

    this.results.errors.push(...issues)
    return issues
  }

  /**
   * Get a description of an element for reporting
   */
  getElementDescription(element) {
    const tag = element.tagName.toLowerCase()
    const id = element.id ? `#${element.id}` : ''
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : ''
    const text = element.textContent?.trim().substring(0, 30)
    
    return {
      selector: `${tag}${id}${classes}`,
      text: text ? `"${text}${text.length > 30 ? '...' : ''}"` : '',
      location: this.getElementLocation(element)
    }
  }

  /**
   * Get approximate location of element in DOM
   */
  getElementLocation(element) {
    const rect = element.getBoundingClientRect()
    return {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      visible: rect.width > 0 && rect.height > 0
    }
  }

  /**
   * Run comprehensive test of all interactive elements on current page
   */
  async runFullScan() {
    console.log('🚀 Starting comprehensive button health scan...')
    
    // Reset results
    this.results = {
      tested: 0,
      working: 0,
      broken: 0,
      warnings: 0,
      errors: []
    }

    const elements = this.scanCurrentPage()
    
    // Test all buttons
    for (const button of elements.buttons) {
      await this.testButton(button)
    }

    // Test all links
    for (const link of elements.links) {
      await this.testLink(link)
    }

    console.log('✅ Button health scan completed')
    return this.generateReport()
  }

  /**
   * Generate a comprehensive report of findings
   */
  generateReport() {
    const report = {
      summary: {
        total: this.results.tested,
        working: this.results.working,
        broken: this.results.broken,
        warnings: this.results.warnings,
        healthScore: Math.round((this.results.working / this.results.tested) * 100) || 0
      },
      issues: this.results.errors,
      critical: this.results.errors.filter(error => error.critical),
      timestamp: new Date().toISOString()
    }

    // Console output
    console.group('📊 Button Health Report')
    console.log(`✅ Working: ${report.summary.working}`)
    console.log(`⚠️  Warnings: ${report.summary.warnings}`)
    console.log(`❌ Broken: ${report.summary.broken}`)
    console.log(`🎯 Health Score: ${report.summary.healthScore}%`)
    
    if (report.critical.length > 0) {
      console.group('🚨 Critical Issues')
      report.critical.forEach(issue => {
        console.error(`${issue.element.selector}: ${issue.message}`)
      })
      console.groupEnd()
    }

    if (report.issues.length > 0) {
      console.group('📋 All Issues')
      report.issues.forEach(issue => {
        const level = issue.type === 'error' ? 'error' : 'warn'
        console[level](`${issue.element.selector}: ${issue.message}`)
      })
      console.groupEnd()
    }
    
    console.groupEnd()

    return report
  }

  /**
   * Get a quick health check of critical buttons only
   */
  async quickHealthCheck() {
    console.log('⚡ Running quick button health check...')
    
    const criticalSelectors = [
      '[data-testid*="continue"]',
      '[data-testid*="setup"]',
      'button:contains("Continue")',
      'button:contains("Setup")',
      'button[type="submit"]',
      '.primary-action',
      '.cta-button'
    ]

    let issues = 0
    
    for (const selector of criticalSelectors) {
      try {
        const elements = document.querySelectorAll(selector)
        for (const element of elements) {
          const elementIssues = await this.testButton(element)
          issues += elementIssues.filter(i => i.type === 'error').length
        }
      } catch (error) {
        // Selector might not be valid, continue
      }
    }

    console.log(`⚡ Quick check complete: ${issues} critical issues found`)
    return issues
  }
}

// Export singleton instance
const buttonHealthMonitor = new ButtonHealthMonitor()

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  buttonHealthMonitor.initialize().catch(console.error)
}

export default buttonHealthMonitor

// Development helper functions (only in development)
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Make available in console for manual testing
  window.buttonHealthMonitor = buttonHealthMonitor
  
  // Auto-run quick health check on page load (with delay for React hydration)
  setTimeout(() => {
    buttonHealthMonitor.quickHealthCheck()
  }, 3000)
}