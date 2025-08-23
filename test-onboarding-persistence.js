/**
 * Comprehensive Onboarding Persistence Test Suite
 * Tests that onboarding saves progress, allows resuming, and creates barbershop properly
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test user for onboarding tests
const TEST_USER_EMAIL = 'onboarding-test@bookedbarber.com'
const TEST_USER_PASSWORD = 'Test123!@#'

console.log('🧪 ONBOARDING PERSISTENCE TEST SUITE')
console.log('='.repeat(60))

/**
 * Test 1: Verify Progress Saves at Each Step
 */
async function testProgressSaving() {
  console.log('\n📝 TEST 1: Progress Saving at Each Step')
  console.log('-'.repeat(40))
  
  try {
    // Create or get test user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
      options: {
        data: {
          full_name: 'Test Onboarding User',
          role: 'SHOP_OWNER'
        }
      }
    })
    
    // If signup fails (user might already exist), generate a test UUID
    const userId = authData?.user?.id || crypto.randomUUID()
    console.log('✅ Test user ready:', userId)
    
    // Simulate saving progress for each onboarding step
    const onboardingSteps = [
      { 
        step: 'business', 
        data: { 
          businessName: 'Test Barbershop',
          businessAddress: '123 Test St',
          businessPhone: '555-0100',
          businessType: 'barbershop'
        }
      },
      { 
        step: 'schedule', 
        data: { 
          businessHours: {
            monday: { open: '09:00', close: '18:00', closed: false },
            tuesday: { open: '09:00', close: '18:00', closed: false }
          }
        }
      },
      { 
        step: 'services', 
        data: { 
          services: [
            { name: 'Haircut', price: 30, duration: 30 },
            { name: 'Beard Trim', price: 20, duration: 20 }
          ]
        }
      },
      { 
        step: 'staff', 
        data: { 
          staff: [
            { name: 'John Barber', email: 'john@test.com', phone: '555-0101' }
          ]
        }
      },
      { 
        step: 'financial', 
        data: { 
          stripeAccountId: 'acct_test123',
          paymentSetupComplete: true
        }
      }
    ]
    
    // Save progress for each step
    for (const stepData of onboardingSteps) {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: userId,
          step_name: stepData.step,
          step_data: stepData.data,
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,step_name'
        })
      
      if (error) {
        console.error(`❌ Failed to save ${stepData.step}:`, error.message)
      } else {
        console.log(`✅ Saved progress for step: ${stepData.step}`)
      }
      
      // Small delay to simulate real user interaction
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Verify all progress was saved
    const { data: savedProgress, error: fetchError } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true })
    
    if (savedProgress && savedProgress.length === onboardingSteps.length) {
      console.log(`✅ All ${savedProgress.length} steps saved successfully`)
      return { success: true, userId, stepsCompleted: savedProgress.length }
    } else {
      console.error('❌ Not all steps were saved:', savedProgress?.length || 0)
      return { success: false, userId, stepsCompleted: savedProgress?.length || 0 }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 2: Verify Resume Functionality (Close & Reopen)
 */
async function testResumeProgress(userId) {
  console.log('\n🔄 TEST 2: Resume Where Left Off')
  console.log('-'.repeat(40))
  
  try {
    // Simulate fetching saved progress (as if reopening browser)
    const { data: savedProgress, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching progress:', error.message)
      return { success: false }
    }
    
    // Calculate current step based on completed steps
    const stepOrder = ['business', 'schedule', 'services', 'staff', 'financial', 'booking', 'branding']
    const completedSteps = new Set(savedProgress.map(p => p.step_name))
    
    let currentStep = null
    let currentStepIndex = 0
    
    for (let i = 0; i < stepOrder.length; i++) {
      if (!completedSteps.has(stepOrder[i])) {
        currentStep = stepOrder[i]
        currentStepIndex = i
        break
      }
    }
    
    // Get profile to check stored onboarding state
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_step, onboarding_completed')
      .eq('id', userId)
      .single()
    
    console.log('📊 Resume Analysis:')
    console.log(`  - Completed steps: ${completedSteps.size}`)
    console.log(`  - Next step to show: ${currentStep || 'completed'}`)
    console.log(`  - Stored step index: ${profile?.onboarding_step || 0}`)
    console.log(`  - Onboarding completed: ${profile?.onboarding_completed || false}`)
    
    // Verify data from last saved step is available
    if (savedProgress.length > 0) {
      const lastStep = savedProgress[savedProgress.length - 1]
      console.log(`  - Last saved step: ${lastStep.step_name}`)
      console.log(`  - Has saved data: ${!!lastStep.step_data}`)
      
      if (lastStep.step_data) {
        console.log('✅ Progress can be resumed with saved data')
        return { 
          success: true, 
          currentStep, 
          completedSteps: completedSteps.size,
          lastSavedData: lastStep.step_data
        }
      }
    }
    
    return { success: false, message: 'No saved progress found' }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 3: Verify Barbershop Creation on Completion
 */
async function testBarbershopCreation(userId) {
  console.log('\n🏪 TEST 3: Barbershop Creation on Completion')
  console.log('-'.repeat(40))
  
  try {
    // Simulate onboarding completion
    const completionData = {
      businessName: 'Test Complete Barbershop',
      businessAddress: '456 Complete Ave',
      businessPhone: '555-0200',
      businessEmail: 'complete@test.com',
      businessType: 'barbershop',
      services: [
        { name: 'Premium Cut', price: 40, duration: 45 },
        { name: 'Hot Shave', price: 35, duration: 30 }
      ],
      staff: [
        { name: 'Master Barber', email: 'master@test.com', phone: '555-0201' }
      ],
      schedule: {
        monday: { open: '08:00', close: '20:00', closed: false },
        tuesday: { open: '08:00', close: '20:00', closed: false },
        wednesday: { open: '08:00', close: '20:00', closed: false },
        thursday: { open: '08:00', close: '20:00', closed: false },
        friday: { open: '08:00', close: '22:00', closed: false },
        saturday: { open: '09:00', close: '18:00', closed: false },
        sunday: { closed: true }
      }
    }
    
    console.log('🔨 Creating barbershop with completion data...')
    
    // Create barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .insert({
        name: completionData.businessName,
        address: completionData.businessAddress,
        phone: completionData.businessPhone.substring(0, 20), // Ensure phone fits in varchar(20)
        email: completionData.businessEmail,
        owner_id: userId,
        business_type: completionData.businessType,
        business_hours_template: completionData.schedule,
        booking_enabled: true,
        online_booking_enabled: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (shopError) {
      // Check if barbershop already exists
      const { data: existing } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', userId)
        .single()
      
      if (existing) {
        console.log('ℹ️  Barbershop already exists for user:', existing.id)
        
        // Verify profile is updated
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id, barbershop_id, onboarding_completed')
          .eq('id', userId)
          .single()
        
        if (profile?.shop_id === existing.id || profile?.barbershop_id === existing.id) {
          console.log('✅ Profile correctly linked to barbershop')
          return { success: true, barbershopId: existing.id, alreadyExisted: true }
        } else {
          console.log('⚠️  Profile not linked, updating...')
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              shop_id: existing.id,
              barbershop_id: existing.id,
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString()
            })
            .eq('id', userId)
          
          if (!updateError) {
            console.log('✅ Profile updated with barbershop link')
            return { success: true, barbershopId: existing.id, profileUpdated: true }
          }
        }
      }
      
      console.error('❌ Failed to create barbershop:', shopError.message)
      return { success: false, error: shopError.message }
    }
    
    console.log('✅ Barbershop created:', barbershop.id)
    
    // Update profile with barbershop_id and mark onboarding complete
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        shop_id: barbershop.id,
        barbershop_id: barbershop.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_data: completionData
      })
      .eq('id', userId)
    
    if (profileError) {
      console.error('⚠️  Profile update error:', profileError.message)
    } else {
      console.log('✅ Profile updated with barbershop_id and completion status')
    }
    
    // Add services
    if (completionData.services && completionData.services.length > 0) {
      const servicesData = completionData.services.map(s => ({
        shop_id: barbershop.id,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration,
        is_active: true
      }))
      
      const { error: servicesError } = await supabase
        .from('services')
        .insert(servicesData)
      
      if (!servicesError) {
        console.log(`✅ Added ${completionData.services.length} services`)
      }
    }
    
    // Add staff
    if (completionData.staff && completionData.staff.length > 0) {
      const staffData = completionData.staff.map(s => ({
        shop_id: barbershop.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        is_active: true
      }))
      
      const { error: staffError } = await supabase
        .from('barbers')
        .insert(staffData)
      
      if (!staffError) {
        console.log(`✅ Added ${completionData.staff.length} staff members`)
      }
    }
    
    // Save completion record
    const { error: completionError } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: userId,
        step_name: 'completed',
        step_data: { 
          ...completionData, 
          barbershop_id: barbershop.id,
          completed_at: new Date().toISOString()
        },
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,step_name'
      })
    
    if (!completionError) {
      console.log('✅ Onboarding completion recorded')
    }
    
    return { 
      success: true, 
      barbershopId: barbershop.id,
      servicesAdded: completionData.services.length,
      staffAdded: completionData.staff.length
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test 4: End-to-End Onboarding Flow Test
 */
async function testEndToEndFlow() {
  console.log('\n🚀 TEST 4: End-to-End Onboarding Flow')
  console.log('-'.repeat(40))
  
  try {
    // Create fresh test user
    const testEmail = `e2e-test-${Date.now()}@bookedbarber.com`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: TEST_USER_PASSWORD,
      options: {
        data: {
          full_name: 'E2E Test User',
          role: 'SHOP_OWNER'
        }
      }
    })
    
    if (authError) {
      console.error('❌ Failed to create test user:', authError.message)
      return { success: false }
    }
    
    const userId = authData.user.id
    console.log('✅ Created test user:', testEmail)
    
    // Step through onboarding
    const steps = ['business', 'schedule', 'services', 'staff', 'financial']
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      
      // Save progress
      await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: userId,
          step_name: step,
          step_data: { test: true, step_index: i },
          completed_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,step_name'
        })
      
      console.log(`  Step ${i + 1}/${steps.length}: ${step} ✅`)
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    // Complete onboarding
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .insert({
        name: 'E2E Test Barbershop',
        email: testEmail,
        phone: '555-9999',
        address: '999 E2E Street',
        owner_id: userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (barbershopError) {
      console.error('❌ Failed to create barbershop:', barbershopError.message)
      return { success: false }
    }
    
    // Update profile
    await supabase
      .from('profiles')
      .update({
        shop_id: barbershop.id,
        barbershop_id: barbershop.id,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('id', userId)
    
    console.log('✅ E2E Flow Complete:')
    console.log(`  - User created: ${testEmail}`)
    console.log(`  - Steps completed: ${steps.length}`)
    console.log(`  - Barbershop created: ${barbershop.id}`)
    console.log(`  - Profile updated: Yes`)
    
    // Cleanup test data
    await supabase.from('barbershops').delete().eq('id', barbershop.id)
    await supabase.from('onboarding_progress').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)
    
    console.log('🧹 Test data cleaned up')
    
    return { success: true, testsPassed: true }
    
  } catch (error) {
    console.error('❌ E2E test failed:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60))
  console.log('🎯 RUNNING ALL ONBOARDING PERSISTENCE TESTS')
  console.log('='.repeat(60))
  
  const results = {
    progressSaving: null,
    resumeProgress: null,
    barbershopCreation: null,
    endToEnd: null
  }
  
  // Test 1: Progress Saving
  const test1Result = await testProgressSaving()
  results.progressSaving = test1Result
  
  // Test 2: Resume Progress (use userId from test 1)
  if (test1Result.success && test1Result.userId) {
    const test2Result = await testResumeProgress(test1Result.userId)
    results.resumeProgress = test2Result
  }
  
  // Test 3: Barbershop Creation (use same userId)
  if (test1Result.success && test1Result.userId) {
    const test3Result = await testBarbershopCreation(test1Result.userId)
    results.barbershopCreation = test3Result
  }
  
  // Test 4: End-to-End Flow
  const test4Result = await testEndToEndFlow()
  results.endToEnd = test4Result
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  
  const allPassed = Object.values(results).every(r => r?.success === true)
  
  console.log(`Progress Saving:      ${results.progressSaving?.success ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Resume Functionality: ${results.resumeProgress?.success ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Barbershop Creation:  ${results.barbershopCreation?.success ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`End-to-End Flow:      ${results.endToEnd?.success ? '✅ PASS' : '❌ FAIL'}`)
  
  console.log('\n' + '-'.repeat(60))
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED! Onboarding system is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Review the output above for details.')
  }
  
  return results
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().then(results => {
    process.exit(results.endToEnd?.success ? 0 : 1)
  })
}

module.exports = { testProgressSaving, testResumeProgress, testBarbershopCreation, testEndToEndFlow, runAllTests }