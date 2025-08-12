// Test script to verify routing and page accessibility
// Run this to check if pages are properly configured

import { createServer } from 'http'
import next from 'next'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev, port: 9999 })
const handle = app.getRequestHandler()

const testRoutes = [
  '/barber/services',
  '/shop/settings/staff',
  '/shop/services',
  '/shop/settings',
  '/api/health'
]

async function testRouting() {
  console.log('🔍 Testing Next.js Routing...\n')
  
  try {
    await app.prepare()
    console.log('✅ Next.js app prepared successfully')
    
    // Test route resolution
    for (const route of testRoutes) {
      try {
        console.log(`Testing route: ${route}`)
        
        // This would typically test if the route exists in the app
        // For now, just checking if the files exist
        const routePath = route.startsWith('/api') 
          ? `./app${route}/route.js`
          : `./app/(protected)${route}/page.js`
        
        try {
          const fs = await import('fs')
          const path = await import('path')
          
          const fullPath = path.resolve(routePath)
          if (fs.existsSync(fullPath)) {
            console.log(`  ✅ File exists: ${routePath}`)
          } else {
            console.log(`  ❌ File missing: ${routePath}`)
          }
        } catch (error) {
          console.log(`  ⚠️  Could not check file: ${error.message}`)
        }
      } catch (error) {
        console.log(`  ❌ Route error: ${error.message}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Next.js app preparation failed:', error.message)
  }
  
  console.log('\n📋 Route Testing Complete')
}

async function testWithFetch() {
  console.log('\n🌐 Testing with HTTP Requests...\n')
  
  const baseUrl = 'http://localhost:9999'
  
  for (const route of testRoutes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        headers: {
          'User-Agent': 'test-script/1.0'
        }
      })
      
      const status = response.status
      let result = ''
      
      if (status === 200) {
        result = '✅ OK'
      } else if (status === 404) {
        result = '❌ Not Found'
      } else if (status === 500) {
        result = '⚠️  Server Error'
      } else if (status === 302 || status === 307) {
        result = '🔄 Redirect (likely auth required)'
      } else {
        result = `⚠️  Status ${status}`
      }
      
      console.log(`${route}: ${result}`)
      
    } catch (error) {
      console.log(`${route}: ❌ Network error - ${error.message}`)
    }
  }
}

// Run tests
async function runAllTests() {
  await testRouting()
  await testWithFetch()
  
  console.log('\n📝 RECOMMENDATIONS:')
  console.log('1. Ensure development server is running: npm run dev')
  console.log('2. Check console logs for any Next.js build errors')
  console.log('3. Verify authentication setup if routes redirect')
  console.log('4. Run database setup scripts if pages show loading states')
}

runAllTests().catch(console.error)