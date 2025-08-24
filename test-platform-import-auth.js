#!/usr/bin/env node

/**
 * Test script to verify platform-import API authentication works
 */

async function testPlatformImport() {
  console.log('🧪 Testing Platform Import API Authentication\n')
  
  // Create minimal test CSV data
  const csvContent = `First Name,Last Name,Email,Phone
John,Doe,john@example.com,555-0001
Jane,Smith,jane@example.com,555-0002`

  // Create form data
  const formData = new FormData()
  formData.append('platform', 'trafft')
  formData.append('barbershopId', 'test-barbershop-123')
  
  // Create a Blob to simulate a file
  const blob = new Blob([csvContent], { type: 'text/csv' })
  formData.append('file1', blob, 'customers.csv')

  try {
    // Test WITHOUT onboarding header (should fail or succeed based on auth)
    console.log('1️⃣ Testing without onboarding header...')
    const response1 = await fetch('http://localhost:9999/api/onboarding/platform-import', {
      method: 'POST',
      body: formData
    })
    console.log(`   Status: ${response1.status} ${response1.statusText}`)
    
    // Test WITH onboarding header (should succeed)
    console.log('\n2️⃣ Testing with onboarding header...')
    const response2 = await fetch('http://localhost:9999/api/onboarding/platform-import', {
      method: 'POST',
      headers: {
        'x-onboarding-flow': 'true'
      },
      body: formData
    })
    console.log(`   Status: ${response2.status} ${response2.statusText}`)
    
    if (response2.ok) {
      const result = await response2.json()
      console.log('   ✅ Import succeeded!')
      console.log('   Result:', JSON.stringify(result, null, 2))
    } else {
      const error = await response2.text()
      console.log('   ❌ Import failed:', error)
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.log('⚠️  This script requires Node.js 18+ for native fetch support')
  console.log('   Or run it in the browser console while on localhost:9999')
  process.exit(1)
}

testPlatformImport()