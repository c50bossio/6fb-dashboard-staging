// Test CIN7 Accounting and Financial endpoints based on API Explorer
const fetch = require('node-fetch');

async function testAccountingEndpoints() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing CIN7 Accounting & Financial Endpoints');
  console.log('==============================================\n');
  console.log('Based on your API Explorer showing AccountBank endpoint...\n');
  
  // Test accounting/financial endpoints that might be accessible
  const accountingEndpoints = [
    { path: '/accountbank', description: 'Account Bank (from your screenshot)' },
    { path: '/AccountBank', description: 'Account Bank (capitalized)' },
    { path: '/account', description: 'Chart of Accounts' },
    { path: '/Account', description: 'Chart of Accounts (capitalized)' },
    { path: '/ref/account', description: 'Reference Accounts' },
    { path: '/ref/Account', description: 'Reference Accounts (capitalized)' },
    { path: '/ref/currency', description: 'Currencies' },
    { path: '/ref/Currency', description: 'Currencies (capitalized)' },
    { path: '/ref/paymentterm', description: 'Payment Terms' },
    { path: '/ref/PaymentTerm', description: 'Payment Terms (capitalized)' },
    { path: '/ref/taxrule', description: 'Tax Rules' },
    { path: '/ref/TaxRule', description: 'Tax Rules (capitalized)' },
    { path: '/financials', description: 'Financial Data' },
    { path: '/Financials', description: 'Financial Data (capitalized)' }
  ];
  
  const workingEndpoints = [];
  const failedEndpoints = [];
  
  for (const endpoint of accountingEndpoints) {
    process.stdout.write(`Testing ${endpoint.description.padEnd(35)} `);
    
    try {
      // Test both URL formats
      const urls = [
        `https://inventory.dearsystems.com/ExternalAPI/v2${endpoint.path}`,
        `https://inventory.dearsystems.com/ExternalAPIs/v2${endpoint.path}`
      ];
      
      let success = false;
      
      for (const url of urls) {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'api-auth-accountid': accountId,
            'api-auth-applicationkey': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          redirect: 'manual'
        });
        
        if (response.status === 200) {
          const text = await response.text();
          
          // Check if it's actual JSON data
          if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
            try {
              const data = JSON.parse(text);
              process.stdout.write(`✅ WORKS! `);
              
              // Show data summary
              if (data.Total !== undefined) {
                process.stdout.write(`(${data.Total} items)`);
              } else if (Array.isArray(data)) {
                process.stdout.write(`(${data.length} items)`);
              } else if (data.Company) {
                process.stdout.write(`(Company: ${data.Company})`);
              } else {
                process.stdout.write(`(${Object.keys(data).length} fields)`);
              }
              
              process.stdout.write('\\n');
              workingEndpoints.push({ ...endpoint, data, url });
              success = true;
              break;
              
            } catch (e) {
              // Not valid JSON
            }
          }
        }
      }
      
      if (!success) {
        process.stdout.write(`❌ Failed\\n`);
        failedEndpoints.push(endpoint);
      }
      
    } catch (error) {
      process.stdout.write(`❌ Error: ${error.message}\\n`);
      failedEndpoints.push(endpoint);
    }
  }
  
  console.log('\\n\\n========================================');
  console.log('WORKING ACCOUNTING ENDPOINTS:');
  console.log('========================================\\n');
  
  if (workingEndpoints.length > 0) {
    workingEndpoints.forEach(ep => {
      console.log(`✅ ${ep.description}`);
      console.log(`   URL: ${ep.url}`);
      
      if (ep.data) {
        console.log(`   Data keys: ${Object.keys(ep.data).slice(0, 5).join(', ')}`);
        
        // Show sample data
        if (ep.data.Total !== undefined) {
          console.log(`   Total records: ${ep.data.Total}`);
        }
        if (Array.isArray(ep.data) && ep.data.length > 0) {
          console.log(`   First item keys: ${Object.keys(ep.data[0]).slice(0, 3).join(', ')}`);
        }
      }
      console.log('');
    });
    
    console.log('\\n🎉 SUCCESS! You have access to accounting data!');
    console.log('\\nNEXT STEPS:');
    console.log('1. Use these working endpoints for financial integration');
    console.log('2. Test if you can access Products, Customers, and Inventory');
    console.log('3. Build integration around the working endpoints');
    
  } else {
    console.log('❌ No accounting endpoints are accessible.');
    console.log('\\nThis confirms your API keys lack external access permissions.');
    console.log('\\nRECOMMENDATION:');
    console.log('Contact CIN7 support to upgrade your subscription for External API Access.');
  }
  
  // Test core business endpoints too
  console.log('\\n\\n========================================');
  console.log('Testing Core Business Endpoints:');
  console.log('========================================\\n');
  
  const coreEndpoints = [
    '/products',
    '/Products', 
    '/customers',
    '/Customers',
    '/stock',
    '/Stock',
    '/me',
    '/Me'
  ];
  
  let coreWorking = 0;
  
  for (const endpoint of coreEndpoints) {
    try {
      const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2${endpoint}`, {
        method: 'GET',
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          console.log(`✅ ${endpoint} - WORKS!`);
          coreWorking++;
        } else {
          console.log(`❌ ${endpoint} - Returns HTML`);
        }
      } else {
        console.log(`❌ ${endpoint} - Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error`);
    }
  }
  
  console.log(`\\nCore endpoints working: ${coreWorking} / ${coreEndpoints.length}`);
  
  if (coreWorking > 0) {
    console.log('\\n🚀 BREAKTHROUGH! Some core endpoints work!');
    console.log('Your API keys DO have some external access!');
  }
}

testAccountingEndpoints();