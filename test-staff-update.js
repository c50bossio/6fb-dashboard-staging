#!/usr/bin/env node

/**
 * Test script for staff name editing functionality
 * Run with: node test-staff-update.js
 */

const testStaffUpdate = async () => {
  console.log('🧪 Testing Staff Update Functionality\n');
  console.log('='.'='.repeat(40));

  // Test configuration
  const API_BASE = 'http://localhost:3000/api';
  const TEST_USER_ID = '1e8e9073-2e7d-4b07-b7ff-3e893bef3a67'; // Replace with actual user_id from your database
  const TEST_NAME = `Test User ${Date.now()}`;

  console.log('📍 Test Configuration:');
  console.log(`   API Base: ${API_BASE}`);
  console.log(`   User ID: ${TEST_USER_ID}`);
  console.log(`   Test Name: ${TEST_NAME}\n`);

  try {
    // Step 1: Test the PATCH endpoint
    console.log('1️⃣ Testing PATCH /api/staff/[staffId]');
    console.log('   Sending name update request...');

    const updateResponse = await fetch(`${API_BASE}/staff/${TEST_USER_ID}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'YOUR_AUTH_COOKIE_HERE' // You'll need to add auth cookie from browser
      },
      body: JSON.stringify({
        first_name: 'Test',
        last_name: `User ${Date.now()}`
      })
    });

    const updateResult = await updateResponse.json();
    
    if (updateResponse.ok) {
      console.log('   ✅ Update successful!');
      console.log('   Response:', JSON.stringify(updateResult, null, 2));
    } else {
      console.error('   ❌ Update failed!');
      console.error('   Status:', updateResponse.status);
      console.error('   Error:', updateResult);
      process.exit(1);
    }

    // Step 2: Verify the update by fetching staff list
    console.log('\n2️⃣ Verifying update via GET /api/staff');
    console.log('   Fetching staff list...');

    const listResponse = await fetch(`${API_BASE}/staff`, {
      headers: {
        'Cookie': 'YOUR_AUTH_COOKIE_HERE' // Same auth cookie
      }
    });

    const listResult = await listResponse.json();

    if (listResponse.ok) {
      const updatedStaff = listResult.staff?.find(s => s.id === TEST_USER_ID || s.user_id === TEST_USER_ID);
      
      if (updatedStaff) {
        console.log('   ✅ Staff found in list!');
        console.log('   Current name data:');
        console.log(`     - display_name: ${updatedStaff.display_name}`);
        console.log(`     - full_name: ${updatedStaff.full_name}`);
        console.log(`     - first_name: ${updatedStaff.first_name}`);
        console.log(`     - last_name: ${updatedStaff.last_name}`);
        
        // Check if name persisted
        if (updatedStaff.first_name === 'Test') {
          console.log('\n   🎉 SUCCESS: Name update persisted!');
        } else {
          console.log('\n   ⚠️ WARNING: Name may not have persisted correctly');
        }
      } else {
        console.error('   ❌ Staff member not found in list!');
      }
    } else {
      console.error('   ❌ Failed to fetch staff list!');
      console.error('   Error:', listResult);
    }

    console.log('\n' + '='.repeat(40));
    console.log('🧪 Test Complete\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
};

// Instructions for manual testing
console.log(`
📝 Manual Testing Instructions:
================================

1. First, get your authentication cookie:
   - Open Chrome DevTools (F12)
   - Go to Application → Cookies
   - Find the auth cookie (usually starts with "sb-")
   - Copy the entire cookie string

2. Update this script:
   - Replace YOUR_AUTH_COOKIE_HERE with your actual cookie
   - Replace TEST_USER_ID with a real user ID from your staff

3. Run the test:
   node test-staff-update.js

4. Verify in the UI:
   - Open the staff management page
   - Find the staff member you updated
   - Confirm the name shows correctly
   - Refresh the page to ensure it persists

For testing in the browser console instead:
============================================
`);

console.log(`
// Copy and paste this into your browser console while on the staff management page:

async function testStaffUpdate() {
  const userId = 'YOUR_USER_ID_HERE'; // Replace with actual user ID
  
  console.log('Testing staff update...');
  
  const response = await fetch(\`/api/staff/\${userId}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Updated',
      last_name: 'Name ' + Date.now()
    })
  });
  
  const result = await response.json();
  console.log('Update result:', result);
  
  // Refresh the staff list to see if it persisted
  window.location.reload();
}

testStaffUpdate();
`);

// Uncomment to run the test automatically (after adding auth)
// testStaffUpdate();