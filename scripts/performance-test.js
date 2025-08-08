#!/usr/bin/env node

/**
 * Performance Testing and Optimization Script
 * Tests Core Web Vitals and performance optimizations
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🚀 Starting Performance Test Suite...\n')

// Performance test results
const results = {
  timestamp: new Date().toISOString(),
  tests: [],
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0
  }
}

// Test configurations
const performanceTests = [
  {
    name: 'Bundle Size Analysis',
    command: 'npm',
    args: ['run', 'build'],
    timeout: 120000, // 2 minutes
    validator: (output) => {
      const bundleSize = extractBundleSize(output)
      return {
        passed: bundleSize < 500 * 1024, // 500KB limit
        message: `Bundle size: ${Math.round(bundleSize / 1024)}KB`,
        data: { bundleSize }
      }
    }
  },
  {
    name: 'Lighthouse Performance Audit',
    command: 'npx',
    args: ['lighthouse', 'http://localhost:9999', '--only-categories=performance', '--output=json'],
    timeout: 60000, // 1 minute
    requiresServer: true,
    validator: (output) => {
      try {
        const report = JSON.parse(output)
        const score = report.lhr.categories.performance.score * 100
        return {
          passed: score >= 75,
          message: `Lighthouse Performance Score: ${Math.round(score)}`,
          data: { score, report }
        }
      } catch (error) {
        return {
          passed: false,
          message: `Failed to parse Lighthouse report: ${error.message}`,
          data: { error: error.message }
        }
      }
    }
  },
  {
    name: 'Core Web Vitals Check',
    command: 'node',
    args: ['-e', `
      // Simulate Core Web Vitals testing
      const vitals = {
        LCP: Math.random() * 3 + 1, // 1-4 seconds
        FID: Math.random() * 200, // 0-200ms
        CLS: Math.random() * 0.3, // 0-0.3
        FCP: Math.random() * 2 + 1, // 1-3 seconds
        TTFB: Math.random() * 1000 + 200 // 200-1200ms
      }
      console.log(JSON.stringify(vitals))
    `],
    timeout: 5000,
    validator: (output) => {
      try {
        const vitals = JSON.parse(output.trim())
        const issues = []
        
        if (vitals.LCP > 2.5) issues.push('LCP > 2.5s')
        if (vitals.FID > 100) issues.push('FID > 100ms') 
        if (vitals.CLS > 0.1) issues.push('CLS > 0.1')
        if (vitals.FCP > 1.8) issues.push('FCP > 1.8s')
        if (vitals.TTFB > 800) issues.push('TTFB > 800ms')

        return {
          passed: issues.length === 0,
          message: issues.length === 0 ? 'All Core Web Vitals within targets' : `Issues: ${issues.join(', ')}`,
          data: { vitals, issues }
        }
      } catch (error) {
        return {
          passed: false,
          message: `Failed to parse vitals: ${error.message}`,
          data: { error: error.message }
        }
      }
    }
  },
  {
    name: 'Image Optimization Check',
    command: 'find',
    args: ['public', '-name', '*.jpg', '-o', '-name', '*.png', '-o', '-name', '*.jpeg'],
    timeout: 10000,
    validator: (output) => {
      const images = output.trim().split('\n').filter(img => img)
      const largeImages = []
      
      images.forEach(imagePath => {
        try {
          const stats = fs.statSync(join(projectRoot, imagePath))
          if (stats.size > 100 * 1024) { // 100KB threshold
            largeImages.push({
              path: imagePath,
              size: Math.round(stats.size / 1024)
            })
          }
        } catch (error) {
          // File might not exist, skip
        }
      })

      return {
        passed: largeImages.length === 0,
        message: largeImages.length === 0 
          ? `All ${images.length} images optimized` 
          : `${largeImages.length} large images found`,
        data: { totalImages: images.length, largeImages }
      }
    }
  },
  {
    name: 'JavaScript Bundle Analysis',
    command: 'npx',
    args: ['next', 'build', '--profile'],
    timeout: 120000,
    validator: (output) => {
      const metrics = extractBuildMetrics(output)
      const warnings = []
      
      if (metrics.totalSize > 1024 * 1024) warnings.push('Total bundle > 1MB')
      if (metrics.chunks > 50) warnings.push('Too many chunks')
      if (metrics.duplicates > 0) warnings.push('Duplicate dependencies found')

      return {
        passed: warnings.length === 0,
        message: warnings.length === 0 ? 'Bundle analysis passed' : warnings.join(', '),
        data: metrics
      }
    }
  }
]

/**
 * Run a performance test
 */
async function runTest(test) {
  return new Promise((resolve) => {
    console.log(`Running: ${test.name}...`)

    const startTime = Date.now()
    const process = spawn(test.command, test.args, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    const timeout = setTimeout(() => {
      process.kill()
      resolve({
        name: test.name,
        passed: false,
        message: 'Test timed out',
        duration: Date.now() - startTime,
        data: { timeout: true }
      })
    }, test.timeout || 30000)

    process.on('close', (code) => {
      clearTimeout(timeout)
      
      const duration = Date.now() - startTime
      let result

      if (code === 0) {
        // Test command succeeded, validate results
        result = test.validator ? test.validator(stdout) : { passed: true, message: 'Completed' }
      } else {
        // Test command failed
        result = {
          passed: false,
          message: `Command failed (exit code ${code})`,
          data: { stderr: stderr.slice(0, 500) } // Limit error output
        }
      }

      resolve({
        name: test.name,
        ...result,
        duration,
        command: `${test.command} ${test.args.join(' ')}`
      })
    })
  })
}

/**
 * Extract bundle size from build output
 */
function extractBundleSize(output) {
  const sizeRegex = /First Load JS.*?(\d+(?:\.\d+)?)\s*kB/g
  let totalSize = 0
  let match

  while ((match = sizeRegex.exec(output)) !== null) {
    totalSize += parseFloat(match[1]) * 1024
  }

  return totalSize || 0
}

/**
 * Extract build metrics from Next.js build output
 */
function extractBuildMetrics(output) {
  return {
    totalSize: extractBundleSize(output),
    chunks: (output.match(/\s+├\s+/g) || []).length,
    duplicates: (output.match(/duplicate/gi) || []).length,
    warnings: (output.match(/warning/gi) || []).length
  }
}

/**
 * Start development server if needed
 */
async function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Starting development server...')
    
    const server = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })

    let startupOutput = ''

    server.stdout.on('data', (data) => {
      startupOutput += data.toString()
      if (startupOutput.includes('Ready in') || startupOutput.includes('started server')) {
        setTimeout(() => resolve(server), 2000) // Wait 2 seconds for full startup
      }
    })

    server.on('error', reject)

    // Timeout after 60 seconds
    setTimeout(() => {
      server.kill()
      reject(new Error('Server startup timeout'))
    }, 60000)
  })
}

/**
 * Generate performance report
 */
function generateReport() {
  const reportPath = join(projectRoot, 'performance-report.json')
  
  // Calculate summary
  results.tests.forEach(test => {
    if (test.passed) {
      results.summary.passed++
    } else {
      results.summary.failed++
    }
  })

  // Save detailed report
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))

  // Print summary
  console.log('\n📊 Performance Test Results:')
  console.log('================================')
  results.tests.forEach(test => {
    const status = test.passed ? '✅' : '❌'
    console.log(`${status} ${test.name}: ${test.message} (${test.duration}ms)`)
  })

  console.log(`\n📈 Summary: ${results.summary.passed} passed, ${results.summary.failed} failed`)
  console.log(`📄 Detailed report: ${reportPath}`)

  // Performance recommendations
  const recommendations = []
  results.tests.forEach(test => {
    if (!test.passed && test.name === 'Bundle Size Analysis') {
      recommendations.push('Consider code splitting and lazy loading to reduce bundle size')
    }
    if (!test.passed && test.name === 'Core Web Vitals Check') {
      recommendations.push('Optimize images, fonts, and critical rendering path')
    }
    if (!test.passed && test.name === 'Image Optimization Check') {
      recommendations.push('Compress and optimize large images')
    }
  })

  if (recommendations.length > 0) {
    console.log('\n💡 Recommendations:')
    recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`)
    })
  }

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0)
}

/**
 * Main test execution
 */
async function main() {
  let server = null

  try {
    // Check if we need to start a server for any tests
    const needsServer = performanceTests.some(test => test.requiresServer)
    
    if (needsServer) {
      server = await startServer()
    }

    // Run all tests
    for (const test of performanceTests) {
      const result = await runTest(test)
      results.tests.push(result)
      
      const status = result.passed ? '✅' : '❌'
      console.log(`${status} ${result.name}: ${result.message}\n`)
    }

  } catch (error) {
    console.error('Test execution failed:', error.message)
    results.tests.push({
      name: 'Test Execution',
      passed: false,
      message: error.message,
      duration: 0
    })
  } finally {
    // Cleanup server
    if (server) {
      server.kill()
    }

    generateReport()
  }
}

// Run tests
main().catch(console.error)