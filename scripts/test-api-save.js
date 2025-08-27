#!/usr/bin/env node

/**
 * Test the actual API endpoint that the frontend calls
 */

import fetch from 'node-fetch'
import { config } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

config({ path: path.join(__dirname, '..', '.env.local') })

console.log('🧪 Testing staff API endpoint save functionality...')

// Use one of the staff IDs we found in the debug script
const testStaffId = '0d3c11af-b9b9-4ec0-982c-e0e06383bbbe'

const testPayload = {
  full_name: 'Updated Test Barber',
  commission_rate: 0.7, // 70%
  arrangement_type: 'commission',
  rent_frequency: 'monthly',
  booth_rent_amount: 0,
  hourly_rate: 0
}

async function testApiSave() {
  try {
    console.log('📤 Testing API call to:', `http://localhost:9999/api/staff/${testStaffId}`)
    console.log('📋 Payload:', JSON.stringify(testPayload, null, 2))
    
    const response = await fetch(`http://localhost:9999/api/staff/${testStaffId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })
    
    console.log('📊 Response status:', response.status, response.statusText)
    
    const responseData = await response.text()
    console.log('📥 Response data:', responseData)
    
    if (!response.ok) {
      console.error('❌ API call failed!')
      
      if (response.status === 401) {
        console.log('🔐 Issue: Authentication required')
        console.log('💡 The frontend would have user authentication, but this script does not')
        console.log('✅ This is actually expected behavior!')
      } else if (response.status === 404) {
        console.log('❌ Issue: API endpoint not found')
        console.log('💡 Check if the Next.js dev server is running on port 9999')
      } else {
        console.log('❌ Issue: Other error')
      }
    } else {
      console.log('✅ API call successful!')
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - Next.js dev server is not running')
      console.log('💡 Start the dev server with: npm run dev')
    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

await testApiSave()