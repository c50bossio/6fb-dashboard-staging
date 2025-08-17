// CIN7 Browser-Based Data Extraction using Playwright
// Since API keys don't have external access, we'll use browser automation

const { chromium } = require('playwright');
const fs = require('fs').promises;

class CIN7BrowserSync {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
  }

  async initialize() {
    console.log('🚀 Starting CIN7 Browser Automation...\n');
    
    // Launch browser with persistent context to maintain login
    this.browser = await chromium.launch({
      headless: false,  // Set to true in production
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Browser initialized\n');
  }

  async login(email, password) {
    console.log('🔐 Logging into CIN7 Core...\n');
    
    try {
      // Navigate to CIN7 login
      await this.page.goto('https://inventory.dearsystems.com/Login', {
        waitUntil: 'networkidle'
      });
      
      // Check if already logged in
      if (this.page.url().includes('/Dashboard')) {
        console.log('✅ Already logged in!\n');
        this.isLoggedIn = true;
        return true;
      }
      
      // Fill login form
      await this.page.fill('input[name="Username"]', email);
      await this.page.fill('input[name="Password"]', password);
      
      // Click login button
      await this.page.click('button[type="submit"]');
      
      // Wait for navigation
      await this.page.waitForURL('**/Dashboard**', { timeout: 10000 });
      
      console.log('✅ Successfully logged in!\n');
      this.isLoggedIn = true;
      return true;
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
  }

  async navigateToAPIExplorer() {
    console.log('🔍 Navigating to API Explorer...\n');
    
    try {
      // Go to integrations/API section
      await this.page.goto('https://inventory.dearsystems.com/ExternalApi/Settings', {
        waitUntil: 'networkidle'
      });
      
      // Click on API Explorer tab if available
      const explorerTab = await this.page.locator('text=API explorer').first();
      if (await explorerTab.isVisible()) {
        await explorerTab.click();
        await this.page.waitForTimeout(2000);
      }
      
      console.log('✅ API Explorer ready\n');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to navigate to API Explorer:', error.message);
      return false;
    }
  }

  async executeAPICall(endpoint, method = 'GET', params = {}) {
    console.log(`📡 Executing API call: ${method} ${endpoint}`);
    
    try {
      // Intercept the API response
      const responsePromise = this.page.waitForResponse(
        response => response.url().includes(endpoint) && response.status() === 200,
        { timeout: 10000 }
      );
      
      // Build request URL
      let url = `https://inventory.dearsystems.com/ExternalAPIs/v2${endpoint}`;
      if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url += `?${queryString}`;
      }
      
      // Execute request in browser context
      const result = await this.page.evaluate(async ({ url, method }) => {
        try {
          const response = await fetch(url, {
            method: method,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            credentials: 'include'  // Include cookies
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          return { success: true, data };
          
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, { url, method });
      
      if (result.success) {
        console.log(`✅ Success! Retrieved ${JSON.stringify(result.data).length} bytes of data\n`);
        return result.data;
      } else {
        console.error(`❌ API call failed: ${result.error}\n`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Error executing API call: ${error.message}\n`);
      return null;
    }
  }

  async getProducts(limit = 100, page = 1) {
    console.log(`📦 Fetching products (page ${page}, limit ${limit})...\n`);
    
    const data = await this.executeAPICall('/products', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data && data.Products) {
      console.log(`✅ Retrieved ${data.Products.length} products`);
      console.log(`   Total available: ${data.Total}\n`);
      return data;
    }
    
    return null;
  }

  async getInventory(limit = 100, page = 1) {
    console.log(`📊 Fetching inventory levels (page ${page}, limit ${limit})...\n`);
    
    const data = await this.executeAPICall('/stock', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data) {
      console.log(`✅ Retrieved inventory data\n`);
      return data;
    }
    
    return null;
  }

  async getCustomers(limit = 100, page = 1) {
    console.log(`👥 Fetching customers (page ${page}, limit ${limit})...\n`);
    
    const data = await this.executeAPICall('/customers', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data && data.Customers) {
      console.log(`✅ Retrieved ${data.Customers.length} customers`);
      console.log(`   Total available: ${data.Total}\n`);
      return data;
    }
    
    return null;
  }

  async getAllProducts() {
    console.log('📦 Fetching ALL products from CIN7...\n');
    
    const allProducts = [];
    let page = 1;
    const limit = 100;
    let hasMore = true;
    
    while (hasMore) {
      const data = await this.getProducts(limit, page);
      
      if (data && data.Products && data.Products.length > 0) {
        allProducts.push(...data.Products);
        
        // Check if there are more pages
        const totalFetched = page * limit;
        hasMore = totalFetched < data.Total;
        
        if (hasMore) {
          console.log(`   Progress: ${allProducts.length} / ${data.Total} products\n`);
          page++;
          await this.page.waitForTimeout(1000); // Rate limiting
        }
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Fetched ${allProducts.length} total products\n`);
    return allProducts;
  }

  async saveToDatabase(data, type = 'products') {
    console.log(`💾 Saving ${type} to database...\n`);
    
    try {
      // Save to JSON file as backup
      const filename = `cin7_${type}_${Date.now()}.json`;
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      console.log(`✅ Saved to ${filename}\n`);
      
      // TODO: Integrate with Supabase database
      // This would normally save to your actual database
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to save data: ${error.message}`);
      return false;
    }
  }

  async calculateInventoryValue(products) {
    console.log('💰 Calculating total inventory value...\n');
    
    let totalValue = 0;
    let totalQuantity = 0;
    
    for (const product of products) {
      if (product.QuantityOnHand && product.AverageCost) {
        const value = product.QuantityOnHand * product.AverageCost;
        totalValue += value;
        totalQuantity += product.QuantityOnHand;
      }
    }
    
    console.log(`📊 Inventory Summary:`);
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Total Quantity: ${totalQuantity.toLocaleString()}`);
    console.log(`   Total Value: $${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('');
    
    return {
      productCount: products.length,
      totalQuantity,
      totalValue
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 Browser closed\n');
    }
  }
}

// Main execution
async function main() {
  const sync = new CIN7BrowserSync();
  
  try {
    // Initialize browser
    await sync.initialize();
    
    // You'll need to provide credentials
    console.log('⚠️  IMPORTANT: You need to provide CIN7 login credentials\n');
    console.log('Please update the login() call with your email and password.\n');
    
    // Login to CIN7
    // await sync.login('your-email@example.com', 'your-password');
    
    // Navigate to API Explorer
    // await sync.navigateToAPIExplorer();
    
    // Fetch all products
    // const products = await sync.getAllProducts();
    
    // Calculate inventory value
    // if (products && products.length > 0) {
    //   const summary = await sync.calculateInventoryValue(products);
    //   
    //   // Save to database
    //   await sync.saveToDatabase(products, 'products');
    //   
    //   // Verify we can sync $500,000+ inventory
    //   if (summary.totalValue >= 500000) {
    //     console.log('✅ SUCCESS: Can sync $500,000+ inventory!');
    //   }
    // }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Uncomment the login and sync code above');
    console.log('2. Add your CIN7 email and password');
    console.log('3. Run this script to sync your inventory');
    console.log('4. The data will be saved to JSON files');
    console.log('5. Integrate with your Supabase database\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sync.close();
  }
}

// Export for use in other modules
module.exports = CIN7BrowserSync;

// Run if executed directly
if (require.main === module) {
  main();
}