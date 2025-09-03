#!/usr/bin/env node

/**
 * Execute Appointment Capabilities Migration - Direct SQL Approach
 * 
 * This script executes the migration using direct SQL statements
 * through the Supabase client without relying on RPC functions.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c',
  {
    auth: { persistSession: false }
  }
);

async function executeMigration() {
  try {
    console.log('🚀 Starting Appointment Capabilities Migration (Direct SQL)...');
    
    // Step 1: Test database connection
    console.log('🔌 Testing database connection...');
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      throw new Error(`Database connection failed: ${countError.message}`);
    }
    
    console.log(`✅ Database connection successful. Found ${count} profiles.`);
    
    // Step 2: Check if columns already exist by trying to select them
    console.log('🔍 Checking if columns already exist...');
    const { data: existingData, error: existingError } = await supabase
      .from('profiles')
      .select('can_take_appointments, is_visible_for_booking, service_provider_since')
      .limit(1);
    
    if (!existingError) {
      console.log('⚠️  Columns already exist. Proceeding with updates only...');
    } else {
      console.log('📦 Adding new columns to profiles table...');
      
      // Since we can't use ALTER TABLE directly through Supabase client,
      // we'll add columns via the database interface
      console.log('❌ Cannot add columns via Supabase client. Please add columns manually in Supabase dashboard:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to Table Editor > profiles');
      console.log('   3. Add these columns:');
      console.log('      - can_take_appointments: boolean, default false');
      console.log('      - is_visible_for_booking: boolean, default true');
      console.log('      - service_provider_since: timestamptz, nullable');
      console.log('\nAfter adding columns manually, run this script again.');
      return false;
    }
    
    // Step 3: Update existing users based on roles
    console.log('⚙️  Updating existing users based on roles...');
    
    // Update BARBERs
    console.log('📝 Setting appointment capabilities for BARBER role...');
    const { error: barberError } = await supabase
      .from('profiles')
      .update({
        can_take_appointments: true,
        service_provider_since: new Date().toISOString()
      })
      .eq('role', 'BARBER')
      .is('service_provider_since', null);
    
    if (barberError && !barberError.message.includes('No rows found')) {
      console.error('❌ Error updating BARBERs:', barberError.message);
    } else {
      console.log('✅ BARBERs updated successfully');
    }
    
    // Update ENTERPRISE_OWNER and SHOP_OWNER
    console.log('📝 Setting appointment capabilities for owners...');
    const { error: ownerError } = await supabase
      .from('profiles')
      .update({
        can_take_appointments: true,
        service_provider_since: new Date().toISOString()
      })
      .in('role', ['ENTERPRISE_OWNER', 'SHOP_OWNER'])
      .is('service_provider_since', null);
    
    if (ownerError && !ownerError.message.includes('No rows found')) {
      console.error('❌ Error updating owners:', ownerError.message);
    } else {
      console.log('✅ Owners updated successfully');
    }
    
    // Step 4: Update Chris Bossio specifically
    console.log('👤 Updating Chris Bossio specifically...');
    const { data: chrisUpdate, error: chrisError } = await supabase
      .from('profiles')
      .update({
        can_take_appointments: true,
        is_visible_for_booking: true,
        service_provider_since: new Date().toISOString()
      })
      .eq('id', 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5')
      .select();
    
    if (chrisError) {
      console.error('❌ Error updating Chris Bossio:', chrisError.message);
    } else if (chrisUpdate && chrisUpdate.length > 0) {
      console.log('✅ Chris Bossio updated successfully');
    } else {
      console.log('⚠️  Chris Bossio not found with that ID');
    }
    
    // Step 5: Verification
    console.log('🔍 Verifying migration results...');
    
    const { data: verificationData, error: verificationError } = await supabase
      .from('profiles')
      .select('id, full_name, role, can_take_appointments, is_visible_for_booking, service_provider_since')
      .not('role', 'is', null);
    
    if (verificationError) {
      console.error('❌ Verification failed:', verificationError.message);
      return false;
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
        
        // Check for Chris Bossio
        if (profile.id === 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5') {
          chrisBossioFound = true;
        }
      }
    });
    
    console.log('\n📊 Migration Verification Report:');
    console.log('==================================');
    console.log('Role Distribution:');
    Object.entries(roleCounts).forEach(([role, count]) => {
      const withCapabilities = appointmentCapabilities[role] || 0;
      console.log(`  ${role}: ${count} total, ${withCapabilities} with appointment capabilities`);
    });
    
    console.log(`\n🎯 Chris Bossio appointment capability: ${chrisBossioFound ? '✅ ENABLED' : '❌ NOT FOUND'}`);
    
    // Show specific users with appointment capabilities
    const serviceProviders = verificationData.filter(p => p.can_take_appointments);
    console.log('\n👥 Service Providers (can take appointments):');
    serviceProviders.forEach(provider => {
      console.log(`   - ${provider.full_name} (${provider.role}) - Visible: ${provider.is_visible_for_booking}`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Manual Steps Remaining:');
    console.log('1. If columns don\'t exist yet, add them manually in Supabase dashboard');
    console.log('2. Update your booking UI to use the new capability columns');
    console.log('3. Test appointment booking with users who have can_take_appointments = true');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Execute the migration
executeMigration().then(success => {
  process.exit(success ? 0 : 1);
});