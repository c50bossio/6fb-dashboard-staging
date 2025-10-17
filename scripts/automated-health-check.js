#!/usr/bin/env node

/**
 * Automated Health Check Script for Profile Synchronization
 * 
 * This script runs periodic health checks on profile consistency,
 * automatically fixes minor issues, and alerts on major problems.
 * 
 * Usage:
 *   node scripts/automated-health-check.js --interval 300  # Run every 5 minutes
 *   node scripts/automated-health-check.js --once         # Run once and exit
 *   node scripts/automated-health-check.js --dry-run      # Check only, no fixes
 */

import { createClient } from '@supabase/supabase-js'
import { 
  getProfileSyncStatus, 
  syncAllProfiles, 
  fixUserByEmail 
} from '../lib/profile-sync-service.js'
import fs from 'fs/promises'
import path from 'path'

// Configuration
const CONFIG = {
  // Health thresholds
  CRITICAL_HEALTH_THRESHOLD: 80, // Below this triggers alerts
  WARNING_HEALTH_THRESHOLD: 90,  // Below this triggers warnings
  
  // Batch processing
  MAX_AUTO_FIX_COUNT: 10,        // Max profiles to auto-fix per run
  
  // Logging
  LOG_DIR: './logs/health-checks',
  MAX_LOG_FILES: 30,
  
  // Intervals (in seconds)
  DEFAULT_INTERVAL: 300,         // 5 minutes
  QUICK_CHECK_INTERVAL: 60,      // 1 minute for critical issues
  
  // Notification settings
  SLACK_WEBHOOK: process.env.SLACK_HEALTH_WEBHOOK,
  ALERT_COOLDOWN: 1800,         // 30 minutes between duplicate alerts
}

class HealthCheckManager {
  constructor() {
    this.lastAlerts = new Map()
    this.logDir = path.resolve(CONFIG.LOG_DIR)
    this.isRunning = false
  }

  async init() {
    // Ensure log directory exists
    try {
      await fs.mkdir(this.logDir, { recursive: true })
    } catch (error) {
      console.warn('Failed to create log directory:', error.message)
    }
  }

  async log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      message,
      data,
      pid: process.pid
    }

    // Console output
    }: ${message}`)
    if (data) {
      )
    }

    // File logging
    try {
      const logFile = path.join(this.logDir, `health-check-${new Date().toISOString().split('T')[0]}.log`)
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n')
    } catch (error) {
      console.warn('Failed to write log file:', error.message)
    }
  }

  async runHealthCheck(options = {}) {
    const { dryRun = false, autoFix = true } = options
    
    this.log('info', 'Starting health check', { dryRun, autoFix })

    try {
      // Get current health status
      const healthResult = await getProfileSyncStatus()
      
      if (!healthResult.success) {
        this.log('error', 'Failed to get health status', { error: healthResult.error })
        return { success: false, error: healthResult.error }
      }

      const { status, healthScore } = healthResult
      
      this.log('info', 'Health check results', {
        healthScore,
        total: status.total,
        consistent: status.consistent,
        inconsistent: status.inconsistent
      })

      // Determine severity level
      let severity = 'healthy'
      if (healthScore < CONFIG.CRITICAL_HEALTH_THRESHOLD) {
        severity = 'critical'
      } else if (healthScore < CONFIG.WARNING_HEALTH_THRESHOLD) {
        severity = 'warning'
      }

      const result = {
        success: true,
        healthScore,
        severity,
        status,
        timestamp: new Date().toISOString(),
        actions: []
      }

      // Auto-fix if enabled and not dry run
      if (autoFix && !dryRun && status.inconsistent > 0) {
        const fixCount = Math.min(status.inconsistent, CONFIG.MAX_AUTO_FIX_COUNT)
        
        this.log('info', `Attempting to auto-fix ${fixCount} inconsistent profiles`)

        const syncResult = await syncAllProfiles({
          dryRun: false,
          batchSize: fixCount
        })

        if (syncResult.success) {
          result.actions.push({
            type: 'auto_fix',
            count: syncResult.results?.synced || 0,
            errors: syncResult.results?.errors || 0
          })
          
          this.log('info', 'Auto-fix completed', {
            synced: syncResult.results?.synced,
            errors: syncResult.results?.errors
          })
        } else {
          this.log('error', 'Auto-fix failed', { error: syncResult.error })
          result.actions.push({
            type: 'auto_fix_failed',
            error: syncResult.error
          })
        }
      }

      // Send alerts if needed
      await this.checkAndSendAlerts(severity, result)

      // Clean up old log files
      await this.cleanupLogs()

      return result

    } catch (error) {
      this.log('error', 'Health check failed', { error: error.message, stack: error.stack })
      return { success: false, error: error.message }
    }
  }

  async checkAndSendAlerts(severity, healthData) {
    if (severity === 'healthy') {
      return // No alerts needed
    }

    const alertKey = `${severity}_${healthData.healthScore}`
    const lastAlert = this.lastAlerts.get(alertKey)
    const now = Date.now()

    // Check cooldown period
    if (lastAlert && (now - lastAlert) < CONFIG.ALERT_COOLDOWN * 1000) {
      this.log('debug', 'Alert cooldown active, skipping duplicate alert')
      return
    }

    // Send alert
    await this.sendAlert(severity, healthData)
    this.lastAlerts.set(alertKey, now)
  }

  async sendAlert(severity, healthData) {
    const message = this.formatAlertMessage(severity, healthData)
    
    this.log('alert', message, healthData)

    // Send to Slack if configured
    if (CONFIG.SLACK_WEBHOOK) {
      try {
        const slackPayload = {
          text: `Profile Health Alert - ${severity.toUpperCase()}`,
          attachments: [{
            color: severity === 'critical' ? 'danger' : 'warning',
            fields: [
              { title: 'Health Score', value: `${healthData.healthScore}%`, short: true },
              { title: 'Inconsistent Profiles', value: healthData.status.inconsistent.toString(), short: true },
              { title: 'Total Profiles', value: healthData.status.total.toString(), short: true },
              { title: 'Timestamp', value: healthData.timestamp, short: true }
            ]
          }]
        }

        const response = await fetch(CONFIG.SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        })

        if (!response.ok) {
          throw new Error(`Slack webhook failed: ${response.statusText}`)
        }

        this.log('info', 'Alert sent to Slack successfully')
      } catch (error) {
        this.log('error', 'Failed to send Slack alert', { error: error.message })
      }
    }
  }

  formatAlertMessage(severity, healthData) {
    const { healthScore, status } = healthData
    
    return `Profile Health ${severity.toUpperCase()}: Health score is ${healthScore}% ` +
           `(${status.inconsistent}/${status.total} profiles inconsistent). ` +
           `Automatic remediation ${healthData.actions.length > 0 ? 'attempted' : 'recommended'}.`
  }

  async cleanupLogs() {
    try {
      const files = await fs.readdir(this.logDir)
      const logFiles = files
        .filter(file => file.startsWith('health-check-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.logDir, file),
          stat: null
        }))

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path)
        } catch (error) {
          // Skip files that can't be accessed
        }
      }

      // Sort by modification time (newest first)
      logFiles
        .filter(file => file.stat)
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .slice(CONFIG.MAX_LOG_FILES) // Keep only the newest files
        .forEach(async (file) => {
          try {
            await fs.unlink(file.path)
            this.log('debug', `Cleaned up old log file: ${file.name}`)
          } catch (error) {
            this.log('warn', `Failed to delete log file ${file.name}:`, error.message)
          }
        })

    } catch (error) {
      this.log('warn', 'Log cleanup failed', { error: error.message })
    }
  }

  async startContinuous(interval = CONFIG.DEFAULT_INTERVAL) {
    if (this.isRunning) {
      this.log('warn', 'Health check is already running')
      return
    }

    this.isRunning = true
    this.log('info', `Starting continuous health monitoring every ${interval} seconds`)

    const runCheck = async () => {
      if (!this.isRunning) return

      const result = await this.runHealthCheck({ autoFix: true })
      
      // Adjust interval based on health status
      let nextInterval = interval
      if (result.severity === 'critical') {
        nextInterval = CONFIG.QUICK_CHECK_INTERVAL
        this.log('info', `Critical health detected, increasing check frequency to ${nextInterval}s`)
      }

      // Schedule next check
      setTimeout(runCheck, nextInterval * 1000)
    }

    // Start immediately
    runCheck()

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log('info', 'Received SIGINT, stopping health checks')
      this.isRunning = false
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      this.log('info', 'Received SIGTERM, stopping health checks')
      this.isRunning = false
      process.exit(0)
    })
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const options = {
    once: args.includes('--once'),
    dryRun: args.includes('--dry-run'),
    interval: parseInt(args.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || CONFIG.DEFAULT_INTERVAL
  }

  const healthCheck = new HealthCheckManager()
  await healthCheck.init()

  if (options.once) {
    // Run once and exit
    const result = await healthCheck.runHealthCheck({
      dryRun: options.dryRun,
      autoFix: !options.dryRun
    })

    )
    
    process.exit(result.success ? 0 : 1)
  } else {
    // Run continuously
    await healthCheck.startContinuous(options.interval)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Health check failed:', error)
    process.exit(1)
  })
}

export { HealthCheckManager }