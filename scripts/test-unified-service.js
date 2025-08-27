#!/usr/bin/env node

/**
 * Test the Unified Staff Service directly
 */

import unifiedStaffService from '../lib/unified-staff-service.js'

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
  // // Debug log removed for production
}

async function testUnifiedService() {
  log('magenta', '🔍 Testing Unified Staff Service')
  log('magenta', '=================================\n')
  
  const locationId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b' // Real Tomb45 ID
  
  try {
    log('blue', '1. Testing with real Tomb45 location ID:')
    log('cyan', `   Location ID: ${locationId}`)
    
    const result = await unifiedStaffService.getStaff(locationId, {
      useCache: false,
      includeAvailability: false,
      includeServices: false,
      forceRefresh: true
    })
    
    log('', '')
    log('blue', '2. Result from UnifiedStaffService:')
    log('cyan', `   Has data: ${!!result}`)
    log('cyan', `   Staff count: ${result?.staff?.length || 0}`)
    log('cyan', `   Count field: ${result?.count || 0}`)
    log('cyan', `   Source: ${result?.source || 'unknown'}`)
    log('cyan', `   Barbershop ID: ${result?.barbershop_id || 'none'}`)
    
    if (result?.staff && result.staff.length > 0) {
      log('', '')
      log('green', '✅ Staff found:')
      result.staff.forEach(staff => {
        log('green', `   - ${staff.display_name || staff.name || 'Unknown'} (${staff.role || 'N/A'})`)
        log('green', `     ID: ${staff.user_id || staff.id}`)
      })
    } else {
      log('red', '❌ No staff returned from UnifiedStaffService')
      log('yellow', '   This is the issue - service is not returning data')
    }
    
  } catch (error) {
    log('red', `❌ Error: ${error.message}`)
    console.error(error)
  }
}

testUnifiedService().catch(error => {
  log('red', `Fatal error: ${error.message}`)
  process.exit(1)
})