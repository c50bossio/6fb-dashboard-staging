#!/usr/bin/env node

/**
 * Verification script to ensure onboarding system is 100% complete
 * Checks all components exist and are properly imported
 */

const fs = require('fs')
const path = require('path')

// Components that should exist
const requiredComponents = [
  'components/onboarding/PlatformTailoredImport.js',
  'components/onboarding/DataVerificationSetup.js',
  'components/onboarding/BusinessPlanningSetup.js',
  'components/onboarding/LocationManagementSetup.js',
  'components/dashboard/DashboardOnboarding.js',
  'components/onboarding/AdaptiveFlowEngine.js',
  'components/onboarding/WelcomeSegmentation.js'
]

// Check if all components exist

let allFilesExist = true

requiredComponents.forEach(component => {
  const filePath = path.join(process.cwd(), component)
  const exists = fs.existsSync(filePath)
  
  if (exists) {
    
  } else {
    
    allFilesExist = false
  }
})

// Read DashboardOnboarding.js and check imports
const dashboardPath = path.join(process.cwd(), 'components/dashboard/DashboardOnboarding.js')
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8')

const requiredImports = [
  'PlatformTailoredImport',
  'DataVerificationSetup', 
  'BusinessPlanningSetup',
  'LocationManagementSetup'
]

let allImportsPresent = true

requiredImports.forEach(importName => {
  if (dashboardContent.includes(`import ${importName}`)) {
    
  } else {
    
    allImportsPresent = false
  }
})

// Check if all step IDs are handled
const stepIds = [
  'data_import',
  'data_verification',
  'business_planning',
  'location_management',
  'analytics_setup',
  'ai_training'
]

let allStepsHandled = true

stepIds.forEach(stepId => {
  if (dashboardContent.includes(`case '${stepId}':`)) {
    
  } else {
    
    allStepsHandled = false
  }
})

// Check for problematic placeholders
const problematicPhrases = [
  'is coming soon',
  'Future coming soon',
  'feature is under development'
]

let hasPlaceholders = false

problematicPhrases.forEach(phrase => {
  if (dashboardContent.includes(phrase)) {
    
    hasPlaceholders = true
  }
})

if (!hasPlaceholders) {
  
}

// Read AdaptiveFlowEngine.js to verify step generation
const enginePath = path.join(process.cwd(), 'components/onboarding/AdaptiveFlowEngine.js')
if (fs.existsSync(enginePath)) {
  const engineContent = fs.readFileSync(enginePath, 'utf8')
  
  const dynamicSteps = [
    'data_import',
    'data_verification',
    'business_planning',
    'location_management'
  ]
  
  dynamicSteps.forEach(step => {
    if (engineContent.includes(`'${step}'`) || engineContent.includes(`"${step}"`)) {
      
    } else {
      
    }
  })
}

)

)

const issues = []

if (!allFilesExist) {
  issues.push('Some component files are missing')
}

if (!allImportsPresent) {
  issues.push('Some components are not imported in DashboardOnboarding.js')
}

if (!allStepsHandled) {
  issues.push('Some step IDs are not handled in the switch statement')
}

if (hasPlaceholders) {
  issues.push('Generic placeholders still exist')
}

if (issues.length === 0) {

} else {
  
  issues.forEach(issue => {
    
  })
  
  process.exit(1)
}

\n')