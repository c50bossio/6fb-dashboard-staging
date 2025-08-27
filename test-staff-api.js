// Test staff API endpoints
async function testStaffAPI() {
    const baseUrl = 'http://localhost:9999';
    
    console.log('🔍 Testing Staff API Endpoints...\n');
    
    // Test 1: Get staff list
    console.log('1️⃣ Getting staff list...');
    try {
        const listResponse = await fetch(`${baseUrl}/api/staff`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (listResponse.status === 401) {
            console.log('❌ Authentication required. Please test through browser with logged-in session.');
            console.log('📝 Open http://localhost:9999/test-staff-update.html in browser');
            return;
        }
        
        const listData = await listResponse.json();
        console.log(`✅ Staff list retrieved: ${listData.staff?.length || 0} members`);
        
        // Find unnamed staff
        const unnamedStaff = listData.staff?.find(s => 
            (!s.full_name || s.full_name.trim() === '') &&
            (!s.first_name || s.first_name.trim() === '')
        );
        
        if (unnamedStaff) {
            console.log(`\n📋 Found unnamed staff: ${unnamedStaff.email || 'no-email'}`);
            console.log(`   ID: ${unnamedStaff.user_id || unnamedStaff.id}`);
            
            // Test 2: Update unnamed staff
            console.log('\n2️⃣ Testing update endpoint...');
            const updateId = unnamedStaff.user_id || unnamedStaff.id;
            
            const updateResponse = await fetch(`${baseUrl}/api/staff/${updateId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: 'Test',
                    last_name: 'Update',
                    full_name: 'Test Update'
                })
            });
            
            if (updateResponse.ok) {
                const updateData = await updateResponse.json();
                console.log('✅ Update successful:', updateData.message);
            } else {
                const errorData = await updateResponse.json();
                console.log(`❌ Update failed: ${updateResponse.status}`, errorData);
            }
        } else {
            console.log('ℹ️ No unnamed staff found to test updates');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
    
    console.log('\n📝 For authenticated testing, open: http://localhost:9999/test-staff-update.html');
}

// Run test
testStaffAPI();