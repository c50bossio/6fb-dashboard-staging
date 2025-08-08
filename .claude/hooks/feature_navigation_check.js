/**
 * Feature Navigation Integration Check Hook
 * 
 * This hook automatically checks if new features are properly integrated
 * into the navigation system and dashboard.
 * 
 * Triggered when: Creating new pages or components
 */

const fs = require('fs')
const path = require('path')

// Navigation files to check
const NAVIGATION_FILES = [
  'components/Navigation.js',
  'components/MobileNavigation.js',
  'components/DashboardNavigation.js'
]

// Dashboard files to check
const DASHBOARD_FILES = [
  'app/(protected)/dashboard/page.js',
  'components/dashboard/'
]

function checkForNewPages(changedFiles) {
  const newPages = changedFiles.filter(file => {
    // Check for new pages in app directory
    return file.match(/app\/.*\/page\.(js|jsx|ts|tsx)$/) && 
           !file.includes('api/') // Exclude API routes
  })
  
  return newPages
}

function checkNavigationIntegration(pagePath) {
  const results = {
    hasNavigation: false,
    hasDashboardLink: false,
    hasMobileNav: false,
    suggestions: []
  }

  // Extract route from page path
  const route = pagePath
    .replace(/^app/, '')
    .replace(/\/page\.(js|jsx|ts|tsx)$/, '')
    .replace(/\(protected\)\//, '/') // Remove Next.js route groups

  // Check main navigation
  const navFile = path.join(process.cwd(), 'components/Navigation.js')
  if (fs.existsSync(navFile)) {
    const navContent = fs.readFileSync(navFile, 'utf8')
    results.hasNavigation = navContent.includes(`'${route}'`) || navContent.includes(`"${route}"`)
  }

  // Check mobile navigation
  const mobileNavFile = path.join(process.cwd(), 'components/MobileNavigation.js')
  if (fs.existsSync(mobileNavFile)) {
    const mobileNavContent = fs.readFileSync(mobileNavFile, 'utf8')
    results.hasMobileNav = mobileNavContent.includes(`'${route}'`) || mobileNavContent.includes(`"${route}"`)
  }

  // Generate suggestions
  if (!results.hasNavigation) {
    results.suggestions.push(`Add navigation link for ${route} to components/Navigation.js`)
  }
  if (!results.hasMobileNav) {
    results.suggestions.push(`Add mobile navigation link for ${route} to components/MobileNavigation.js`)
  }
  if (!results.hasDashboardLink) {
    results.suggestions.push(`Consider adding dashboard card/link for ${route}`)
  }

  return results
}

function generateNavigationCode(pagePath) {
  const route = pagePath
    .replace(/^app/, '')
    .replace(/\/page\.(js|jsx|ts|tsx)$/, '')
    .replace(/\(protected\)\//, '/')

  const featureName = route.split('/').pop()
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return `
// Add this to components/Navigation.js in the appropriate section:
{
  name: '${featureName}',
  href: '${route}',
  icon: SomeIcon, // Choose appropriate icon from @heroicons/react/24/outline
  description: 'Description of what this feature does',
  badge: 'New' // Optional: 'Core', 'AI Enhanced', etc.
}

// Don't forget to:
// 1. Import the icon: import { SomeIcon } from '@heroicons/react/24/outline'
// 2. Add role-based filtering if needed
// 3. Test the navigation on mobile devices
  `.trim()
}

function main(changedFiles = []) {
  console.log('🔍 Checking feature navigation integration...')
  
  const newPages = checkForNewPages(changedFiles)
  
  if (newPages.length === 0) {
    console.log('✅ No new pages detected')
    return { success: true }
  }

  console.log(`📄 Found ${newPages.length} new page(s):`)
  
  const issues = []
  
  newPages.forEach(page => {
    console.log(`\n🔎 Analyzing: ${page}`)
    
    const integration = checkNavigationIntegration(page)
    
    if (!integration.hasNavigation || !integration.hasMobileNav) {
      console.log('❌ Navigation integration issues found:')
      integration.suggestions.forEach(suggestion => {
        console.log(`   • ${suggestion}`)
      })
      
      console.log('\n💡 Suggested navigation code:')
      console.log(generateNavigationCode(page))
      
      issues.push({
        page,
        issues: integration.suggestions
      })
    } else {
      console.log('✅ Navigation integration looks good!')
    }
  })

  if (issues.length > 0) {
    console.log('\n' + '='.repeat(60))
    console.log('🚨 NAVIGATION INTEGRATION REQUIRED')
    console.log('='.repeat(60))
    console.log('\nThe following pages need navigation integration:')
    
    issues.forEach(({ page, issues: pageIssues }) => {
      console.log(`\n📄 ${page}:`)
      pageIssues.forEach(issue => console.log(`   ❌ ${issue}`))
    })
    
    console.log('\n📋 Action Required:')
    console.log('1. Add navigation links to components/Navigation.js')
    console.log('2. Update mobile navigation if needed')
    console.log('3. Consider dashboard integration')
    console.log('4. Test user discovery and access flows')
    console.log('5. Verify role-based permissions')
    
    console.log('\n📖 See DEVELOPMENT_CHECKLIST.md for detailed guidance')
    
    return { 
      success: false, 
      message: 'Navigation integration required for new features',
      issues 
    }
  }

  console.log('\n✅ All features properly integrated!')
  return { success: true }
}

// Export for use in other scripts
module.exports = {
  main,
  checkForNewPages,
  checkNavigationIntegration,
  generateNavigationCode
}

// Run if called directly
if (require.main === module) {
  // Get changed files from command line args or git
  const changedFiles = process.argv.slice(2)
  const result = main(changedFiles)
  
  if (!result.success) {
    process.exit(1)
  }
}