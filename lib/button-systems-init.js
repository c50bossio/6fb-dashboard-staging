'use client'

/**
 * Button Systems Integration & Initialization
 * Orchestrates all button-related systems for the application
 */

import buttonHealthMonitor from './button-health-monitor'
import universalButtonHandler from './universal-button-handler'

class ButtonSystemsManager {
  constructor() {
    this.initialized = false
    this.config = {
      autoEnhance: process.env.NODE_ENV === 'development',
      healthCheckInterval: 30000, // 30 seconds in development
      enableRealTimeMonitoring: process.env.NODE_ENV === 'development',
      enableConsoleReports: process.env.NODE_ENV === 'development'
    }
    this.monitoringInterval = null
  }

  /**
   * Initialize all button systems
   */
  async initialize(customConfig = {}) {
    if (this.initialized) {
      
      return
    }

    this.config = { ...this.config, ...customConfig }

    try {
      // Initialize health monitor
      await buttonHealthMonitor.initialize()
      
      // Auto-enhance buttons if enabled
      if (this.config.autoEnhance) {
        universalButtonHandler.autoEnhanceButtons()
      }
      
      // Set up real-time monitoring if enabled
      if (this.config.enableRealTimeMonitoring) {
        this.startRealTimeMonitoring()
      }
      
      // Run initial health check
      await this.runInitialHealthCheck()
      
      // Set up DOM mutation observer for new buttons
      this.setupMutationObserver()
      
      this.initialized = true

    } catch (error) {
      console.error('❌ Failed to initialize Button Systems Manager:', error)
    }
  }

  /**
   * Run initial health check and report findings
   */
  async runInitialHealthCheck() {

    try {
      const healthReport = await buttonHealthMonitor.runFullScan()
      
      if (this.config.enableConsoleReports) {
        this.displayHealthReport(healthReport)
      }
      
      // Fix critical issues automatically if possible
      if (healthReport.critical.length > 0) {
        
        await this.autoFixCriticalIssues(healthReport.critical)
      }
      
      return healthReport
    } catch (error) {
      console.error('❌ Initial health check failed:', error)
    }
  }

  /**
   * Display formatted health report in console
   */
  displayHealthReport(report) {
    const { summary } = report
    
    console.group('📊 Button Health Report')

    if (report.critical.length > 0) {
      console.group('🚨 Critical Issues (Auto-fixing)')
      report.critical.forEach((issue, index) => {
        console.error(`${index + 1}. ${issue.element.selector}: ${issue.message}`)
      })
      console.groupEnd()
    }
    
    if (report.issues.length > report.critical.length) {
      console.group('📋 Other Issues')
      report.issues
        .filter(issue => !issue.critical)
        .slice(0, 5) // Show first 5 non-critical issues
        .forEach((issue, index) => {
          console.warn(`${index + 1}. ${issue.element.selector}: ${issue.message}`)
        })
      
      if (report.issues.length > 5) {
        
      }
      console.groupEnd()
    }
    
    console.groupEnd()
  }

  /**
   * Attempt to automatically fix critical button issues
   */
  async autoFixCriticalIssues(criticalIssues) {
    for (const issue of criticalIssues) {
      try {
        const element = document.querySelector(issue.element.selector)
        if (!element) continue

        if (issue.message.includes('no click handler')) {
          // Add universal button handler for buttons without click handlers
          universalButtonHandler.enhanceButton(element, () => {
            }`)
            
            // Try to determine what this button should do based on text content
            const text = element.textContent?.toLowerCase().trim()
            
            if (text?.includes('continue') || text?.includes('setup')) {
              // This is likely a setup/onboarding button
              window.dispatchEvent(new CustomEvent('launchOnboarding', {
                detail: { from: 'auto_fix', source: 'button_systems_manager' },
                bubbles: true
              }))
            } else if (text?.includes('save')) {
              // This is likely a save button - try to find and submit nearest form
              const form = element.closest('form')
              if (form) {
                form.dispatchEvent(new Event('submit'))
              }
            } else if (text?.includes('back')) {
              // This is likely a back button
              window.history.back()
            } else {
              // Generic fallback
              
              alert(`Button "${element.textContent?.trim()}" was clicked but had no handler. This has been logged for fixing.`)
            }
          }, {
            errorText: 'Auto-enhanced button',
            fallbackAction: () => {
              
            }
          })

        }
        
      } catch (error) {
        console.error(`❌ Failed to auto-fix issue: ${issue.message}`, error)
      }
    }
  }

  /**
   * Set up mutation observer to monitor for new buttons
   */
  setupMutationObserver() {
    if (typeof window === 'undefined' || !window.MutationObserver) return

    const observer = new MutationObserver((mutations) => {
      let hasNewButtons = false
      
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if the added node is a button or contains buttons
            const isButton = node.matches && (
              node.matches('button') || 
              node.matches('[role="button"]') ||
              node.matches('input[type="button"]') ||
              node.matches('input[type="submit"]')
            )
            
            const hasButtons = node.querySelectorAll && 
              node.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]').length > 0
            
            if (isButton || hasButtons) {
              hasNewButtons = true
            }
          }
        })
      })
      
      if (hasNewButtons && this.config.autoEnhance) {
        
        setTimeout(() => {
          universalButtonHandler.autoEnhanceButtons()
        }, 100) // Small delay to allow React to finish rendering
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

  }

  /**
   * Start real-time monitoring of button health
   */
  startRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        const issues = await buttonHealthMonitor.quickHealthCheck()
        if (issues > 0 && this.config.enableConsoleReports) {
          
        }
      } catch (error) {
        console.error('❌ Real-time monitoring error:', error)
      }
    }, this.config.healthCheckInterval)

  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
      
    }
  }

  /**
   * Get current system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      config: this.config,
      monitoringActive: !!this.monitoringInterval,
      enhancedButtons: document.querySelectorAll('[data-enhanced="true"]').length
    }
  }

  /**
   * Manual health check trigger
   */
  async runHealthCheck() {
    
    const report = await buttonHealthMonitor.runFullScan()
    
    if (this.config.enableConsoleReports) {
      this.displayHealthReport(report)
    }
    
    return report
  }

  /**
   * Emergency fix for all buttons on page
   */
  emergencyFixAllButtons() {

    const buttons = document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]')
    let fixed = 0
    
    buttons.forEach(button => {
      if (!button.onclick && !button.getAttribute('onclick') && !button.dataset.enhanced) {
        universalButtonHandler.enhanceButton(button, () => {
          }`)
        }, {
          errorText: 'Emergency enhanced',
          showToast: false
        })
        fixed++
      }
    })

    return fixed
  }
}

// Create singleton instance
const buttonSystemsManager = new ButtonSystemsManager()

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      buttonSystemsManager.initialize()
    })
  } else {
    // DOM is already ready
    setTimeout(() => {
      buttonSystemsManager.initialize()
    }, 1000) // Give React time to hydrate
  }

  // Make available for manual access in development
  if (process.env.NODE_ENV === 'development') {
    window.buttonSystemsManager = buttonSystemsManager
  }
}

export default buttonSystemsManager

/**
 * Quick setup function for easy integration
 */
export const initializeButtonSystems = (config = {}) => {
  return buttonSystemsManager.initialize(config)
}

/**
 * Emergency function to fix broken buttons
 */
export const emergencyButtonFix = () => {
  return buttonSystemsManager.emergencyFixAllButtons()
}

/**
 * Get button health report
 */
export const getButtonHealthReport = () => {
  return buttonSystemsManager.runHealthCheck()
}