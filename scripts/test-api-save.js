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
    
    )
    
    const response = await fetch(`http://localhost:9999/api/staff/${testStaffId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    })

    const responseData = await response.text()

    if (!response.ok) {
      console.error('❌ API call failed!')
      
      if (response.status === 401) {

      } else if (response.status === 404) {

      } else {
        
      }
    } else {
      
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {

    } else {
      console.error('❌ Error:', error.message)
    }
  }
}

await testApiSave()