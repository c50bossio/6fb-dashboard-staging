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

    // Launch browser with persistent context to maintain login
    this.browser = await chromium.launch({
      headless: false,  // Set to true in production
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    this.page = await this.browser.newPage();
    
    // Set realistic viewport
    await this.page.setViewportSize({ width: 1280, height: 720 });

  }

  async login(email, password) {

    try {
      // Navigate to CIN7 login
      await this.page.goto('https://inventory.dearsystems.com/Login', {
        waitUntil: 'networkidle'
      });
      
      // Check if already logged in
      if (this.page.url().includes('/Dashboard')) {
        
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

      this.isLoggedIn = true;
      return true;
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      return false;
    }
  }

  async navigateToAPIExplorer() {

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

      return true;
      
    } catch (error) {
      console.error('❌ Failed to navigate to API Explorer:', error.message);
      return false;
    }
  }

  async executeAPICall(endpoint, method = 'GET', params = {}) {

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
        .length} bytes of data\n`);
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
    ...\n`);
    
    const data = await this.executeAPICall('/products', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data && data.Products) {

      return data;
    }
    
    return null;
  }

  async getInventory(limit = 100, page = 1) {
    ...\n`);
    
    const data = await this.executeAPICall('/stock', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data) {
      
      return data;
    }
    
    return null;
  }

  async getCustomers(limit = 100, page = 1) {
    ...\n`);
    
    const data = await this.executeAPICall('/customers', 'GET', {
      limit: limit,
      page: page
    });
    
    if (data && data.Customers) {

      return data;
    }
    
    return null;
  }

  async getAllProducts() {

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
          
          page++;
          await this.page.waitForTimeout(1000); // Rate limiting
        }
      } else {
        hasMore = false;
      }
    }

    return allProducts;
  }

  async saveToDatabase(data, type = 'products') {
    // // Debug log removed for production
try {
      // Save to JSON file as backup
      const filename = `cin7_${type}_${Date.now()}.json`;
      await fs.writeFile(filename, JSON.stringify(data, null, 2));
      // // Debug log removed for production
// Import Supabase client
      const { createClient } = require('@supabase/supabase-js');
      require('dotenv').config();
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Map CIN7 data to local inventory format
      if (type === 'products') {
        const inventoryData = data.map(product => ({
          name: product.Name || '',
          sku: product.SKU || '',
          barcode: product.Barcode || '',
          description: product.ShortDescription || product.Description || '',
          category: this.mapCategoryForBarbershop(product.Category),
          brand: product.Brand || '',
          supplier: product.DefaultSupplier?.Name || '',
          unit_cost: parseFloat(product.AverageCost || 0),
          retail_price: parseFloat(product.PriceTier1 || 0),
          current_stock: parseFloat(product.QuantityOnHand || 0),
          min_stock: parseFloat(product.MinimumBeforeReorder || 0),
          max_stock: parseFloat(product.MaximumStock || 0),
          location: product.BinLocation || '',
          professional_use: this.detectProfessionalUse(product),
          usage_instructions: this.extractUsageInstructions(product),
          cin7_product_id: product.ID,
          cin7_sku: product.SKU,
          cin7_barcode: product.Barcode,
          cin7_last_sync: new Date().toISOString(),
          cin7_sync_enabled: true,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        // Upsert products to inventory table
        const { data: insertedData, error } = await supabase
          .from('inventory')
          .upsert(inventoryData, { 
            onConflict: 'cin7_product_id',
            returning: 'minimal'
          });
          
        if (error) {
          console.error('❌ Supabase upsert error:', error);
          return false;
        }
        
        // // Debug log removed for production
}
      
      // Log sync activity
      await this.logSyncActivity(supabase, type, data.length, 'success');
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to save data: ${error.message}`);
      
      // Try to log the error
      try {
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        await this.logSyncActivity(supabase, type, data.length, 'failed', error.message);
      } catch (logError) {
        console.error('❌ Failed to log sync error:', logError.message);
      }
      
      return false;
    }
  }
  
  // Helper method to map CIN7 categories to barbershop categories
  mapCategoryForBarbershop(cin7Category) {
    if (!cin7Category) return 'other';
    
    const category = cin7Category.toLowerCase();
    
    if (category.includes('shampoo') || category.includes('conditioner') || 
        category.includes('hair') && category.includes('care')) {
      return 'hair_care';
    }
    if (category.includes('beard') || category.includes('mustache')) {
      return 'beard_care';
    }
    if (category.includes('clipper') || category.includes('trimmer') || 
        category.includes('razor') || category.includes('scissors')) {
      return 'tools';
    }
    if (category.includes('cape') || category.includes('towel') || 
        category.includes('apron') || category.includes('accessory')) {
      return 'accessories';
    }
    if (category.includes('styling') || category.includes('gel') || 
        category.includes('pomade') || category.includes('wax')) {
      return 'styling';
    }
    
    return 'other';
  }
  
  // Helper method to detect professional-use products
  detectProfessionalUse(product) {
    const name = (product.Name || '').toLowerCase();
    const description = (product.Description || '').toLowerCase();
    const brand = (product.Brand || '').toLowerCase();
    
    // Professional brands
    const professionalBrands = [
      'wahl', 'andis', 'oster', 'babyliss', 'conair', 'remington',
      'redken', 'matrix', 'paul mitchell', 'tigi', 'american crew'
    ];
    
    // Professional keywords
    const professionalKeywords = [
      'professional', 'salon', 'barber', 'stylist', 'commercial',
      'heavy duty', 'industrial', 'pro grade'
    ];
    
    return professionalBrands.some(brand_name => brand.includes(brand_name)) ||
           professionalKeywords.some(keyword => name.includes(keyword) || description.includes(keyword));
  }
  
  // Helper method to extract usage instructions
  extractUsageInstructions(product) {
    const description = product.Description || '';
    const longDescription = product.LongDescription || '';
    
    // Look for usage patterns in descriptions
    const usagePattern = /(?:directions|instructions|how to use|usage):\s*(.+?)(?:\.|$)/i;
    const match = (description + ' ' + longDescription).match(usagePattern);
    
    return match ? match[1].trim() : '';
  }
  
  // Helper method to log sync activity
  async logSyncActivity(supabase, syncType, itemCount, status, errorMessage = null) {
    try {
      // Get connection ID - for now, use the first active connection
      const { data: connection } = await supabase
        .from('cin7_connections')
        .select('id')
        .eq('is_active', true)
        .single();
        
      if (!connection) {
        console.warn('⚠️ No active CIN7 connection found for logging');
        return;
      }
      
      const { error } = await supabase
        .from('cin7_sync_logs')
        .insert({
          connection_id: connection.id,
          sync_type: 'browser_automation',
          sync_direction: 'pull',
          status: status,
          items_synced: status === 'success' ? itemCount : 0,
          items_failed: status === 'failed' ? itemCount : 0,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          details: {
            data_type: syncType,
            method: 'browser_sync',
            timestamp: new Date().toISOString()
          }
        });
        
      if (error) {
        console.error('❌ Failed to log sync activity:', error);
      } else {
        // // Debug log removed for production
}
    } catch (error) {
      console.error('❌ Error logging sync activity:', error);
    }
  }

  async calculateInventoryValue(products) {

    let totalValue = 0;
    let totalQuantity = 0;
    
    for (const product of products) {
      if (product.QuantityOnHand && product.AverageCost) {
        const value = product.QuantityOnHand * product.AverageCost;
        totalValue += value;
        totalQuantity += product.QuantityOnHand;
      }
    }

    }`);
    }`);

    return {
      productCount: products.length,
      totalQuantity,
      totalValue
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      
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
    
     call with your email and password.\n');
    
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
    //     
    //   }
    // }

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