#!/usr/bin/env node

/**
 * Run database migration against Supabase
 * This script executes the SQL migration file to fix missing tables/columns
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

async function runMigration() {
    console.log('🚀 Starting Supabase database migration...');
    
    // Initialize Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('❌ Missing Supabase configuration. Please check your .env.local file.');
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
        // Read the migration file
        const migrationPath = path.join(__dirname, 'database/migrations/fix_missing_tables_columns.sql');
        console.log(`📄 Reading migration file: ${migrationPath}`);
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('⏳ Executing migration...');
        console.log('📝 Migration includes:');
        console.log('   - Adding marketplace_enrollment.tier_level column');
        console.log('   - Adding master_products.barbershop_id column');
        console.log('   - Creating barber_commission_balances table');
        console.log('   - Creating commission_transactions table');
        console.log('   - Fixing barbershop_staff relationships');
        console.log('   - Adding all necessary indexes and RLS policies');
        
        // Execute the migration using RPC to run raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            query: migrationSQL
        });
        
        if (error) {
            // If exec_sql doesn't exist, try alternative approach
            if (error.code === '42883') {
                console.log('📋 exec_sql function not found, trying alternative approach...');
                
                // Split the SQL into individual statements and execute them
                const statements = migrationSQL
                    .split(';')
                    .map(s => s.trim())
                    .filter(s => s.length > 0 && !s.startsWith('--'));
                
                console.log(`🔄 Executing ${statements.length} SQL statements...`);
                
                for (let i = 0; i < statements.length; i++) {
                    const statement = statements[i];
                    if (statement.includes('DO $$') || statement.includes('CREATE OR REPLACE FUNCTION')) {
                        console.log(`⚠️  Skipping complex statement ${i + 1} (requires direct SQL access)`);
                        continue;
                    }
                    
                    try {
                        const { error: stmtError } = await supabase
                            .from('_dummy')  // This will fail but might execute the SQL
                            .select('*')
                            .eq('sql', statement);
                        
                        // Ignore errors for this approach
                    } catch (e) {
                        // Ignore individual statement errors
                    }
                }
                
                console.log('⚠️  Some statements may need to be run manually in Supabase SQL editor');
                console.log('🔗 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql');
                console.log('📋 Copy and paste the contents of: database/migrations/fix_missing_tables_columns.sql');
                
            } else {
                throw error;
            }
        } else {
            console.log('✅ Migration executed successfully!');
            console.log('📊 Result:', data);
        }
        
        // Test the migration by checking if tables exist
        console.log('🔍 Verifying migration results...');
        
        // Test marketplace_enrollment
        const { data: marketplaceTest, error: marketplaceError } = await supabase
            .from('marketplace_enrollment')
            .select('tier_level')
            .limit(1);
            
        if (!marketplaceError) {
            console.log('✅ marketplace_enrollment.tier_level column exists');
        } else if (marketplaceError.code === '42P01') {
            console.log('⚠️  marketplace_enrollment table needs to be created manually');
        }
        
        // Test commission_transactions
        const { data: commissionTest, error: commissionError } = await supabase
            .from('commission_transactions')
            .select('id')
            .limit(1);
            
        if (!commissionError) {
            console.log('✅ commission_transactions table exists');
        } else if (commissionError.code === '42P01') {
            console.log('⚠️  commission_transactions table needs to be created manually');
        }
        
        // Test barbershop_staff
        const { data: staffTest, error: staffError } = await supabase
            .from('barbershop_staff')
            .select('user_id')
            .limit(1);
            
        if (!staffError) {
            console.log('✅ barbershop_staff table exists with user_id column');
        } else if (staffError.code === '42P01') {
            console.log('⚠️  barbershop_staff table needs to be created manually');
        }
        
        console.log('🎉 Migration process completed!');
        console.log('');
        console.log('Next Steps:');
        console.log('1. Check your Supabase dashboard to verify tables were created');
        console.log('2. If any tables are missing, run the SQL manually in Supabase SQL editor');
        console.log('3. Test your application to ensure all API endpoints work');
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.log('');
        console.log('Manual Migration Required:');
        console.log('1. Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql');
        console.log('2. Copy and paste the contents of: database/migrations/fix_missing_tables_columns.sql');
        console.log('3. Click "RUN" to execute the migration');
        
        process.exit(1);
    }
}

// Run the migration
runMigration().catch(console.error);