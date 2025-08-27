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
  
  );

  try {
    // Step 1: Get current staff list
    
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

    // Step 2: Update the name
    const newFirstName = 'Test';
    const newLastName = 'User_' + Math.floor(Math.random() * 10000);

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

    // Step 3: Verify the update persisted

    // Wait a moment for database to update
    await new Promise(resolve => setTimeout(resolve, 500));

    const verifyResponse = await fetch('/api/staff');
    const verifyData = await verifyResponse.json();

    const updatedStaff = verifyData.staff?.find(s => s.id === testStaff.id);

    if (updatedStaff) {

      // Check if the update actually persisted
      if (updatedStaff.first_name === newFirstName && updatedStaff.last_name === newLastName) {

        // Refresh page to show the change in UI
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        console.warn('⚠️ Name did not update as expected');

      }
    } else {
      console.error('❌ Could not find staff member after update');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  );
  
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

 to see all staff members in a table');