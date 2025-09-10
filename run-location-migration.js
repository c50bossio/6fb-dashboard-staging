#!/usr/bin/env node

/**
 * Run location editing database migration against Supabase
 * This script executes the schema inconsistencies migration file
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

async function runLocationMigration() {
    console.log('🚀 Starting location editing database migration...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase configuration. Please check your .env.local file.');
        console.log('Expected variables:');
        console.log('  NEXT_PUBLIC_SUPABASE_URL');
        console.log('  SUPABASE_SERVICE_ROLE_KEY');
        process.exit(1);
    }
    
    console.log(`📡 Connecting to: ${supabaseUrl}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    
    try {
        // Read the specific migration file for location editing
        const migrationPath = path.join(__dirname, 'migrations/20250902_fix_schema_inconsistencies.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);
        
        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('⏳ Executing migration...');
        console.log('📝 Migration includes:');
        console.log('   - Adding customer columns to bookings table');
        console.log('   - Adding organization_id to barbershops for enterprise support');
        console.log('   - Creating organizations table if missing');
        console.log('   - Creating barbershop_staff table for access control');
        console.log('   - Adding performance indexes');
        
        // Split the SQL into individual statements and execute them
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`🔄 Executing ${statements.length} SQL statements...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
            
            try {
                // Use rpc to execute raw SQL
                const { data, error } = await supabase.rpc('exec_sql', {
                    query: statement
                });
                
                if (error) {
                    console.log(`⚠️  Statement ${i + 1} error (may be expected):`, error.message);
                    errorCount++;
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                    successCount++;
                }
            } catch (e) {
                console.log(`⚠️  Statement ${i + 1} exception (may be expected):`, e.message);
                errorCount++;
            }
        }
        
        console.log(`📊 Migration completed: ${successCount} successful, ${errorCount} errors/warnings`);
        
        // Test the migration by checking if key tables/columns exist
        console.log('🔍 Verifying migration results...');
        
        // Test organizations table
        const { data: orgsTest, error: orgsError } = await supabase
            .from('organizations')
            .select('id')
            .limit(1);
            
        if (!orgsError) {
            console.log('✅ organizations table exists and is accessible');
        } else {
            console.log('⚠️  organizations table issue:', orgsError.message);
        }
        
        // Test barbershop_staff table
        const { data: staffTest, error: staffError } = await supabase
            .from('barbershop_staff')
            .select('id')
            .limit(1);
            
        if (!staffError) {
            console.log('✅ barbershop_staff table exists and is accessible');
        } else {
            console.log('⚠️  barbershop_staff table issue:', staffError.message);
        }
        
        // Test barbershops organization_id column
        const { data: barbershopsTest, error: barbershopsError } = await supabase
            .from('barbershops')
            .select('id, organization_id')
            .limit(1);
            
        if (!barbershopsError) {
            console.log('✅ barbershops.organization_id column exists');
        } else {
            console.log('⚠️  barbershops.organization_id column issue:', barbershopsError.message);
        }
        
        console.log('🎉 Location editing migration process completed!');
        console.log('');
        console.log('Next Steps:');
        console.log('1. Test location editing functionality in your application');
        console.log('2. Check that organization-level access control works');
        console.log('3. Verify that staff can access appropriate locations');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('Manual Migration Alternative:');
        console.log('1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql');
        console.log('2. Copy and paste the contents of: migrations/20250902_fix_schema_inconsistencies.sql');
        console.log('3. Click "RUN" to execute the migration');
        
        process.exit(1);
    }
}

// Run the migration
runLocationMigration().catch(console.error);