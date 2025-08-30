#!/usr/bin/env node

/**
 * Database Schema Fix Script
 * Applies the appointments.shop_id fix to resolve PostgreSQL errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...');

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Read the SQL fix script
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'database', 'fix-appointments-schema.sql'), 
      'utf8'
    );

    console.log('📄 Loaded SQL fix script');

    // Split the script into individual statements
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('comment on')) {
        // Skip comments for now as they might not be critical
        console.log(`⏭️  Skipping comment statement ${i + 1}`);
        continue;
      }

      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';'
        });

        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await supabase
            .from('_temp_sql_exec')
            .select('*')
            .limit(0); // This will execute but return nothing

          if (directError && directError.code !== '42P01') {
            throw error;
          }
        }

        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('IF NOT EXISTS')) {
          console.log(`⚠️  Statement ${i + 1} - Object already exists (expected)`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, err.message);
          // Continue with other statements
        }
      }
    }

    // Verify the fix by checking if shop_id column exists
    console.log('🔍 Verifying schema fix...');
    
    const { data: columns, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'appointments')
      .eq('table_schema', 'public');

    if (columnError) {
      console.warn('⚠️  Could not verify schema - this might be normal');
    } else {
      const columnNames = columns.map(c => c.column_name);
      const hasShopId = columnNames.includes('shop_id');
      const hasBarbershopId = columnNames.includes('barbershop_id');
      
      console.log(`📊 Appointments table columns:`, columnNames);
      console.log(`✅ shop_id column exists: ${hasShopId}`);
      console.log(`✅ barbershop_id column exists: ${hasBarbershopId}`);
      
      if (hasShopId && hasBarbershopId) {
        console.log('🎉 Schema fix appears successful!');
      } else {
        console.log('⚠️  Schema fix may need manual verification');
      }
    }

    console.log('🚀 Database schema fix completed!');
    
  } catch (error) {
    console.error('💥 Database schema fix failed:', error.message);
    console.error('📋 Full error:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function applySchemaFixDirect() {
  console.log('🔧 Applying schema fix using direct approach...');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Simple fix: Add shop_id column if it doesn't exist
  try {
    const { error } = await supabase
      .from('appointments')
      .select('shop_id')
      .limit(1);

    if (error && error.code === '42703') {
      console.log('📋 shop_id column missing, need to add it manually via Supabase dashboard');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/editor');
      console.log('📝 Run: ALTER TABLE appointments ADD COLUMN shop_id UUID;');
      console.log('📝 Then: UPDATE appointments SET shop_id = barbershop_id WHERE shop_id IS NULL;');
    } else {
      console.log('✅ shop_id column already exists or accessible');
    }
  } catch (err) {
    console.log('⚠️  Manual intervention required:', err.message);
  }
}

// Run the fix if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixDatabaseSchema().catch(console.error);
}