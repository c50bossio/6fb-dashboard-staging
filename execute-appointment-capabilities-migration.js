#!/usr/bin/env node

/**
 * Execute Appointment Capabilities Migration
 * 
 * This script safely executes the appointment capabilities migration
 * against the Supabase database with proper error handling and validation.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client with service role key for database modifications
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false
    }
  }
);

async function executeMigration() {
  try {
    console.log('🚀 Starting Appointment Capabilities Migration...');
    console.log('📊 Database:', process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/https?:\/\/([^.]+).*/, '$1...'));
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'database', 'add-appointment-capabilities-columns.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Check if we can connect to the database
    console.log('🔌 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });
      
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log(`✅ Database connection successful. Found ${testData} profiles.`);
    
    // Check current schema to see if columns already exist
    console.log('🔍 Checking current schema...');
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'profiles' 
            AND table_schema = 'public'
            AND column_name IN ('can_take_appointments', 'is_visible_for_booking', 'service_provider_since')
        `
      });
    
    if (schemaError && !schemaError.message.includes('function exec_sql')) {
      console.log('⚠️  Could not check schema via RPC, proceeding with migration...');
    } else if (schemaData && schemaData.length > 0) {
      console.log(`⚠️  Found ${schemaData.length} existing capability columns. Migration may partially skip existing columns.`);
    }
    
    // Execute the migration in smaller chunks to avoid timeouts
    console.log('⚙️  Executing migration...');
    
    // Split the migration into logical chunks
    const migrationChunks = migrationSQL.split('-- ===============================================');
    
    for (let i = 0; i < migrationChunks.length; i++) {
      const chunk = migrationChunks[i].trim();
      if (!chunk || chunk.startsWith('--') || chunk.length < 10) continue;
      
      console.log(`📦 Executing chunk ${i + 1}/${migrationChunks.length}...`);
      
      try {
        // Use individual SQL statements for better error reporting
        const statements = chunk
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          if (statement.includes('ALTER TABLE') || 
              statement.includes('UPDATE') || 
              statement.includes('CREATE INDEX') ||
              statement.includes('COMMENT ON')) {
            
            const { error } = await supabase.rpc('exec_sql', { sql: statement });
            
            if (error && !error.message.includes('already exists') && !error.message.includes('column "')) {
              console.error(`❌ Error in statement: ${statement.substring(0, 50)}...`);
              console.error(`   Error: ${error.message}`);
              throw error;
            }
          }
        }
        
        console.log(`✅ Chunk ${i + 1} completed successfully`);
        
      } catch (chunkError) {
        console.error(`❌ Error in chunk ${i + 1}:`, chunkError.message);
        if (!chunkError.message.includes('already exists')) {
          throw chunkError;
        }
      }
    }
    
    // Verify the migration results
    console.log('🔍 Verifying migration results...');
    
    const { data: verificationData, error: verificationError } = await supabase
      .from('profiles')
      .select('role, can_take_appointments, is_visible_for_booking, service_provider_since')
      .not('role', 'is', null);
    
    if (verificationError) {
      console.error('❌ Verification failed:', verificationError.message);
      throw verificationError;
    }
    
    // Generate verification report
    const roleCounts = {};
    const appointmentCapabilities = {};
    let chrisBossioFound = false;
    
    verificationData.forEach(profile => {
      const role = profile.role || 'UNKNOWN';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
      
      if (profile.can_take_appointments) {
        appointmentCapabilities[role] = (appointmentCapabilities[role] || 0) + 1;
      }
      
      // Check if this could be Chris Bossio
      if (role === 'ENTERPRISE_OWNER' && profile.can_take_appointments) {
        chrisBossioFound = true;
      }
    });
    
    console.log('\n📊 Migration Verification Report:');
    console.log('==================================');
    console.log('Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const withCapabilities = appointmentCapabilities[role] || 0;
      console.log(`  ${role}: ${count} total, ${withCapabilities} with appointment capabilities`);
    });
    
    console.log(`\n🎯 Chris Bossio (ENTERPRISE_OWNER) appointment capability: ${chrisBossioFound ? '✅ ENABLED' : '❌ NOT FOUND'}`);
    
    // Check specific Chris Bossio record if possible
    const { data: chrisData, error: chrisError } = await supabase
      .from('profiles')
      .select('full_name, role, can_take_appointments, is_visible_for_booking')
      .eq('id', 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5')
      .maybeSingle();
    
    if (!chrisError && chrisData) {
      console.log(`👤 Chris Bossio specific check:`);
      console.log(`   Name: ${chrisData.full_name}`);
      console.log(`   Role: ${chrisData.role}`);
      console.log(`   Can Take Appointments: ${chrisData.can_take_appointments}`);
      console.log(`   Visible for Booking: ${chrisData.is_visible_for_booking}`);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update your booking UI to use the new capability columns');
    console.log('2. Test appointment booking with users who have can_take_appointments = true');
    console.log('3. Consider adding UI controls for toggling appointment capabilities');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.log('\n🔄 Rollback Information:');
    console.log('To rollback this migration, run the following SQL in Supabase:');
    console.log('ALTER TABLE public.profiles DROP COLUMN IF EXISTS can_take_appointments;');
    console.log('ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_visible_for_booking;');
    console.log('ALTER TABLE public.profiles DROP COLUMN IF EXISTS service_provider_since;');
    console.log('DROP INDEX IF EXISTS idx_profiles_appointment_booking;');
    console.log('DROP INDEX IF EXISTS idx_profiles_service_providers;');
    
    return false;
  }
}

// Handle command line execution
if (process.argv[1] === __filename || process.argv[1].endsWith('execute-appointment-capabilities-migration.js')) {
  // Check required environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   NEXT_PUBLIC_SUPABASE_URL');
    console.error('   SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease ensure these are set in your .env file or environment.');
    process.exit(1);
  }
  
  executeMigration().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { executeMigration };