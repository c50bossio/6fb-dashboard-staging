#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

async function executeSQL(sql) {
  // Use Supabase's SQL execution endpoint
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`
    },
    body: JSON.stringify({ sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return response.json();
}

async function setupDatabase() {
  console.log('🚀 Setting up database using Supabase Management API...\n');

  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'RUN_THIS_IN_SUPABASE.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Executing database schema...\n');

    // Try to execute the entire SQL at once
    // Supabase Management API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });

    if (!response.ok) {
      // If direct execution fails, try statement by statement
      console.log('⚠️  Direct execution failed, trying statement by statement...\n');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(/;\s*(?=\n)/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.match(/^--.*$/m));

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip pure comments
        if (statement.match(/^--/)) continue;
        
        let description = statement.substring(0, 60).replace(/\s+/g, ' ');
        if (statement.length > 60) description += '...';
        
        process.stdout.write(`[${i + 1}/${statements.length}] ${description}`);
        
        try {
          await executeSQL(statement + ';');
          console.log(' ✅');
        } catch (err) {
          console.log(' ⚠️');
          console.error(`   Warning: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Database schema executed successfully!');
    }

    console.log('\n✅ Database setup completed!');
    console.log('\n💡 Next step: Verify the tables in your Supabase dashboard');
    console.log(`   👉 ${supabaseUrl}`);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n💡 Alternative: Copy the SQL from database/RUN_THIS_IN_SUPABASE.sql');
    console.log('   and paste it directly in the Supabase SQL editor');
  }
}

// Run the setup
setupDatabase();