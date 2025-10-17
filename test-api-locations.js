/**
 * Test /api/user/locations endpoint after fixing shop_id column issue
 */

async function testUserLocationsAPI() {
  console.log('🧪 Testing /api/user/locations endpoint...\n')

  try {
    // First, login to get session cookie
    console.log('🔐 Step 1: Logging in as demo@barbershop.com...')
    const loginResponse = await fetch('http://localhost:9999/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@barbershop.com',
        password: 'demo123'
      })
    })

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, loginResponse.statusText)
      const errorText = await loginResponse.text()
      console.error('Error details:', errorText)
      return
    }

    const loginData = await loginResponse.json()
    console.log('✅ Login successful')
    console.log('   User ID:', loginData.user?.id)
    console.log('   Role:', loginData.user?.role)

    // Get session cookies
    const cookies = loginResponse.headers.get('set-cookie')

    // Now test the /api/user/locations endpoint
    console.log('\n📍 Step 2: Fetching user locations...')
    const locationsResponse = await fetch('http://localhost:9999/api/user/locations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      }
    })

    console.log('   Response status:', locationsResponse.status, locationsResponse.statusText)

    const locationsData = await locationsResponse.json()

    if (!locationsResponse.ok) {
      console.error('\n❌ API FAILED')
      console.error('   Status:', locationsResponse.status)
      console.error('   Error:', locationsData.error)
      console.error('   Details:', locationsData.details)

      if (locationsData.error === 'User profile not found') {
        console.error('\n🚨 CRITICAL: Still getting "User profile not found" error!')
        console.error('   This means the shop_id column fix did not work.')
      }
      return
    }

    // Success!
    console.log('\n✅ API SUCCESS')
    console.log('   Locations found:', locationsData.data?.length || 0)
    console.log('   Access method:', locationsData.meta?.accessMethod)
    console.log('   User role:', locationsData.meta?.userRole)

    if (locationsData.data && locationsData.data.length > 0) {
      console.log('\n📊 Location details:')
      locationsData.data.forEach((loc, index) => {
        console.log(`   ${index + 1}. ${loc.name}`)
        console.log(`      ID: ${loc.id}`)
        console.log(`      Address: ${loc.address}, ${loc.city}, ${loc.state}`)
        console.log(`      Status: ${loc.status}`)
      })
    }

    console.log('\n🎉 TEST PASSED: shop_id column fix is working!')

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message)
    console.error(error.stack)
  }
}

// Run the test
testUserLocationsAPI()
