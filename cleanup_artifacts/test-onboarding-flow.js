import 'dotenv/config'

// Test the onboarding API endpoints
async function testOnboardingFlow() {
  console.log('🧪 Testing Onboarding Flow with Backend APIs\n')
  
  const baseUrl = 'http://localhost:9999'
  
  // Sample onboarding data
  const testData = {
    role: 'shop_owner',
    goals: ['bookings', 'finances', 'growth'],
    businessSize: '2-5',
    businessName: 'Elite Cuts Studio',
    businessAddress: '123 Main Street, New York, NY 10001',
    businessPhone: '(555) 123-4567',
    businessType: 'barbershop',
    businessHours: '9-7',
    services: [
      { name: 'Premium Haircut', price: 45, duration: 45, description: 'Full service haircut with consultation' },
      { name: 'Beard Trim', price: 25, duration: 20, description: 'Professional beard shaping and trim' },
      { name: 'Hot Towel Shave', price: 35, duration: 30, description: 'Classic hot towel shave experience' }
    ],
    primaryColor: '#2563EB',
    secondaryColor: '#1E293B'
  }
  
  console.log('📝 Test Data:')
  console.log('  Business:', testData.businessName)
  console.log('  Role:', testData.role)
  console.log('  Services:', testData.services.length)
  console.log()
  
  // Test 1: Save Progress API
  console.log('1️⃣ Testing Save Progress API...')
  try {
    const saveResponse = await fetch(`${baseUrl}/api/onboarding/save-progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // In a real scenario, this would include auth headers
      },
      body: JSON.stringify({
        step: 'role',
        stepData: {
          role: testData.role,
          goals: testData.goals,
          businessSize: testData.businessSize
        }
      })
    })
    
    if (saveResponse.ok) {
      const result = await saveResponse.json()
      console.log('  ✅ Progress saved successfully')
      console.log('  Response:', result.message || 'Success')
    } else {
      const error = await saveResponse.text()
      console.log('  ❌ Failed to save progress:', error)
    }
  } catch (error) {
    console.log('  ❌ API Error:', error.message)
  }
  
  // Test 2: Get Progress API
  console.log('\n2️⃣ Testing Get Progress API...')
  try {
    const getResponse = await fetch(`${baseUrl}/api/onboarding/save-progress`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (getResponse.ok) {
      const data = await getResponse.json()
      console.log('  ✅ Progress retrieved successfully')
      console.log('  Current step:', data.currentStep || 0)
      console.log('  Completed:', data.completed || false)
      console.log('  Steps saved:', data.steps?.length || 0)
    } else {
      const error = await getResponse.text()
      console.log('  ❌ Failed to get progress:', error)
    }
  } catch (error) {
    console.log('  ❌ API Error:', error.message)
  }
  
  // Test 3: Complete Onboarding API
  console.log('\n3️⃣ Testing Complete Onboarding API...')
  try {
    const completeResponse = await fetch(`${baseUrl}/api/onboarding/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        onboardingData: testData
      })
    })
    
    const result = await completeResponse.json()
    
    if (completeResponse.ok && result.success) {
      console.log('  ✅ Onboarding completed successfully!')
      console.log('  Barbershop ID:', result.barbershopId || 'N/A')
      console.log('  Booking URL:', result.bookingUrl || 'N/A')
      
      if (result.results) {
        console.log('\n  Details:')
        if (result.results.profile) {
          console.log('    ✓ Profile updated')
        }
        if (result.results.barbershop) {
          console.log('    ✓ Barbershop created/updated')
        }
        if (result.results.services) {
          console.log('    ✓ Services added:', result.results.services.length)
        }
      }
    } else {
      console.log('  ⚠️ Onboarding completed with issues')
      console.log('  Message:', result.message)
      
      if (result.results?.errors && result.results.errors.length > 0) {
        console.log('\n  Errors:')
        result.results.errors.forEach(err => {
          console.log(`    - ${err.type}: ${err.error}`)
        })
      }
    }
  } catch (error) {
    console.log('  ❌ API Error:', error.message)
  }
  
  console.log('\n✨ Onboarding Flow Test Complete')
  console.log('\n📝 Next Steps:')
  console.log('1. Run the SQL migration in Supabase Dashboard')
  console.log('2. Test the welcome page at http://localhost:9999/welcome')
  console.log('3. Complete the onboarding flow with real authentication')
}

// Run the test
testOnboardingFlow().catch(console.error)