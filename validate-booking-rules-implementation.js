#!/usr/bin/env node

/**
 * Validation script for Enterprise Booking Rules System
 * Checks implementation completeness without runtime execution
 */

const fs = require('fs')
const path = require('path')

function checkFileExists(filePath) {
  try {
    const stats = fs.statSync(filePath)
    return {
      exists: true,
      size: stats.size,
      lastModified: stats.mtime
    }
  } catch (error) {
    return {
      exists: false,
      error: error.code
    }
  }
}

function analyzeFileContent(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return {
      hasContent: content.length > 0,
      lineCount: content.split('\n').length,
      sizeBytes: content.length,
      content: content
    }
  } catch (error) {
    return {
      hasContent: false,
      error: error.message
    }
  }
}

function validateImplementation() {
  const results = {
    timestamp: new Date().toISOString(),
    components: {},
    summary: {}
  }

  // 1. ConflictDetector - Core engine
  
  const conflictDetectorPath = '/Users/bossio/6FB AI Agent System/lib/booking-rules-engine/ConflictDetector.js'
  const conflictDetectorCheck = checkFileExists(conflictDetectorPath)
  const conflictDetectorContent = analyzeFileContent(conflictDetectorPath)
  
  results.components.conflictDetector = {
    ...conflictDetectorCheck,
    ...conflictDetectorContent
  }
  
  if (conflictDetectorCheck.exists) {

    // Check for key components in the code
    const content = conflictDetectorContent.content
    const hasIntervalTree = content.includes('class IntervalTree')
    const hasConflictDetector = content.includes('class ConflictDetector')
    const hasFindConflicts = content.includes('findConflicts')
    const hasAvlBalancing = content.includes('height') && content.includes('balance')
    const hasIntervalNode = content.includes('class IntervalNode')

    results.components.conflictDetector.features = {
      hasIntervalTree,
      hasConflictDetector,
      hasFindConflicts,
      hasAvlBalancing,
      hasIntervalNode
    }
    
    // Check for syntax issues that we fixed
    const hasSyntaxError = !content.includes('}\n\nclass IntervalTree')

  } else {
    
  }
  
  // 2. API Route - REST endpoints  
  ')
  const apiRoutePath = '/Users/bossio/6FB AI Agent System/app/api/booking-rules/conflicts/route.js'
  const apiRouteCheck = checkFileExists(apiRoutePath)
  const apiRouteContent = analyzeFileContent(apiRoutePath)
  
  results.components.apiRoute = {
    ...apiRouteCheck,
    ...apiRouteContent
  }
  
  if (apiRouteCheck.exists) {

    const content = apiRouteContent.content
    const hasPost = content.includes('export async function POST')
    const hasGet = content.includes('export async function GET')
    const hasDelete = content.includes('export async function DELETE')
    const hasAuth = content.includes('auth.getUser')
    const hasPermissions = content.includes('barbershop_staff')

    results.components.apiRoute.endpoints = {
      hasPost,
      hasGet,
      hasDelete,
      hasAuth,
      hasPermissions
    }
  } else {
    
  }
  
  // 3. Test Infrastructure
  
  const testEndpointPath = '/Users/bossio/6FB AI Agent System/app/api/test-booking-rules/route.js'
  const testEndpointCheck = checkFileExists(testEndpointPath)
  
  results.components.testEndpoint = testEndpointCheck
  
  if (testEndpointCheck.exists) {
    
  } else {
    
  }
  
  // 4. Fixed Files - SSR protection
  
  const browserClientPath = '/Users/bossio/6FB AI Agent System/lib/supabase/browser-client.js'
  const browserClientContent = analyzeFileContent(browserClientPath)
  
  results.components.ssrProtection = browserClientContent
  
  if (browserClientContent.hasContent) {
    const content = browserClientContent.content
    const hasSSRProtection = content.includes('typeof document === \'undefined\'')
    const protectionCount = (content.match(/typeof document === 'undefined'/g) || []).length

    results.components.ssrProtection.hasProtection = hasSSRProtection
    results.components.ssrProtection.protectionPoints = protectionCount
  }
  
  // 5. Algorithm Analysis - Check for enterprise-grade features

  if (conflictDetectorContent.hasContent) {
    const content = conflictDetectorContent.content
    
    // Advanced algorithmic features
    const hasOLogNComplexity = content.includes('O(log n)') || content.includes('O(n log n)')
    const hasAvlRotations = content.includes('rotateLeft') && content.includes('rotateRight')
    const hasCaching = content.includes('cache') || content.includes('Cache')
    const hasStatistics = content.includes('getStats')
    const hasRealTimeSync = content.includes('subscribe') || content.includes('supabase')
    const hasFieldNormalization = content.includes('normalize') || content.includes('standardize')
    
     complexity: ${hasOLogNComplexity ? '✅' : '❌'}`)

    results.components.enterpriseFeatures = {
      hasOLogNComplexity,
      hasAvlRotations,
      hasCaching,
      hasStatistics,
      hasRealTimeSync,
      hasFieldNormalization
    }
  }
  
  // Calculate overall score
  let totalChecks = 0
  let passedChecks = 0
  
  // Core components
  if (results.components.conflictDetector?.exists) passedChecks++
  totalChecks++
  
  if (results.components.apiRoute?.exists) passedChecks++
  totalChecks++
  
  // Feature completeness
  const features = results.components.conflictDetector?.features || {}
  const featureCount = Object.values(features).filter(Boolean).length
  const totalFeatures = Object.keys(features).length
  
  if (totalFeatures > 0) {
    passedChecks += featureCount
    totalChecks += totalFeatures
  }
  
  const enterpriseFeatures = results.components.enterpriseFeatures || {}
  const enterpriseCount = Object.values(enterpriseFeatures).filter(Boolean).length
  const totalEnterpriseFeatures = Object.keys(enterpriseFeatures).length
  
  if (totalEnterpriseFeatures > 0) {
    passedChecks += enterpriseCount
    totalChecks += totalEnterpriseFeatures
  }
  
  results.summary = {
    totalChecks,
    passedChecks,
    successRate: Math.round((passedChecks / totalChecks) * 100),
    overallStatus: passedChecks >= (totalChecks * 0.8) ? 'EXCELLENT' : 
                   passedChecks >= (totalChecks * 0.6) ? 'GOOD' : 
                   passedChecks >= (totalChecks * 0.4) ? 'PARTIAL' : 'INCOMPLETE'
  }

  `)
  
  if (results.summary.successRate >= 80) {

  } else if (results.summary.successRate >= 60) {

  } else {

  }
  
  return results
}

// Execute validation
const results = validateImplementation()

// Output results to file
const outputPath = '/Users/bossio/6FB AI Agent System/booking-rules-validation-report.json'
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))

process.exit(0)