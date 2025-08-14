// Quick test to verify the API endpoint works with our database
import fs from 'fs';
import path from 'path';

async function testDatabaseConnection() {
  console.log('🧪 Testing database connection...');
  
  try {
    // Simulate the API call
    const db = await import('sqlite3').then(module => {
      return new module.Database('./data/agent_system.db');
    });
    
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM barbershops WHERE id = ?', 
        ['550e8400-e29b-41d4-a716-446655440000'], 
        (err, row) => {
          if (err) {
            console.error('❌ Database error:', err);
            reject(err);
          } else if (row) {
            console.log('✅ Database connection successful!');
            console.log('✅ Barbershop data found:');
            console.log('  - Name:', row.name);
            console.log('  - Shop Slug:', row.shop_slug);
            console.log('  - Website Enabled:', Boolean(row.website_enabled));
            console.log('  - Hero Title:', row.hero_title);
            console.log('  - Brand Colors:', row.brand_colors);
            console.log('  - Has customization fields:', Boolean(row.logo_url !== undefined && row.theme_preset !== undefined));
            resolve(row);
          } else {
            console.log('❌ No barbershop found');
            reject(new Error('No data found'));
          }
          db.close();
        }
      );
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testDatabaseConnection()
  .then(() => {
    console.log('🎉 All tests passed! Database is ready for website settings.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });