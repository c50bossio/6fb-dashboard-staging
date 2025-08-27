#!/usr/bin/env node

/**
 * Test script for staff name editing functionality
 * Run with: node test-staff-update.js
 */

const testStaffUpdate = async () => {
  
  );

  // Test configuration
  const API_BASE = 'http://localhost:3000/api';
  const TEST_USER_ID = '1e8e9073-2e7d-4b07-b7ff-3e893bef3a67'; // Replace with actual user_id from your database
  const TEST_NAME = `Test User ${Date.now()}`;

  try {
    // Step 1: Test the PATCH endpoint

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
      
      );
    } else {
      console.error('   ❌ Update failed!');
      console.error('   Status:', updateResponse.status);
      console.error('   Error:', updateResult);
      process.exit(1);
    }

    // Step 2: Verify the update by fetching staff list

    const listResponse = await fetch(`${API_BASE}/staff`, {
      headers: {
        'Cookie': 'YOUR_AUTH_COOKIE_HERE' // Same auth cookie
      }
    });

    const listResult = await listResponse.json();

    if (listResponse.ok) {
      const updatedStaff = listResult.staff?.find(s => s.id === TEST_USER_ID || s.user_id === TEST_USER_ID);
      
      if (updatedStaff) {

        // Check if name persisted
        if (updatedStaff.first_name === 'Test') {
          
        } else {
          
        }
      } else {
        console.error('   ❌ Staff member not found in list!');
      }
    } else {
      console.error('   ❌ Failed to fetch staff list!');
      console.error('   Error:', listResult);
    }

    );

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
};

// Instructions for manual testing

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

 {
  const userId = 'YOUR_USER_ID_HERE'; // Replace with actual user ID

  const response = await fetch(\`/api/staff/\${userId}\`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: 'Updated',
      last_name: 'Name ' + Date.now()
    })
  });
  
  const result = await response.json();

  // Refresh the staff list to see if it persisted
  window.location.reload();
}

testStaffUpdate();
`);

// Uncomment to run the test automatically (after adding auth)
// testStaffUpdate();