/**
 * Browser Console Test for Staff Name Editing
 * 
 * Instructions:
 * 1. Open your app in Chrome
 * 2. Go to the Staff Management page
 * 3. Open DevTools Console (F12)
 * 4. Copy and paste this entire script
 * 5. Watch the console output
 */

// Find a staff member to test with (preferably the unnamed one)
async function testStaffNameUpdate() {
  console.clear();
  console.log('%c🧪 Staff Name Update Test', 'font-size: 20px; color: #4CAF50; font-weight: bold');
  console.log('='.repeat(50));

  try {
    // Step 1: Get current staff list
    console.log('\n📋 Step 1: Fetching current staff list...');
    const listResponse = await fetch('/api/staff');
    const staffData = await listResponse.json();
    
    if (!staffData.success || !staffData.staff?.length) {
      console.error('❌ No staff found or error fetching staff');
      return;
    }

    // Find the unnamed staff member or first staff
    const testStaff = staffData.staff.find(s => 
      !s.first_name || 
      s.first_name === 'Unknown' || 
      s.display_name === 'Unknown User'
    ) || staffData.staff[0];

    console.log('✅ Found staff member to test:');
    console.log(`   ID: ${testStaff.id}`);
    console.log(`   Current Name: ${testStaff.display_name}`);
    console.log(`   First Name: ${testStaff.first_name || 'None'}`);
    console.log(`   Last Name: ${testStaff.last_name || 'None'}`);

    // Step 2: Update the name
    const newFirstName = 'Test';
    const newLastName = 'User_' + Math.floor(Math.random() * 10000);
    
    console.log('\n✏️ Step 2: Updating staff name...');
    console.log(`   New Name: ${newFirstName} ${newLastName}`);

    const updateResponse = await fetch(`/api/staff/${testStaff.id}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: newFirstName,
        last_name: newLastName
      })
    });

    const updateResult = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('❌ Update failed:', updateResult);
      return;
    }

    console.log('✅ Update response received:', updateResult.success ? 'Success' : 'Failed');

    // Step 3: Verify the update persisted
    console.log('\n🔍 Step 3: Verifying update persisted...');
    
    // Wait a moment for database to update
    await new Promise(resolve => setTimeout(resolve, 500));

    const verifyResponse = await fetch('/api/staff');
    const verifyData = await verifyResponse.json();

    const updatedStaff = verifyData.staff?.find(s => s.id === testStaff.id);

    if (updatedStaff) {
      console.log('✅ Found updated staff member:');
      console.log(`   Display Name: ${updatedStaff.display_name}`);
      console.log(`   First Name: ${updatedStaff.first_name}`);
      console.log(`   Last Name: ${updatedStaff.last_name}`);
      console.log(`   Full Name: ${updatedStaff.full_name}`);

      // Check if the update actually persisted
      if (updatedStaff.first_name === newFirstName && updatedStaff.last_name === newLastName) {
        console.log('\n%c🎉 SUCCESS! Name update persisted correctly!', 'font-size: 16px; color: #4CAF50; font-weight: bold');
        console.log('The page will refresh in 3 seconds to show the updated UI...');
        
        // Refresh page to show the change in UI
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        console.warn('⚠️ Name did not update as expected');
        console.log('Expected:', newFirstName, newLastName);
        console.log('Got:', updatedStaff.first_name, updatedStaff.last_name);
      }
    } else {
      console.error('❌ Could not find staff member after update');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Test complete. Check the UI to confirm visual update.');
}

// Run the test automatically
testStaffNameUpdate();

// Also provide a quick function to check current staff
window.checkStaff = async function() {
  const response = await fetch('/api/staff');
  const data = await response.json();
  console.table(data.staff?.map(s => ({
    id: s.id,
    display_name: s.display_name,
    first_name: s.first_name,
    last_name: s.last_name,
    full_name: s.full_name
  })));
};

console.log('\n💡 TIP: You can also run checkStaff() to see all staff members in a table');