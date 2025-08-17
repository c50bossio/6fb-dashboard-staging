// Comprehensive test of ALL CIN7 Core API v2 endpoints
// Based on documentation research and API structure analysis
const fetch = require('node-fetch');

async function testAllCIN7V2Endpoints() {
  const accountId = '1fd319f3-0a8b-4314-bb82-603f47fe20e9';
  const apiKey = '4c9ed612-b13e-5c36-8d71-98e196068b54';
  
  console.log('🔍 COMPREHENSIVE CIN7 CORE API V2 ENDPOINT TEST');
  console.log('===============================================\n');
  console.log('Testing ALL documented V2 endpoints to find what you have access to...\n');
  
  // Complete list of CIN7 Core API v2 endpoints from documentation research
  const allEndpoints = [
    // Authentication & Account
    { path: '/me', method: 'GET', category: 'Account', description: 'Account information' },
    { path: '/Me', method: 'GET', category: 'Account', description: 'Account info (capitalized)' },
    
    // Products & Inventory
    { path: '/product', method: 'GET', category: 'Products', description: 'Product list' },
    { path: '/products', method: 'GET', category: 'Products', description: 'Products (plural)' },
    { path: '/Products', method: 'GET', category: 'Products', description: 'Products (capitalized)' },
    { path: '/Product', method: 'GET', category: 'Products', description: 'Product (capitalized)' },
    { path: '/productfamily', method: 'GET', category: 'Products', description: 'Product families' },
    { path: '/ProductFamily', method: 'GET', category: 'Products', description: 'Product families (cap)' },
    { path: '/productavailability', method: 'GET', category: 'Products', description: 'Product availability' },
    { path: '/ProductAvailability', method: 'GET', category: 'Products', description: 'Product availability (cap)' },
    
    // Stock & Inventory
    { path: '/stock', method: 'GET', category: 'Inventory', description: 'Stock levels' },
    { path: '/Stock', method: 'GET', category: 'Inventory', description: 'Stock (capitalized)' },
    { path: '/stocklevels', method: 'GET', category: 'Inventory', description: 'Stock levels' },
    { path: '/StockLevels', method: 'GET', category: 'Inventory', description: 'Stock levels (cap)' },
    { path: '/stockadjustment', method: 'GET', category: 'Inventory', description: 'Stock adjustments' },
    { path: '/StockAdjustment', method: 'GET', category: 'Inventory', description: 'Stock adjustments (cap)' },
    { path: '/stocktake', method: 'GET', category: 'Inventory', description: 'Stock takes' },
    { path: '/StockTake', method: 'GET', category: 'Inventory', description: 'Stock takes (cap)' },
    { path: '/stocktransfer', method: 'GET', category: 'Inventory', description: 'Stock transfers' },
    { path: '/StockTransfer', method: 'GET', category: 'Inventory', description: 'Stock transfers (cap)' },
    { path: '/stocktransferorder', method: 'GET', category: 'Inventory', description: 'Stock transfer orders' },
    { path: '/StockTransferOrder', method: 'GET', category: 'Inventory', description: 'Stock transfer orders (cap)' },
    { path: '/inventorywrite', method: 'GET', category: 'Inventory', description: 'Inventory write operations' },
    { path: '/InventoryWrite', method: 'GET', category: 'Inventory', description: 'Inventory write (cap)' },
    
    // Customers
    { path: '/customer', method: 'GET', category: 'Customers', description: 'Customer data' },
    { path: '/Customer', method: 'GET', category: 'Customers', description: 'Customer (capitalized)' },
    { path: '/customers', method: 'GET', category: 'Customers', description: 'Customers list' },
    { path: '/Customers', method: 'GET', category: 'Customers', description: 'Customers (capitalized)' },
    
    // Sales
    { path: '/sale', method: 'GET', category: 'Sales', description: 'Sales data' },
    { path: '/Sale', method: 'GET', category: 'Sales', description: 'Sales (capitalized)' },
    { path: '/salelist', method: 'GET', category: 'Sales', description: 'Sales list' },
    { path: '/SaleList', method: 'GET', category: 'Sales', description: 'Sales list (cap)' },
    { path: '/saleinvoice', method: 'GET', category: 'Sales', description: 'Sales invoices' },
    { path: '/SaleInvoice', method: 'GET', category: 'Sales', description: 'Sales invoices (cap)' },
    { path: '/saleorder', method: 'GET', category: 'Sales', description: 'Sales orders' },
    { path: '/SaleOrder', method: 'GET', category: 'Sales', description: 'Sales orders (cap)' },
    { path: '/salequote', method: 'GET', category: 'Sales', description: 'Sales quotes' },
    { path: '/SaleQuote', method: 'GET', category: 'Sales', description: 'Sales quotes (cap)' },
    { path: '/salepackingslip', method: 'GET', category: 'Sales', description: 'Sales packing slips' },
    { path: '/SalePackingSlip', method: 'GET', category: 'Sales', description: 'Sales packing slips (cap)' },
    { path: '/salefulfilment', method: 'GET', category: 'Sales', description: 'Sales fulfilment' },
    { path: '/SaleFulfilment', method: 'GET', category: 'Sales', description: 'Sales fulfilment (cap)' },
    { path: '/salepick', method: 'GET', category: 'Sales', description: 'Sales picking' },
    { path: '/SalePick', method: 'GET', category: 'Sales', description: 'Sales picking (cap)' },
    { path: '/salepack', method: 'GET', category: 'Sales', description: 'Sales packing' },
    { path: '/SalePack', method: 'GET', category: 'Sales', description: 'Sales packing (cap)' },
    { path: '/saleship', method: 'GET', category: 'Sales', description: 'Sales shipping' },
    { path: '/SaleShip', method: 'GET', category: 'Sales', description: 'Sales shipping (cap)' },
    
    // Purchases
    { path: '/purchase', method: 'GET', category: 'Purchases', description: 'Purchase data' },
    { path: '/Purchase', method: 'GET', category: 'Purchases', description: 'Purchase (capitalized)' },
    { path: '/purchaselist', method: 'GET', category: 'Purchases', description: 'Purchase list' },
    { path: '/PurchaseList', method: 'GET', category: 'Purchases', description: 'Purchase list (cap)' },
    { path: '/purchaseorder', method: 'GET', category: 'Purchases', description: 'Purchase orders' },
    { path: '/PurchaseOrder', method: 'GET', category: 'Purchases', description: 'Purchase orders (cap)' },
    { path: '/purchasebill', method: 'GET', category: 'Purchases', description: 'Purchase bills' },
    { path: '/PurchaseBill', method: 'GET', category: 'Purchases', description: 'Purchase bills (cap)' },
    { path: '/purchasecreditnote', method: 'GET', category: 'Purchases', description: 'Purchase credit notes' },
    { path: '/PurchaseCreditNote', method: 'GET', category: 'Purchases', description: 'Purchase credit notes (cap)' },
    
    // Reference Data
    { path: '/ref/account', method: 'GET', category: 'Reference', description: 'Chart of accounts' },
    { path: '/ref/Account', method: 'GET', category: 'Reference', description: 'Chart of accounts (cap)' },
    { path: '/ref/attributeset', method: 'GET', category: 'Reference', description: 'Attribute sets' },
    { path: '/ref/AttributeSet', method: 'GET', category: 'Reference', description: 'Attribute sets (cap)' },
    { path: '/ref/brand', method: 'GET', category: 'Reference', description: 'Brands' },
    { path: '/ref/Brand', method: 'GET', category: 'Reference', description: 'Brands (cap)' },
    { path: '/ref/carrier', method: 'GET', category: 'Reference', description: 'Carriers' },
    { path: '/ref/Carrier', method: 'GET', category: 'Reference', description: 'Carriers (cap)' },
    { path: '/ref/currency', method: 'GET', category: 'Reference', description: 'Currencies' },
    { path: '/ref/Currency', method: 'GET', category: 'Reference', description: 'Currencies (cap)' },
    { path: '/ref/location', method: 'GET', category: 'Reference', description: 'Locations' },
    { path: '/ref/Location', method: 'GET', category: 'Reference', description: 'Locations (cap)' },
    { path: '/ref/paymentterm', method: 'GET', category: 'Reference', description: 'Payment terms' },
    { path: '/ref/PaymentTerm', method: 'GET', category: 'Reference', description: 'Payment terms (cap)' },
    { path: '/ref/pricetier', method: 'GET', category: 'Reference', description: 'Price tiers' },
    { path: '/ref/PriceTier', method: 'GET', category: 'Reference', description: 'Price tiers (cap)' },
    { path: '/ref/taxrule', method: 'GET', category: 'Reference', description: 'Tax rules' },
    { path: '/ref/TaxRule', method: 'GET', category: 'Reference', description: 'Tax rules (cap)' },
    { path: '/ref/unitofmeasure', method: 'GET', category: 'Reference', description: 'Units of measure' },
    { path: '/ref/UnitOfMeasure', method: 'GET', category: 'Reference', description: 'Units of measure (cap)' },
    
    // Financial & Accounting (from your API Explorer screenshot)
    { path: '/accountbank', method: 'GET', category: 'Financial', description: 'Account bank info' },
    { path: '/AccountBank', method: 'GET', category: 'Financial', description: 'Account bank (cap)' },
    { path: '/account', method: 'GET', category: 'Financial', description: 'Accounts' },
    { path: '/Account', method: 'GET', category: 'Financial', description: 'Accounts (cap)' },
    { path: '/payment', method: 'GET', category: 'Financial', description: 'Payments' },
    { path: '/Payment', method: 'GET', category: 'Financial', description: 'Payments (cap)' },
    { path: '/paymentterm', method: 'GET', category: 'Financial', description: 'Payment terms' },
    { path: '/PaymentTerm', method: 'GET', category: 'Financial', description: 'Payment terms (cap)' },
    
    // Supplier
    { path: '/supplier', method: 'GET', category: 'Suppliers', description: 'Suppliers' },
    { path: '/Supplier', method: 'GET', category: 'Suppliers', description: 'Suppliers (cap)' },
    { path: '/suppliers', method: 'GET', category: 'Suppliers', description: 'Suppliers list' },
    { path: '/Suppliers', method: 'GET', category: 'Suppliers', description: 'Suppliers list (cap)' },
    
    // Webhooks (may require automation module)
    { path: '/webhooks', method: 'GET', category: 'Webhooks', description: 'Webhook list' },
    { path: '/Webhooks', method: 'GET', category: 'Webhooks', description: 'Webhooks (cap)' },
    
    // Reports
    { path: '/report/inventory', method: 'GET', category: 'Reports', description: 'Inventory reports' },
    { path: '/Report/Inventory', method: 'GET', category: 'Reports', description: 'Inventory reports (cap)' },
    { path: '/report/sales', method: 'GET', category: 'Reports', description: 'Sales reports' },
    { path: '/Report/Sales', method: 'GET', category: 'Reports', description: 'Sales reports (cap)' },
    { path: '/report/purchases', method: 'GET', category: 'Reports', description: 'Purchase reports' },
    { path: '/Report/Purchases', method: 'GET', category: 'Reports', description: 'Purchase reports (cap)' }
  ];
  
  const workingEndpoints = [];
  const categorizedResults = {};
  
  console.log(`Testing ${allEndpoints.length} total endpoints across all categories...\n`);
  
  // Test each endpoint
  for (const endpoint of allEndpoints) {
    if (!categorizedResults[endpoint.category]) {
      categorizedResults[endpoint.category] = { working: [], failed: [] };
    }
    
    process.stdout.write(`${endpoint.category.padEnd(12)} ${endpoint.description.padEnd(35)} `);
    
    try {
      // Test both URL formats
      const urls = [
        `https://inventory.dearsystems.com/ExternalAPI/v2${endpoint.path}`,
        `https://inventory.dearsystems.com/ExternalAPIs/v2${endpoint.path}`
      ];
      
      let success = false;
      let resultUrl = '';
      let resultData = null;
      
      for (const url of urls) {
        const response = await fetch(url, {
          method: endpoint.method,
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
          
          // Check for valid JSON response
          if ((text.trim().startsWith('{') || text.trim().startsWith('[')) && !text.includes('<!DOCTYPE')) {
            try {
              const data = JSON.parse(text);
              success = true;
              resultUrl = url;
              resultData = data;
              break;
            } catch (e) {
              // Invalid JSON
            }
          }
        }
      }
      
      if (success) {
        process.stdout.write(`✅ WORKS!`);
        
        // Show data summary
        if (resultData) {
          if (resultData.Total !== undefined) {
            process.stdout.write(` (${resultData.Total} items)`);
          } else if (Array.isArray(resultData)) {
            process.stdout.write(` (${resultData.length} items)`);
          } else if (resultData.Company) {
            process.stdout.write(` (${resultData.Company})`);
          } else {
            process.stdout.write(` (${Object.keys(resultData).length} fields)`);
          }
        }
        
        process.stdout.write('\\n');
        
        workingEndpoints.push({ ...endpoint, url: resultUrl, data: resultData });
        categorizedResults[endpoint.category].working.push(endpoint);
        
      } else {
        process.stdout.write(`❌\\n`);
        categorizedResults[endpoint.category].failed.push(endpoint);
      }
      
    } catch (error) {
      process.stdout.write(`❌ Error\\n`);
      categorizedResults[endpoint.category].failed.push(endpoint);
    }
  }
  
  // Summary by category
  console.log('\\n\\n🎯 RESULTS BY CATEGORY:');
  console.log('=======================\\n');
  
  for (const [category, results] of Object.entries(categorizedResults)) {
    const workingCount = results.working.length;
    const totalCount = results.working.length + results.failed.length;
    const percentage = totalCount > 0 ? Math.round((workingCount / totalCount) * 100) : 0;
    
    console.log(`${category}: ${workingCount}/${totalCount} endpoints working (${percentage}%)`);
    
    if (workingCount > 0) {
      console.log(`  ✅ Working endpoints:`);
      results.working.forEach(ep => {
        console.log(`     • ${ep.path} - ${ep.description}`);
      });
    }
    console.log('');
  }
  
  // Overall summary
  console.log('\\n🏆 FINAL SUMMARY:');
  console.log('=================\\n');
  
  if (workingEndpoints.length > 0) {
    console.log(`✅ SUCCESS! ${workingEndpoints.length} endpoints are accessible!`);
    console.log('\\nYour API keys DO have access to these data types:');
    
    const accessibleCategories = [...new Set(workingEndpoints.map(ep => ep.category))];
    accessibleCategories.forEach(category => {
      const count = workingEndpoints.filter(ep => ep.category === category).length;
      console.log(`   • ${category}: ${count} endpoints`);
    });
    
    console.log('\\n🚀 NEXT STEPS:');
    console.log('1. Build integration using the working endpoints');
    console.log('2. Focus on categories with the most accessible data');
    console.log('3. Test data retrieval with pagination parameters');
    console.log('4. Implement real-time sync for accessible categories');
    
    // Show sample data from working endpoints
    console.log('\\n📊 SAMPLE DATA FROM WORKING ENDPOINTS:');
    workingEndpoints.slice(0, 3).forEach(ep => {
      console.log(`\\n${ep.description}:`);
      console.log(`URL: ${ep.url}`);
      if (ep.data) {
        console.log(`Sample keys: ${Object.keys(ep.data).slice(0, 5).join(', ')}`);
      }
    });
    
  } else {
    console.log('❌ No endpoints are accessible with your current API keys.');
    console.log('\\nThis confirms your subscription lacks External API Access.');
    console.log('\\nNext steps:');
    console.log('1. Contact CIN7 support to upgrade your subscription');
    console.log('2. Request External API Access add-on');
    console.log('3. Verify your API application has proper permissions');
  }
}

testAllCIN7V2Endpoints();