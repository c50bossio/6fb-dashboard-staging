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

const NAVIGATION_FILES = [
  'components/Navigation.js',
  'components/MobileNavigation.js',
  'components/DashboardNavigation.js'
]

const DASHBOARD_FILES = [
  'app/(protected)/dashboard/page.js',
  'components/dashboard/'
]

function checkForNewPages(changedFiles) {
  const newPages = changedFiles.filter(file => {
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

  const route = pagePath
    .replace(/^app/, '')
    .replace(/\/page\.(js|jsx|ts|tsx)$/, '')
    .replace(/\(protected\)\//, '/') // Remove Next.js route groups

  const navFile = path.join(process.cwd(), 'components/Navigation.js')
  if (fs.existsSync(navFile)) {
    const navContent = fs.readFileSync(navFile, 'utf8')
    results.hasNavigation = navContent.includes(`'${route}'`) || navContent.includes(`"${route}"`)
  }

  const mobileNavFile = path.join(process.cwd(), 'components/MobileNavigation.js')
  if (fs.existsSync(mobileNavFile)) {
    const mobileNavContent = fs.readFileSync(mobileNavFile, 'utf8')
    results.hasMobileNav = mobileNavContent.includes(`'${route}'`) || mobileNavContent.includes(`"${route}"`)
  }

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
{
  name: '${featureName}',
  href: '${route}',
  icon: SomeIcon, // Choose appropriate icon from @heroicons/react/24/outline
  description: 'Description of what this feature does',
  badge: 'New' // Optional: 'Core', 'AI Enhanced', etc.
}

// 1. Import the icon: import { SomeIcon } from '@heroicons/react/24/outline'
// 2. Add role-based filtering if needed
// 3. Test the navigation on mobile devices
  `.trim()
}

function main(changedFiles = []) {
  // // Debug log removed for production
const newPages = checkForNewPages(changedFiles)
  
  if (newPages.length === 0) {
    // // Debug log removed for production
return { success: true }
  }

  // // Debug log removed for production
:`)
  
  const issues = []
  
  newPages.forEach(page => {
    // // Debug log removed for production
const integration = checkNavigationIntegration(page)
    
    if (!integration.hasNavigation || !integration.hasMobileNav) {
      // // Debug log removed for production
integration.suggestions.forEach(suggestion => {
        // // Debug log removed for production
})
      
      // // Debug log removed for production
// // Debug log removed for production
)
      
      issues.push({
        page,
        issues: integration.suggestions
      })
    } else {
      // // Debug log removed for production
}
  })

  if (issues.length > 0) {
    // // Debug log removed for production
)
    // // Debug log removed for production
// // Debug log removed for production
)
    // // Debug log removed for production
issues.forEach(({ page, issues: pageIssues }) => {
      // // Debug log removed for production
pageIssues.forEach(issue => // // Debug log removed for production
)
    })
    
    // // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
// // Debug log removed for production
return { 
      success: false, 
      message: 'Navigation integration required for new features',
      issues 
    }
  }

  // // Debug log removed for production
return { success: true }
}

module.exports = {
  main,
  checkForNewPages,
  checkNavigationIntegration,
  generateNavigationCode
}

if (require.main === module) {
  const changedFiles = process.argv.slice(2)
  const result = main(changedFiles)
  
  if (!result.success) {
    process.exit(1)
  }
}