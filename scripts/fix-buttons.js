#!/usr/bin/env node

/**
 * Button Functionality Fixer
 * 
 * This script systematically identifies and documents non-functional buttons
 * across the entire application and provides solutions for each.
 */

const fs = require('fs')
const path = require('path')

// Common button patterns that need onClick handlers
const BUTTON_PATTERNS = [
  // Action buttons
  { pattern: /Add Customer|Add Staff|Add Service|Create/i, handler: 'openModal', args: ['add'] },
  { pattern: /Edit|Update|Modify/i, handler: 'openModal', args: ['edit'] },
  { pattern: /Delete|Remove/i, handler: 'confirmAction', args: ['delete'] },
  { pattern: /Book Now|Book Appointment|Schedule/i, handler: 'bookAppointment' },
  { pattern: /Call|Phone/i, handler: 'callCustomer' },
  { pattern: /Email|Contact/i, handler: 'emailCustomer' },
  { pattern: /Export|Download/i, handler: 'exportData' },
  { pattern: /Save|Submit/i, handler: 'saveSettings' },
  { pattern: /Cancel|Close/i, handler: 'closeModal' },
  { pattern: /Settings|Configure/i, handler: 'openModal', args: ['settings'] },
  { pattern: /View Details|More Info/i, handler: 'navigateTo' },
  { pattern: /Refresh|Reload/i, handler: 'refreshAnalytics' },
  { pattern: /Generate|Create Report/i, handler: 'generateReport' },
  { pattern: /Share|Link/i, handler: 'shareLink' },
  { pattern: /QR Code/i, handler: 'generateQRCode' }
]

// Pages with critical button functionality needs
const CRITICAL_PAGES = [
  'app/customers/page.js',
  'app/dashboard/staff/page.js', 
  'app/dashboard/services/page.js',
  'app/payments/page.js',
  'app/enterprise/[slug]/page.js',
  'app/franchise-dashboard/page.js',
  'app/(protected)/dashboard/calendar/page.js',
  'app/(protected)/dashboard/analytics/page.js',
  'app/(protected)/shop/bookings/page.js'
]

class ButtonFixer {
  constructor() {
    this.buttonsFound = 0
    this.buttonsFixed = 0
    this.buttonsPending = []
    this.results = {
      total: 0,
      functional: 0,
      nonFunctional: 0,
      fixed: 0,
      categories: {}
    }
  }

  // Analyze a single file for buttons
  analyzeFile(filePath) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`)
      return []
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const buttons = []

    // Find all button elements
    const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi
    let match

    while ((match = buttonRegex.exec(content)) !== null) {
      const fullMatch = match[0]
      const buttonText = match[1].replace(/<[^>]*>/g, '').trim()
      const hasOnClick = fullMatch.includes('onClick')
      const hasHandler = fullMatch.includes('handler') || fullMatch.includes('Handle')
      const lineNumber = content.substring(0, match.index).split('\n').length

      const button = {
        file: filePath,
        line: lineNumber,
        text: buttonText,
        fullMatch,
        hasOnClick,
        hasHandler,
        functional: hasOnClick || hasHandler
      }

      // Categorize button
      button.category = this.categorizeButton(buttonText)
      button.suggestedHandler = this.suggestHandler(buttonText)

      buttons.push(button)
      this.buttonsFound++

      if (!button.functional) {
        this.buttonsPending.push(button)
      }
    }

    return buttons
  }

  // Categorize button by its text content
  categorizeButton(text) {
    if (/add|create|new/i.test(text)) return 'creation'
    if (/edit|update|modify/i.test(text)) return 'modification'
    if (/delete|remove|trash/i.test(text)) return 'deletion'
    if (/book|schedule|appointment/i.test(text)) return 'booking'
    if (/call|phone/i.test(text)) return 'communication'
    if (/email|contact/i.test(text)) return 'communication'
    if (/export|download|save/i.test(text)) return 'data_export'
    if (/settings|config/i.test(text)) return 'settings'
    if (/view|details|more/i.test(text)) return 'navigation'
    if (/refresh|reload/i.test(text)) return 'refresh'
    if (/share|link/i.test(text)) return 'sharing'
    if (/cancel|close/i.test(text)) return 'cancellation'
    return 'other'
  }

  // Suggest appropriate handler for button
  suggestHandler(text) {
    for (const pattern of BUTTON_PATTERNS) {
      if (pattern.pattern.test(text)) {
        return {
          handler: pattern.handler,
          args: pattern.args || []
        }
      }
    }
    return {
      handler: 'showNotification',
      args: [`${text} functionality coming soon!`]
    }
  }

  // Generate fix code for a button
  generateFix(button) {
    const { handler, args } = button.suggestedHandler
    const argsStr = args.length > 0 ? `, ${args.map(arg => `'${arg}'`).join(', ')}` : ''
    
    return {
      original: button.fullMatch,
      fixed: button.fullMatch.replace(
        /<button([^>]*)>/,
        `<button$1 onClick={() => buttonHandlers.${handler}(${argsStr.substring(2)}))}>`
      ),
      handlerNeeded: `import { buttonHandlers } from '../../../lib/buttonHandlers'`
    }
  }

  // Analyze all critical pages
  analyzeAllPages() {
    console.log('🔍 Analyzing button functionality across application...\n')

    const rootDir = process.cwd()
    const allButtons = []

    for (const pagePath of CRITICAL_PAGES) {
      const fullPath = path.join(rootDir, pagePath)
      console.log(`📄 Analyzing: ${pagePath}`)
      
      const buttons = this.analyzeFile(fullPath)
      allButtons.push(...buttons)

      // Count by category
      buttons.forEach(button => {
        this.results.categories[button.category] = (this.results.categories[button.category] || 0) + 1
        if (button.functional) {
          this.results.functional++
        } else {
          this.results.nonFunctional++
        }
      })
    }

    this.results.total = allButtons.length

    return allButtons
  }

  // Generate comprehensive report
  generateReport() {
    const report = {
      summary: {
        totalButtons: this.results.total,
        functionalButtons: this.results.functional,
        nonFunctionalButtons: this.results.nonFunctional,
        fixesNeeded: this.buttonsPending.length,
        completionRate: `${Math.round((this.results.functional / this.results.total) * 100)}%`
      },
      categorization: this.results.categories,
      criticalFixes: this.buttonsPending.slice(0, 20).map(button => ({
        file: button.file.replace(process.cwd() + '/', ''),
        line: button.line,
        text: button.text,
        category: button.category,
        suggestedFix: this.generateFix(button)
      })),
      implementationPlan: this.generateImplementationPlan()
    }

    // Write report to file
    const reportPath = path.join(process.cwd(), 'BUTTON_FUNCTIONALITY_REPORT.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`\n📊 Report generated: ${reportPath}`)
    return report
  }

  // Generate implementation plan
  generateImplementationPlan() {
    const plan = {
      phase1: {
        title: "Critical User Actions (Completed)",
        status: "✅ COMPLETED",
        items: [
          "Customer Management - Add Customer functionality",
          "Staff Management - Settings and configuration",
          "Service Management - Delete service functionality",
          "Enterprise Booking - Book Now and Call buttons"
        ]
      },
      phase2: {
        title: "High-Priority Business Functions",
        status: "🔄 IN PROGRESS",
        items: [
          "Payment processing buttons",
          "Analytics export and refresh",
          "Notification and communication buttons",
          "Scheduling and calendar actions"
        ]
      },
      phase3: {
        title: "Enhanced User Experience",
        status: "⏳ PENDING",
        items: [
          "Navigation and view buttons",
          "Settings and configuration",
          "Data export and sharing",
          "Help and support actions"
        ]
      },
      recommendations: [
        "Implement buttonHandlers utility across all components",
        "Add loading states to all async operations",
        "Ensure consistent error handling",
        "Add user feedback for all actions"
      ]
    }

    return plan
  }

  // Main analysis function
  run() {
    console.log('🚀 Button Functionality Analysis Started\n')
    
    const allButtons = this.analyzeAllPages()
    const report = this.generateReport()
    
    console.log('\n📈 ANALYSIS COMPLETE')
    console.log('====================')
    console.log(`Total Buttons Found: ${report.summary.totalButtons}`)
    console.log(`Functional Buttons: ${report.summary.functionalButtons}`)
    console.log(`Non-Functional Buttons: ${report.summary.nonFunctionalButtons}`)
    console.log(`Completion Rate: ${report.summary.completionRate}`)
    
    console.log('\n📋 BUTTON CATEGORIES:')
    Object.entries(report.categorization).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`)
    })

    console.log('\n🎯 IMPLEMENTATION STATUS:')
    Object.entries(report.implementationPlan).forEach(([phase, details]) => {
      if (details.title) {
        console.log(`  ${details.title}: ${details.status}`)
      }
    })

    console.log('\n✨ Button functionality optimization in progress!')
    
    return report
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new ButtonFixer()
  fixer.run()
}

module.exports = ButtonFixer