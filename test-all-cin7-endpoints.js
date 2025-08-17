// Comprehensive test to find what endpoints work with these API keys
const fetch = require('node-fetch');

async function testAllEndpoints() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('Testing ALL CIN7 Endpoints to Find What Works');
  console.log('==============================================\n');
  
  // Test every possible endpoint from CIN7 documentation
  const allEndpoints = [
    // Account endpoints
    { path: '/me', method: 'GET', description: 'Account info' },
    { path: '/Me', method: 'GET', description: 'Account info (capitalized)' },
    
    // Product endpoints
    { path: '/product', method: 'GET', description: 'Products (singular)' },
    { path: '/products', method: 'GET', description: 'Products list' },
    { path: '/Products', method: 'GET', description: 'Products (capitalized)' },
    { path: '/product/families', method: 'GET', description: 'Product families' },
    { path: '/product/availability', method: 'GET', description: 'Product availability' },
    
    // Inventory endpoints
    { path: '/stock', method: 'GET', description: 'Stock levels' },
    { path: '/Stock', method: 'GET', description: 'Stock (capitalized)' },
    { path: '/stocklevels', method: 'GET', description: 'Stock levels alt' },
    { path: '/StockLevels', method: 'GET', description: 'Stock levels (capitalized)' },
    { path: '/stockadjustment', method: 'GET', description: 'Stock adjustments' },
    { path: '/stocktake', method: 'GET', description: 'Stock take' },
    { path: '/inventory', method: 'GET', description: 'Inventory' },
    { path: '/inventorywrite', method: 'GET', description: 'Inventory write' },
    
    // Customer endpoints
    { path: '/customer', method: 'GET', description: 'Customers' },
    { path: '/Customer', method: 'GET', description: 'Customers (capitalized)' },
    { path: '/customers', method: 'GET', description: 'Customers list' },
    { path: '/Customers', method: 'GET', description: 'Customers (capitalized)' },
    
    // Sales endpoints
    { path: '/sale', method: 'GET', description: 'Sales' },
    { path: '/Sale', method: 'GET', description: 'Sales (capitalized)' },
    { path: '/salelist', method: 'GET', description: 'Sales list' },
    { path: '/SaleList', method: 'GET', description: 'Sales list (capitalized)' },
    { path: '/sale/invoice', method: 'GET', description: 'Sales invoices' },
    { path: '/sale/order', method: 'GET', description: 'Sales orders' },
    { path: '/sale/quote', method: 'GET', description: 'Sales quotes' },
    
    // Purchase endpoints
    { path: '/purchase', method: 'GET', description: 'Purchases' },
    { path: '/Purchase', method: 'GET', description: 'Purchases (capitalized)' },
    { path: '/purchaselist', method: 'GET', description: 'Purchase list' },
    { path: '/PurchaseList', method: 'GET', description: 'Purchase list (capitalized)' },
    
    // Reference data endpoints
    { path: '/ref/account', method: 'GET', description: 'Chart of accounts' },
    { path: '/ref/attributeset', method: 'GET', description: 'Attribute sets' },
    { path: '/ref/brand', method: 'GET', description: 'Brands' },
    { path: '/ref/carrier', method: 'GET', description: 'Carriers' },
    { path: '/ref/currency', method: 'GET', description: 'Currencies' },
    { path: '/ref/location', method: 'GET', description: 'Locations' },
    { path: '/ref/paymentterm', method: 'GET', description: 'Payment terms' },
    { path: '/ref/pricetier', method: 'GET', description: 'Price tiers' },
    { path: '/ref/taxrule', method: 'GET', description: 'Tax rules' },
    { path: '/ref/unitofmeasure', method: 'GET', description: 'Units of measure' },
    
    // Report endpoints
    { path: '/report/inventory', method: 'GET', description: 'Inventory report' },
    { path: '/report/sales', method: 'GET', description: 'Sales report' },
    { path: '/report/purchases', method: 'GET', description: 'Purchase report' },
    
    // Webhook endpoints (though these likely need automation module)
    { path: '/webhooks', method: 'GET', description: 'List webhooks' },
    { path: '/Webhooks', method: 'GET', description: 'List webhooks (capitalized)' }
  ];
  
  const workingEndpoints = [];
  const limitedEndpoints = [];
  const failedEndpoints = [];
  
  for (const endpoint of allEndpoints) {
    process.stdout.write(`Testing ${endpoint.description.padEnd(30)} `);
    
    try {
      const response = await fetch(`https://inventory.dearsystems.com/ExternalAPI/v2${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'api-auth-accountid': accountId,
          'api-auth-applicationkey': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        redirect: 'manual' // Don't follow redirects
      });
      
      if (response.status === 200) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE')) {
          process.stdout.write(`[302→HTML] Redirects\n`);
          limitedEndpoints.push(endpoint);
        } else {
          try {
            const data = JSON.parse(text);
            process.stdout.write(`✅ WORKS! `);
            if (data.Total !== undefined) {
              process.stdout.write(`(${data.Total} items)`);
            }
            process.stdout.write('\n');
            workingEndpoints.push({ ...endpoint, data });
          } catch (e) {
            process.stdout.write(`[200] Non-JSON response\n`);
            limitedEndpoints.push(endpoint);
          }
        }
      } else if (response.status === 302) {
        process.stdout.write(`[302] Redirects\n`);
        limitedEndpoints.push(endpoint);
      } else if (response.status === 403) {
        const text = await response.text();
        if (text.includes('subscription')) {
          process.stdout.write(`[403] Subscription limit\n`);
        } else {
          process.stdout.write(`[403] Access denied\n`);
        }
        failedEndpoints.push(endpoint);
      } else if (response.status === 404) {
        process.stdout.write(`[404] Not found\n`);
        failedEndpoints.push(endpoint);
      } else {
        process.stdout.write(`[${response.status}] Failed\n`);
        failedEndpoints.push(endpoint);
      }
    } catch (error) {
      process.stdout.write(`[ERROR] ${error.message}\n`);
      failedEndpoints.push(endpoint);
    }
  }
  
  console.log('\n\n========================================');
  console.log('SUMMARY OF WHAT YOUR API KEYS CAN DO:');
  console.log('========================================\n');
  
  if (workingEndpoints.length > 0) {
    console.log(`✅ WORKING ENDPOINTS (${workingEndpoints.length}):`);
    workingEndpoints.forEach(ep => {
      console.log(`   ${ep.path} - ${ep.description}`);
      if (ep.data) {
        console.log(`      Data available:`, Object.keys(ep.data).slice(0, 5).join(', '));
      }
    });
  } else {
    console.log('❌ NO FULLY WORKING ENDPOINTS FOUND');
  }
  
  if (limitedEndpoints.length > 0) {
    console.log(`\n⚠️  PARTIALLY ACCESSIBLE (${limitedEndpoints.length}):`);
    console.log('   These return responses but redirect or give HTML:');
    limitedEndpoints.slice(0, 5).forEach(ep => {
      console.log(`   ${ep.path} - ${ep.description}`);
    });
  }
  
  console.log(`\n❌ BLOCKED ENDPOINTS: ${failedEndpoints.length}`);
  
  console.log('\n\nCONCLUSION:');
  console.log('===========');
  
  if (workingEndpoints.length === 0) {
    console.log('Your API keys have NO practical access to CIN7 data.');
    console.log('They are recognized as valid but have no permissions.');
    console.log('');
    console.log('This is likely because:');
    console.log('1. Your subscription tier doesn\'t include external API access');
    console.log('2. The API application needs additional permissions enabled');
    console.log('3. External API access requires a separate add-on purchase');
    console.log('');
    console.log('RECOMMENDATION:');
    console.log('Contact CIN7 support and specifically ask:');
    console.log('"What do I need to purchase to enable external API access?"');
    console.log('"My API keys are valid but return 403 for all endpoints"');
  } else {
    console.log(`Your API keys can access ${workingEndpoints.length} endpoints.`);
    console.log('You have LIMITED read-only access to some data.');
  }
}

testAllEndpoints();