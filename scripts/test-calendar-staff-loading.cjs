#!/usr/bin/env node

/**
 * Calendar Staff Loading Diagnostic Script
 * Simulates what the calendar page does to load staff data
 */

const http = require('http')

// Test configurations
const BASE_URL = 'http://localhost:9999'

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
            raw: true
          })
        }
      })
    })
    
    req.on('error', reject)
    req.setTimeout(15000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testCalendarStaffLoading() {
  log('cyan', '📅 Testing Calendar Staff Loading Process')
  log('cyan', '==========================================\n')
  
  // Step 1: Test authenticated staff API (what unified staff service does first)
  log('blue', '🔍 Step 1: Testing Authenticated Staff API')
  log('yellow', '   This is what the unified staff service tries first...')
  
  try {
    const authStaffResponse = await makeRequest(`${BASE_URL}/api/staff`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Calendar-Diagnostic-Script'
      }
    })
    
    log('cyan', `   Response Status: ${authStaffResponse.status}`)
    
    if (authStaffResponse.status === 200 && authStaffResponse.data.success) {
      log('green', `   ✅ SUCCESS: Found ${authStaffResponse.data.count} staff members`)
      log('green', `   Staff: ${JSON.stringify(authStaffResponse.data.staff.map(s => ({name: s.full_name, id: s.id})), null, 2)}`)
      return { success: true, source: 'authenticated', data: authStaffResponse.data }
    } else if (authStaffResponse.status === 401) {
      log('yellow', '   ⚠️  Authentication failed (401) - this is expected for unauthenticated requests')
      log('yellow', '   Unified staff service will try public endpoint next...')
    } else {
      log('red', `   ❌ Unexpected response: ${authStaffResponse.status}`)
      log('red', `   Error: ${JSON.stringify(authStaffResponse.data)}`)
    }
  } catch (error) {
    log('red', `   ❌ ERROR: ${error.message}`)
  }
  
  console.log('')
  
  // Step 2: Test public barbershop API (what unified staff service does as fallback)
  log('blue', '🔍 Step 2: Testing Public Barbershop API')
  log('yellow', '   This is the fallback when authentication fails...')
  
  // We need to test with different barbershop IDs
  const testBarbershopIds = ['1', 'tomb45-channelside', 'default-shop', 'chris-bossio']
  
  for (const barbershopId of testBarbershopIds) {
    try {
      log('cyan', `   Trying barbershop ID: ${barbershopId}`)
      
      const publicResponse = await makeRequest(`${BASE_URL}/api/public/barbershop/${barbershopId}/barbers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Calendar-Diagnostic-Script'
        }
      })
      
      log('cyan', `     Response Status: ${publicResponse.status}`)
      
      if (publicResponse.status === 200 && publicResponse.data.success) {
        log('green', `     ✅ SUCCESS: Found ${publicResponse.data.count} staff members`)
        if (publicResponse.data.staff && publicResponse.data.staff.length > 0) {
          log('green', `     Staff: ${JSON.stringify(publicResponse.data.staff.map(s => ({
            name: s.display_name || s.full_name,
            id: s.id,
            active: s.is_active
          })), null, 2)}`)
          return { success: true, source: 'public', barbershopId, data: publicResponse.data }
        }
      } else if (publicResponse.status === 404) {
        log('yellow', `     ⚠️  Barbershop not found (404)`)
      } else {
        log('red', `     ❌ Unexpected response: ${publicResponse.status}`)
        if (publicResponse.data) {
          log('red', `     Error: ${JSON.stringify(publicResponse.data)}`)
        }
      }
    } catch (error) {
      log('red', `     ❌ ERROR: ${error.message}`)
    }
    
    console.log('')
  }
  
  return { success: false, message: 'No staff found through any method' }
}

async function main() {
  log('magenta', '🚀 Calendar Staff Loading Diagnostic Tool')
  log('magenta', '=======================================\n')
  
  log('blue', '🎯 Goal: Understand why calendar shows "Almost Ready to Book!" when staff exists')
  log('blue', '   The calendar uses unified staff service which tries multiple approaches\n')
  
  const result = await testCalendarStaffLoading()
  
  console.log('')
  log('cyan', '📊 Diagnostic Results')
  log('cyan', '=====================')
  
  if (result.success) {
    log('green', `✅ Staff data WAS found via ${result.source} endpoint!`)
    log('green', `   This means the issue is likely in the client-side JavaScript`)
    log('green', `   Check for:`)
    log('green', `   - Browser console errors`)
    log('green', `   - JavaScript authentication context`)
    log('green', `   - Unified staff service client-side logic`)
    log('green', `   - React component state management`)
  } else {
    log('red', `❌ No staff data found through any method`)
    log('red', `   This confirms the API endpoints are not working`)
    log('red', `   Check for:`)
    log('red', `   - Database connectivity`)
    log('red', `   - Barbershop ID mapping`)
    log('red', `   - RLS policies`)
    log('red', `   - User profile setup`)
  }
  
  console.log('')
  log('blue', '💡 Next Steps:')
  if (result.success) {
    log('yellow', '   1. Open browser dev tools on calendar page')
    log('yellow', '   2. Check Network tab for failed API calls')
    log('yellow', '   3. Check Console tab for JavaScript errors')
    log('yellow', '   4. Look for unified staff service debug logs')
  } else {
    log('yellow', '   1. Check database for barbershop_staff table entries')
    log('yellow', '   2. Verify user has proper barbershop association')
    log('yellow', '   3. Check RLS policies on profiles and barbershop_staff')
    log('yellow', '   4. Review server console for API error logs')
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('yellow', '\n🛑 Diagnostic interrupted by user')
  process.exit(0)
})

// Run the diagnostic
main().catch(error => {
  log('red', `💥 Unexpected error: ${error.message}`)
  process.exit(1)
})