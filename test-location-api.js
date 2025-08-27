import dotenv from 'dotenv';
dotenv.config();

async function testLocationCreation() {
  try {

    // Test without auth (should return 401)
    
    const response1 = await fetch('http://localhost:9999/api/locations/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Location',
        address: '123 Test St'
      })
    });
    
    const result1 = await response1.json();
    
    }\n`);
    
    // Check if we get the expected enterprise upgrade response
    if (response1.status === 403 && result1.requiresUpgrade) {

    } else if (response1.status === 401) {
      ');
      
    }
    
  } catch (error) {
    console.error('Error testing location API:', error);
  }
  
  process.exit(0);
}

testLocationCreation();
