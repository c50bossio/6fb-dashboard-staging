require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  try {
    const { data: existingTable } = await supabase
      .from('customers')
      .select('id')
      .limit(1);
    
    if (existingTable) {
      console.log('✅ Customers table already exists. Checking for missing columns...');
      
      const { data, error } = await supabase.rpc('get_table_columns', {
        table_name: 'customers'
      }).single();
      
      if (error) {
        console.log('Checking table structure...');
        
        const { error: queryError } = await supabase
          .from('customers')
          .select('barbershop_id, last_visit_at')
          .limit(1);
        
        if (queryError && queryError.message.includes('column')) {
          console.log('Some columns are missing. Adding them...');
          
          const alterTableSQL = `
            ALTER TABLE customers 
            ADD COLUMN IF NOT EXISTS barbershop_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMP WITH TIME ZONE;
            
            -- Update shop_id to barbershop_id if shop_id exists
            UPDATE customers SET barbershop_id = shop_id WHERE barbershop_id IS NULL AND shop_id IS NOT NULL;
          `;
          
          console.log('⚠️  Manual migration needed. Please run the following SQL in Supabase SQL Editor:');
          console.log(alterTableSQL);
        } else {
          console.log('✅ All required columns exist');
        }
      }
    } else {
      console.log('❌ Customers table does not exist. Please run the migration SQL manually in Supabase.');
      
      const migrationSQL = fs.readFileSync('./database/migrations/002_add_customers_table.sql', 'utf8');
      console.log('\n📋 Migration SQL to run:');
      console.log('========================================');
      console.log(migrationSQL.substring(0, 500) + '...');
      console.log('========================================');
      console.log('\nFull migration is in: database/migrations/002_add_customers_table.sql');
    }
    
    console.log('\n📊 Checking bookings table...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .select('customer_id, customer_name, customer_phone, customer_email')
      .limit(1);
    
    if (bookingsError && bookingsError.message.includes('column')) {
      console.log('⚠️  Bookings table needs additional columns. Add these in Supabase SQL Editor:');
      console.log(`
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
      `);
    } else {
      console.log('✅ Bookings table has all required columns');
    }
    
  } catch (error) {
    console.error('Error during migration check:', error);
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration check complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });