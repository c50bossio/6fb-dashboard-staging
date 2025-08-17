#!/usr/bin/env node

const API_BASE = 'http://localhost:9999/api';

async function testOnboardingNavigation() {
  console.log('🧪 Testing Onboarding Navigation\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Get current progress
    console.log('\n1. Getting current onboarding progress...');
    const progressResponse = await fetch(`${API_BASE}/onboarding/save-progress`);
    const progressData = await progressResponse.json();
    
    console.log('   Current Progress:');
    console.log(`   - Stored Step: ${progressData.storedStep}`);
    console.log(`   - Calculated Step: ${progressData.calculatedStep}`);
    console.log(`   - Current Step: ${progressData.currentStep}`);
    console.log(`   - Completed Steps: ${progressData.steps?.length || 0}`);
    
    // Test 2: Check step mapping
    const stepOrder = ['business', 'schedule', 'services', 'staff', 'financial', 'booking', 'branding'];
    console.log('\n2. Step progression:');
    stepOrder.forEach((step, index) => {
      const isCompleted = progressData.steps?.some(s => s.step_name === step);
      const status = isCompleted ? '✅' : (index === progressData.currentStep ? '👉' : '⏸️');
      console.log(`   ${status} ${index}: ${step}`);
    });
    
    // Test 3: Simulate step save
    const currentStepName = stepOrder[progressData.currentStep];
    if (currentStepName) {
      console.log(`\n3. Simulating save for step: ${currentStepName}...`);
      const saveResponse = await fetch(`${API_BASE}/onboarding/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          step: currentStepName,
          stepData: {
            test: true,
            timestamp: new Date().toISOString()
          }
        })
      });
      
      if (saveResponse.ok) {
        console.log('   ✅ Step save successful');
        
        // Get updated progress
        const updatedResponse = await fetch(`${API_BASE}/onboarding/save-progress`);
        const updatedData = await updatedResponse.json();
        console.log(`   - New Current Step: ${updatedData.currentStep}`);
        console.log(`   - New Calculated Step: ${updatedData.calculatedStep}`);
      } else {
        console.log('   ❌ Step save failed');
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ Navigation test complete!');
    console.log('\nNext steps:');
    console.log('1. Click "Next" button in onboarding should now work');
    console.log('2. Steps should advance properly through the sequence');
    console.log('3. Progress should persist correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOnboardingNavigation();