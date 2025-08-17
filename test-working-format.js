// Test CIN7 with exact format that should work
const fetch = require('node-fetch');

async function testWorkingFormat() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 Testing CIN7 with different request formats...');
  console.log('================================================');
  
  // Test different combinations
  const tests = [
    {
      name: 'No trailing slash, no params',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/Products'
    },
    {
      name: 'With trailing slash',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/Products/'
    },
    {
      name: 'With required params',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/Products?Page=1&Limit=10'
    },
    {
      name: 'Lowercase params',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/Products?page=1&limit=10'
    },
    {
      name: 'Without limit',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v1/Products?Page=1'
    },
    {
      name: 'V2 with different case',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/Products?Page=1&Limit=10'
    },
    {
      name: 'V2 products lowercase',
      url: 'https://inventory.dearsystems.com/ExternalAPI/v2/products?page=1&limit=10'
    },
    {
      name: 'Without version',
      url: 'https://inventory.dearsystems.com/ExternalAPI/Products?Page=1'
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📡 ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const response = await fetch(test.url, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        redirect: 'manual' // Don't follow redirects
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 302 || response.status === 301) {
        console.log(`   ❌ Redirect to: ${response.headers.get('location')}`);
      } else if (response.status === 200) {
        console.log('   ✅ SUCCESS! This format works!');
        
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          console.log(`   Total products: ${data.Total || 0}`);
          console.log(`   Products in response: ${data.Products?.length || 0}`);
          
          if (data.Products && data.Products.length > 0) {
            console.log(`   First product: ${data.Products[0].Name}`);
          }
          
          console.log('\n🎉 FOUND WORKING ENDPOINT!');
          console.log('================================');
          return;
        } catch (e) {
          console.log('   Response not JSON:', text.substring(0, 100));
        }
      } else if (response.status === 403) {
        const text = await response.text();
        console.log(`   ❌ 403: ${text}`);
      } else if (response.status === 401) {
        console.log('   ❌ 401 Unauthorized');
      } else {
        console.log(`   ❓ Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n\n📝 Additional debugging:');
  console.log('============================');
  console.log('If this worked before, check:');
  console.log('1. Has the API key been regenerated since it last worked?');
  console.log('2. Has the account been migrated or changed?');
  console.log('3. Were you using different credentials before?');
}

testWorkingFormat();