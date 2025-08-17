// Test different account ID variations
const fetch = require('node-fetch');

async function testAccountVariations() {
  const apiKey = process.argv[2];
  
  if (!apiKey) {
    console.log('❌ Please provide your API key:');
    console.log('   node test-account-variations.js YOUR_API_KEY');
    process.exit(1);
  }
  
  console.log('🔍 Testing Account ID variations...');
  console.log('=====================================\n');
  
  // Different possible account ID formats
  const accountVariations = [
    {
      name: 'UUID format (from screenshot)',
      id: '1fd319f3-0a8b-4314-bb82-603f47fe20e9'
    },
    {
      name: 'Uppercase UUID',
      id: '1FD319F3-0A8B-4314-BB82-603F47FE20E9'
    },
    {
      name: 'Without dashes',
      id: '1fd319f30a8b4314bb82603f47fe20e9'
    },
    {
      name: 'Just the name',
      id: 'bookedbarber'
    },
    {
      name: 'Name with domain',
      id: 'bookedbarber.com'
    }
  ];
  
  for (const account of accountVariations) {
    console.log(`📡 Testing: ${account.name}`);
    console.log(`   Account ID: ${account.id}`);
    
    try {
      const response = await fetch('https://inventory.dearsystems.com/ExternalAPI/v2/me', {
        method: 'GET',
        headers: {
          'api-auth-accountid': account.id,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS! This account ID format works!');
        const data = await response.json();
        console.log('   Company:', data.Company);
        console.log('\n🎉 Found working account ID:', account.id);
        return;
      } else {
        const text = await response.text();
        console.log('   Response:', text);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('❌ None of the account ID variations worked.');
  console.log('\nPossible issues:');
  console.log('1. API access might not be enabled for your account');
  console.log('2. The API key might not have the right permissions');
  console.log('3. Your CIN7 subscription plan might not include API access');
  console.log('4. There might be IP restrictions on the API');
}

testAccountVariations();