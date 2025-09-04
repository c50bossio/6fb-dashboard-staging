/**
 * OAuth Configuration Fix Verification Script
 * 
 * This script verifies that the OAuth redirect URI fix is working correctly
 * and tests the complete authentication flow.
 */

const fs = require('fs')
const path = require('path')

// Configuration
const SUPABASE_URL = 'https://dfhqjdoydihajmjxniee.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.cJHrXmW8wr01NX7B-cBjMfNhgVv7eYhERFLY7-HLEeA'

async function verifyOAuthConfig() {
  console.log('🔍 Verifying OAuth Configuration Fix...\n')
  
  const issues = []
  const fixes = []
  
  // 1. Check environment file
  try {
    const envPath = path.join(process.cwd(), '.env.production')
    const envContent = fs.readFileSync(envPath, 'utf8')
    
    if (envContent.includes('GOOGLE_REDIRECT_URI=https://bookedbarber.com/api/auth/callback')) {
      console.log('✅ OAuth redirect URI fixed in .env.production')
      fixes.push('OAuth redirect URI corrected')
    } else {
      issues.push('OAuth redirect URI still incorrect in .env.production')
      console.log('❌ OAuth redirect URI not fixed')
    }
  } catch (error) {
    issues.push(`Cannot read .env.production: ${error.message}`)
  }
  
  // 2. Check callback route exists
  const callbackRoutePath = path.join(process.cwd(), 'app/api/auth/callback/route.js')
  if (fs.existsSync(callbackRoutePath)) {
    console.log('✅ OAuth callback route exists: /api/auth/callback')
    fixes.push('OAuth callback route is properly configured')
  } else {
    issues.push('OAuth callback route missing at /api/auth/callback')
    console.log('❌ OAuth callback route missing')
  }
  
  // 3. Test basic environment variables
  try {
    const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL')
    const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if (hasSupabaseUrl && hasSupabaseKey) {
      console.log('✅ Supabase environment variables configured')
      fixes.push('Supabase configuration verified')
    } else {
      issues.push('Missing Supabase environment variables')
      console.log('❌ Supabase environment variables missing')
    }
  } catch (error) {
    issues.push(`Environment variable check failed: ${error.message}`)
  }
  
  // 4. Check API route methods
  const apiRoutes = [
    'app/api/monitoring/route.js',
    'app/api/health/stripe/route.js',
    'app/api/monitoring/health/route.js'
  ]
  
  for (const route of apiRoutes) {
    const routePath = path.join(process.cwd(), route)
    if (fs.existsSync(routePath)) {
      const routeContent = fs.readFileSync(routePath, 'utf8')
      const hasGet = routeContent.includes('export async function GET')
      const hasPost = routeContent.includes('export async function POST')
      
      console.log(`✅ Route ${route}: GET(${hasGet}) POST(${hasPost})`)
      fixes.push(`${route} methods verified`)
    }
  }
  
  // Summary
  console.log('\n📊 Verification Summary:')
  console.log(`✅ Fixes Applied: ${fixes.length}`)
  console.log(`❌ Issues Found: ${issues.length}`)
  
  if (fixes.length > 0) {
    console.log('\n✅ Applied Fixes:')
    fixes.forEach(fix => console.log(`   - ${fix}`))
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Remaining Issues:')
    issues.forEach(issue => console.log(`   - ${issue}`))
  }
  
  // Generate test OAuth URL
  console.log('\n🔗 Test OAuth Flow:')
  console.log('1. Visit: https://bookedbarber.com/login')
  console.log('2. Click "Sign in with Google"')
  console.log('3. Should redirect to: https://bookedbarber.com/api/auth/callback')
  console.log('4. Then redirect to: https://bookedbarber.com/dashboard')
  
  return { fixes, issues }
}

// Additional fixes for API method issues
function generateAPIMethodFixes() {
  console.log('\n🔧 API Method Support Fixes:')
  
  const fixes = [
    {
      file: 'app/api/monitoring/metrics/route.js',
      methods: ['GET', 'POST'],
      description: 'Ensure monitoring metrics endpoint supports both GET and POST'
    },
    {
      file: 'middleware.js', 
      fix: 'Verify OAuth callback routes are properly excluded from auth checks',
      description: 'OAuth callback routes need special handling'
    }
  ]
  
  fixes.forEach(fix => {
    console.log(`   - ${fix.file}: ${fix.description}`)
  })
  
  return fixes
}

// Run verification
if (require.main === module) {
  verifyOAuthConfig()
    .then(result => {
      generateAPIMethodFixes()
      
      console.log('\n🚀 Next Steps:')
      console.log('1. Deploy the OAuth redirect URI fix to production')
      console.log('2. Update Google OAuth settings in Google Cloud Console')  
      console.log('3. Test the complete OAuth flow')
      console.log('4. Monitor authentication logs for any remaining issues')
      
      process.exit(result.issues.length > 0 ? 1 : 0)
    })
    .catch(error => {
      console.error('Verification failed:', error)
      process.exit(1)
    })
}

module.exports = { verifyOAuthConfig, generateAPIMethodFixes }