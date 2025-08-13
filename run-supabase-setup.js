const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseSetup() {
  console.log('🗄️ Setting up Booking Hub database tables in Supabase...');
  console.log(`📍 URL: ${supabaseUrl}`);
  
  try {
    // Read the SQL file
    const sql = fs.readFileSync('supabase-booking-hub-setup.sql', 'utf8');
    
    // Split into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip empty statements and comments
      if (statement.trim() === ';' || statement.startsWith('--')) {
        continue;
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          // Try alternative approach for unsupported statements
          console.warn(`⚠️ RPC failed, trying direct query: ${error.message}`);
          
          // For some statements, we might need to use the REST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: statement })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Statement ${i + 1} failed:`, errorText);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Statement ${i + 1} error:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Database Setup Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Database setup completed successfully!');
      console.log('\n📋 Created tables:');
      console.log('  - profiles (user profiles extending auth.users)');
      console.log('  - barbershops (barbershop information)');
      console.log('  - services (service catalog)');
      console.log('  - bookings (appointment management)');
      console.log('  - booking_links (marketing links)');
      console.log('  - link_analytics (click tracking)');
      console.log('  - qr_codes (QR code management)');
      console.log('\n🔐 Row Level Security (RLS) enabled');
      console.log('🚀 Demo user created for development');
    } else {
      console.log('\n⚠️ Setup completed with some errors. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
runDatabaseSetup().catch(console.error);