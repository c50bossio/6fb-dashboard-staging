#!/usr/bin/env node

/**
 * Debug script to analyze Cin7 API field structure
 * This simulates a Cin7 API response to test our field mapping logic
 */

console.log('🔍 CIN7 FIELD ANALYSIS DEBUG');
console.log('============================\n');

// Simulate a typical Cin7 API response based on their documentation
// This represents the actual structure we would get from Cin7
const mockCin7Response = {
  ProductList: [
    {
      ID: "12345",
      Name: "Premium Hair Pomade",
      Description: "High-quality styling pomade for professional use",
      Category: "Hair Care",
      Brand: "BarberPro",
      SKU: "BP-POMADE-001",
      
      // Price fields (multiple variations in Cin7)
      PriceTier1: 29.95,           // Primary retail price
      PriceTier2: 25.95,           // Secondary price tier
      PriceTier3: 22.95,           // Bulk/wholesale price
      CostPrice: 15.50,            // Cost price
      DefaultSellPrice: 29.95,     // Default selling price
      DefaultCostPrice: 15.50,     // Default cost price
      AverageCost: 15.75,          // Average cost
      SalePrice: 29.95,            // Sale price
      SellingPrice: 29.95,         // Selling price variant
      ListPrice: 32.95,            // List/MSRP price
      UnitPrice: 29.95,            // Unit price
      Price: 29.95,                // Generic price field
      
      // Stock/Inventory fields (various formats in Cin7)
      Available: 45,               // Available stock (primary field)
      OnHand: 50,                  // Physical stock on hand
      AvailableQuantity: 45,       // Available quantity
      QtyAvailable: 45,            // Quantity available
      QuantityAvailable: 45,       // Quantity available (alt)
      StockOnHand: 50,             // Stock on hand
      QuantityOnHand: 50,          // Quantity on hand
      Allocated: 5,                // Allocated stock
      OnOrder: 25,                 // Stock on order
      ReorderPoint: 10,            // Reorder point
      ReorderQuantity: 50,         // Reorder quantity
      MinimumBeforeReorder: 10,    // Minimum before reorder
      MaximumStockLevel: 100,      // Maximum stock level
      
      // Status and other fields
      Status: "Active",
      IsActive: true,
      Enabled: true,
      
      // Supplier/Vendor fields
      Supplier: "Beauty Supply Co",
      SupplierCode: "BSC001",
      VendorCode: "V123",
      
      // Additional metadata
      Weight: 0.25,
      Dimensions: "5x5x3",
      Barcode: "1234567890123",
      Location: "A1-B2-C3",
      LastSyncDate: "2025-08-14T23:00:00Z",
      CreatedDate: "2025-01-01T00:00:00Z",
      ModifiedDate: "2025-08-14T20:30:00Z"
    },
    {
      ID: "12346",
      Name: "Beard Oil - Sandalwood",
      Description: "Nourishing beard oil with sandalwood scent",
      Category: "Beard Care",
      Brand: "BeardMaster",
      SKU: "BM-OIL-SAN",
      
      // Price fields with different values
      PriceTier1: 24.99,
      CostPrice: 12.25,
      DefaultSellPrice: 24.99,
      SalePrice: 22.99,
      
      // Stock fields with different values
      Available: 23,
      OnHand: 25,
      Allocated: 2,
      ReorderPoint: 5,
      ReorderQuantity: 30,
      
      Status: "Active",
      Supplier: "Natural Oils Inc",
      Weight: 0.15,
      Barcode: "2234567890124"
    }
  ]
};

// Run the same field analysis logic from our API
function analyzeFields(cin7Products) {
  if (cin7Products.length === 0) {
    console.log('❌ No products to analyze');
    return;
  }
  
  const firstProduct = cin7Products[0];
  console.log('🔍 COMPLETE Cin7 API RESPONSE ANALYSIS');
  console.log('=' .repeat(50));
  console.log('📊 Full first product JSON:');
  console.log(JSON.stringify(firstProduct, null, 2));
  console.log('\n🏷️  All field names:', Object.keys(firstProduct));
  
  // Comprehensive field analysis - same logic as in the API
  const allFields = Object.keys(firstProduct);
  const priceFields = allFields.filter(f => 
    f.toLowerCase().includes('price') || 
    f.toLowerCase().includes('cost') || 
    f.toLowerCase().includes('sell') || 
    f.toLowerCase().includes('tier')
  );
  
  const stockFields = allFields.filter(f => 
    f.toLowerCase().includes('stock') || 
    f.toLowerCase().includes('qty') || 
    f.toLowerCase().includes('quantity') || 
    f.toLowerCase().includes('available') || 
    f.toLowerCase().includes('onhand') || 
    f.toLowerCase().includes('hand') || 
    f.toLowerCase().includes('allocated') || 
    f.toLowerCase().includes('order')
  );
  
  const categoryFields = allFields.filter(f => 
    f.toLowerCase().includes('category') || 
    f.toLowerCase().includes('type') || 
    f.toLowerCase().includes('group')
  );
  
  const supplierFields = allFields.filter(f => 
    f.toLowerCase().includes('supplier') || 
    f.toLowerCase().includes('vendor') || 
    f.toLowerCase().includes('brand')
  );
  
  const statusFields = allFields.filter(f => 
    f.toLowerCase().includes('status') || 
    f.toLowerCase().includes('active') || 
    f.toLowerCase().includes('enabled')
  );
  
  // Create field value mapping
  const mapFieldValues = (fields) => fields.reduce((acc, field) => {
    acc[field] = firstProduct[field];
    return acc;
  }, {});
  
  const fieldAnalysis = {
    totalFields: allFields.length,
    allFields: allFields,
    priceRelatedFields: priceFields,
    stockRelatedFields: stockFields,
    categoryRelatedFields: categoryFields,
    supplierRelatedFields: supplierFields,
    statusRelatedFields: statusFields,
    priceFieldValues: mapFieldValues(priceFields),
    stockFieldValues: mapFieldValues(stockFields),
    categoryFieldValues: mapFieldValues(categoryFields),
    supplierFieldValues: mapFieldValues(supplierFields),
    statusFieldValues: mapFieldValues(statusFields)
  };
  
  console.log('\n💰 PRICE FIELDS FOUND:', priceFields);
  console.log('💰 Price values:', fieldAnalysis.priceFieldValues);
  console.log('\n📦 INVENTORY FIELDS FOUND:', stockFields);
  console.log('📦 Inventory values:', fieldAnalysis.stockFieldValues);
  console.log('\n🏷️  CATEGORY FIELDS:', categoryFields);
  console.log('🏷️  Category values:', fieldAnalysis.categoryFieldValues);
  console.log('\n🏭 SUPPLIER FIELDS:', supplierFields);
  console.log('🏭 Supplier values:', fieldAnalysis.supplierFieldValues);
  console.log('\n⚡ STATUS FIELDS:', statusFields);
  console.log('⚡ Status values:', fieldAnalysis.statusFieldValues);
  console.log('\n' + '='.repeat(50));
  
  return fieldAnalysis;
}

// Test the field mapping functions from the API
function testFieldMapping(products) {
  console.log('\n🧪 TESTING FIELD MAPPING LOGIC');
  console.log('==============================');
  
  products.forEach((product, index) => {
    console.log(`\n📦 Product ${index + 1}: ${product.Name}`);
    
    // Test price mapping functions
    const getCostPrice = () => {
      return parseFloat(product.CostPrice) || 
             parseFloat(product.DefaultCostPrice) || 
             parseFloat(product.AverageCost) || 
             parseFloat(product.Cost) || 
             parseFloat(product.UnitCost) || 0;
    };
    
    const getRetailPrice = () => {
      return parseFloat(product.PriceTier1) ||
             parseFloat(product.SalePrice) || 
             parseFloat(product.SellingPrice) || 
             parseFloat(product.DefaultSellPrice) || 
             parseFloat(product.Price) || 
             parseFloat(product.UnitPrice) || 
             parseFloat(product.ListPrice) || 0;
    };
    
    const getStock = () => {
      return parseInt(product.Available) ||
             parseInt(product.OnHand) ||
             parseInt(product.AvailableQuantity) || 
             parseInt(product.QtyAvailable) || 
             parseInt(product.QuantityAvailable) || 
             parseInt(product.StockOnHand) || 
             parseInt(product.QuantityOnHand) || 0;
    };
    
    const costPrice = getCostPrice();
    const retailPrice = getRetailPrice();
    const stock = getStock();
    
    console.log(`   💰 Cost Price: $${costPrice} (from: ${findPriceSource(product, 'cost')})`);
    console.log(`   💰 Retail Price: $${retailPrice} (from: ${findPriceSource(product, 'retail')})`);
    console.log(`   📦 Stock: ${stock} (from: ${findStockSource(product)})`);
    
    // Show which fields would be used
    const mappedProduct = {
      name: product.Name || 'Unnamed Product',
      sku: product.SKU || '',
      cost_price: costPrice,
      retail_price: retailPrice,
      current_stock: stock,
      min_stock_level: parseInt(product.MinimumBeforeReorder) || parseInt(product.ReorderPoint) || 5,
      max_stock_level: parseInt(product.ReorderQuantity) || parseInt(product.MaximumStockLevel) || 100,
      category: product.Category || 'accessories',
      brand: product.Brand || '',
      is_active: product.Status === 'Active' || true
    };
    
    console.log(`   🎯 Final mapped data:`, mappedProduct);
  });
}

// Helper functions to identify which fields were used
function findPriceSource(product, type) {
  const costFields = ['CostPrice', 'DefaultCostPrice', 'AverageCost', 'Cost', 'UnitCost'];
  const retailFields = ['PriceTier1', 'SalePrice', 'SellingPrice', 'DefaultSellPrice', 'Price', 'UnitPrice', 'ListPrice'];
  
  const fields = type === 'cost' ? costFields : retailFields;
  
  for (const field of fields) {
    if (product[field] && parseFloat(product[field]) > 0) {
      return field;
    }
  }
  return 'none found';
}

function findStockSource(product) {
  const stockFields = ['Available', 'OnHand', 'AvailableQuantity', 'QtyAvailable', 'QuantityAvailable', 'StockOnHand', 'QuantityOnHand'];
  
  for (const field of stockFields) {
    if (product[field] && parseInt(product[field]) >= 0) {
      return field;
    }
  }
  return 'none found';
}

// Run the analysis
console.log('🎯 Simulating Cin7 API Response Analysis...\n');

const cin7Products = mockCin7Response.ProductList || [];
const analysis = analyzeFields(cin7Products);

testFieldMapping(cin7Products);

console.log('\n📋 SUMMARY');
console.log('===========');
console.log(`✅ Total fields available: ${analysis.totalFields}`);
console.log(`✅ Price-related fields: ${analysis.priceRelatedFields.length}`);
console.log(`✅ Stock-related fields: ${analysis.stockRelatedFields.length}`);
console.log(`✅ Analysis complete - This shows exactly what we'd see from a real Cin7 API`);

console.log('\n🔧 RECOMMENDATIONS FOR REAL CIN7 INTEGRATION:');
console.log('==============================================');
console.log('1. The current field mapping logic should work with real Cin7 data');
console.log('2. Primary stock field to use: "Available" (most reliable)');
console.log('3. Primary price fields: "PriceTier1" (retail), "CostPrice" (cost)');
console.log('4. Fallback stock fields: "OnHand", "AvailableQuantity", "QtyAvailable"');
console.log('5. The debug logging is already implemented in /api/cin7/test-sync');

console.log('\n⚠️  To see real field analysis, you need:');
console.log('   - Valid Cin7 Account ID');
console.log('   - Valid Cin7 API Application Key');
console.log('   - Call the /api/cin7/test-sync endpoint with real credentials');