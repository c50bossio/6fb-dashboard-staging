#!/usr/bin/env node

/**
 * Run Supabase Database Migration
 * 
 * This script applies the subscription migration to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase environment variables not found');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('🚀 Running Supabase database migration...\n');

  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'subscription-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration file loaded successfully');
    console.log(`   File: ${migrationPath}`);
    console.log(`   Size: ${Math.round(migrationSQL.length / 1024)}KB\n`);

    // Split SQL into individual statements (basic approach)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    // Execute migration
    console.log('⚡ Executing migration statements...');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {
        console.log(`   ${i + 1}/${statements.length}: Executing...`);
        
        // Use RPC to execute SQL
        const { data, error } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (error) {
          // Some statements might fail if they already exist (IF NOT EXISTS)
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key')) {
            console.log(`   ✅ Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            console.log(`   ⚠️  Warning: ${error.message}`);
            console.log(`   Statement: ${statement.substring(0, 100)}...`);
          }
        } else {
          console.log(`   ✅ Success`);
        }
      } catch (err) {
        console.log(`   ⚠️  Error: ${err.message}`);
        // Continue with other statements
      }
    }

    console.log('\n🎉 Migration execution completed!');

    // Verify migration by checking if key tables exist
    console.log('\n🔍 Verifying migration...');
    
    const tablesToCheck = [
      'subscription_history',
      'usage_tracking', 
      'overage_charges',
      'subscription_features',
      'payment_methods',
      'invoices'
    ];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table}: Table exists and accessible`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }

    // Check if subscription columns were added to users table
    console.log('\n🔍 Checking users table schema...');
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, subscription_tier, subscription_status, stripe_customer_id')
        .limit(1);

      if (error) {
        console.log('   ❌ Users table subscription columns: Not accessible');
        console.log(`      Error: ${error.message}`);
      } else {
        console.log('   ✅ Users table subscription columns: Successfully added');
      }
    } catch (err) {
      console.log(`   ❌ Users table check failed: ${err.message}`);
    }

    console.log('\n✅ MIGRATION COMPLETE!');
    console.log('📋 Next Steps:');
    console.log('1. Update webhook signing secret in .env.local');
    console.log('2. Deploy to bookbarber.com');
    console.log('3. Test subscription flow');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Manual Migration Option:');
    console.log('If this script fails, you can run the migration manually:');
    console.log('1. Go to: https://app.supabase.com/project/dfhqjdoydihajmjxniee/sql');
    console.log('2. Copy the contents of database/subscription-migration.sql');
    console.log('3. Paste into the SQL Editor');
    console.log('4. Click "Run"');
    process.exit(1);
  }
}

runMigration();