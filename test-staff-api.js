// Test staff API endpoints
async function testStaffAPI() {
    const baseUrl = 'http://localhost:9999';

    // Test 1: Get staff list
    
    try {
        const listResponse = await fetch(`${baseUrl}/api/staff`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (listResponse.status === 401) {

            return;
        }
        
        const listData = await listResponse.json();

        // Find unnamed staff
        const unnamedStaff = listData.staff?.find(s => 
            (!s.full_name || s.full_name.trim() === '') &&
            (!s.first_name || s.first_name.trim() === '')
        );
        
        if (unnamedStaff) {

            // Test 2: Update unnamed staff
            
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
                
            } else {
                const errorData = await updateResponse.json();
                
            }
        } else {
            
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

}

// Run test
testStaffAPI();