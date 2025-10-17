#!/usr/bin/env node

/**
 * Barbershop ID Investigation Script
 * Find out what barbershop IDs actually exist and are being used
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

async function investigateBarbershopIds() {
  log('cyan', '🔍 Investigating Barbershop ID Mystery')
  log('cyan', '=====================================\n')
  
  // Try to find debug endpoints or database queries
  const testEndpoints = [
    '/api/debug/barbershops',
    '/api/barbershops',
    '/api/shops',
    '/api/profile/current',
    '/api/user/profile',
    '/api/debug/user-info'
  ]
  
  log('blue', '🔍 Testing various endpoints to find barbershop data...\n')
  
  for (const endpoint of testEndpoints) {
    try {
      log('cyan', `Testing: ${endpoint}`)
      
      const response = await makeRequest(`${BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Barbershop-ID-Investigator'
        }
      })
      
      log('cyan', `  Status: ${response.status}`)
      
      if (response.status === 200 && response.data) {
        log('green', `  ✅ Found data!`)
        
        // Look for barbershop-related fields
        const dataStr = JSON.stringify(response.data, null, 2)
        const barbershopFields = dataStr.match(/(barbershop|shop)(_id|Id|_ID).*?:/gi) || []
        const idFields = dataStr.match(/"id":\s*"[^"]+"/gi) || []
        
        if (barbershopFields.length > 0) {
          log('green', `  🏪 Found barbershop fields: ${barbershopFields.join(', ')}`)
        }
        
        if (idFields.length > 0) {
          log('green', `  🆔 Found ID fields: ${idFields.slice(0, 3).join(', ')}${idFields.length > 3 ? '...' : ''}`)
        }
        
        // Show relevant parts of the response
        if (response.data.barbershop_id || response.data.shop_id) {
          log('green', `  📍 Key IDs: barbershop_id=${response.data.barbershop_id}, shop_id=${response.data.shop_id}`)
        }
        
        if (response.data.profile) {
          const profile = response.data.profile
          log('green', `  👤 Profile IDs: shop_id=${profile.shop_id}, barbershop_id=${profile.barbershop_id}`)
        }
        
        console.log('')
      } else if (response.status === 401) {
        log('yellow', `  ⚠️  Authentication required (401)`)
      } else if (response.status === 404) {
        log('yellow', `  ⚠️  Not found (404)`)
      } else {
        log('red', `  ❌ Error: ${response.status}`)
      }
    } catch (error) {
      log('red', `  ❌ ERROR: ${error.message}`)
    }
  }
  
  console.log('')
  
  // Try to enumerate possible barbershop IDs by testing ranges
  log('blue', '🔍 Trying to discover barbershop IDs by enumeration...\n')
  
  const possibleIds = [
    // Numeric IDs
    1, 2, 3, 4, 5,
    // UUID-like or string IDs based on the user/location shown in screenshots
    'chris-bossio',
    'tomb45',
    'tomb45-channelside',
    'channelside',
    'default',
    'test',
    '00000000-0000-0000-0000-000000000001',
    // Common UUIDs
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  ]
  
  for (const id of possibleIds) {
    try {
      const response = await makeRequest(`${BASE_URL}/api/public/barbershop/${id}/barbers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.status === 200) {
        log('green', `✅ FOUND BARBERSHOP: ${id}`)
        log('green', `   Staff count: ${response.data.count}`)
        if (response.data.staff && response.data.staff.length > 0) {
          log('green', `   Staff: ${response.data.staff.map(s => s.display_name || s.full_name).join(', ')}`)
        }
        return { barbershopId: id, data: response.data }
      } else if (response.status !== 404) {
        log('yellow', `⚠️  Barbershop ${id}: ${response.status}`)
      }
    } catch (error) {
      // Ignore individual request errors
    }
  }
  
  return null
}

async function main() {
  log('magenta', '🚀 Barbershop ID Investigation Tool')
  log('magenta', '=================================\n')
  
  log('blue', '🎯 Goal: Find the correct barbershop ID that the calendar should use')
  log('blue', '   Staff Management works, Calendar doesn\'t - need to find the ID mapping\n')
  
  const result = await investigateBarbershopIds()
  
  console.log('')
  log('cyan', '📊 Investigation Results')
  log('cyan', '========================')
  
  if (result) {
    log('green', `🎉 SUCCESS! Found barbershop ID: ${result.barbershopId}`)
    log('green', `   This is the ID the calendar should use`)
    log('green', `   Staff count: ${result.data.count}`)
    log('green', `   Staff members: ${result.data.staff.map(s => s.display_name || s.full_name).join(', ')}`)
  } else {
    log('red', '❌ No barbershop ID found through any method')
    log('red', '   This suggests a deeper database or configuration issue')
  }
  
  console.log('')
  log('blue', '💡 Next Steps:')
  if (result) {
    log('yellow', `   1. Update calendar to use barbershop ID: ${result.barbershopId}`)
    log('yellow', `   2. Or fix the ID resolution logic in unified staff service`)
    log('yellow', `   3. Check why calendar gets wrong barbershop ID vs staff management`)
  } else {
    log('yellow', '   1. Check database barbershops table for existing entries')
    log('yellow', '   2. Verify user profile has correct shop_id/barbershop_id')
    log('yellow', '   3. Check barbershop_staff table for staff associations')
    log('yellow', '   4. Review onboarding/setup process')
  }
}

// Run the investigation
main().catch(error => {
  log('red', `💥 Unexpected error: ${error.message}`)
  process.exit(1)
})