#!/usr/bin/env node

/**
 * Deploy Marketing Tables to Supabase
 * This script creates all production marketing tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMarketingTables() {
    console.log('🚀 Deploying Marketing Tables to Supabase');
    console.log('=========================================\n');
    
    try {
        // Read the production schema
        const schemaPath = path.join(__dirname, '..', 'database', 'production-marketing-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split into individual statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));
        
        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            
            // Extract statement type and name for logging
            const statementType = statement.match(/^(CREATE|ALTER|DROP)\s+(TABLE|INDEX|TRIGGER|FUNCTION)/i)?.[0] || 'SQL';
            const tableName = statement.match(/(?:TABLE|INDEX|TRIGGER|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[1] || '';
            
            process.stdout.write(`${i + 1}/${statements.length} ${statementType} ${tableName}... `);
            
            try {
                // For table creation, use direct SQL execution
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement
                });
                
                if (error) {
                    // Try alternative approach for some statements
                    if (error.message.includes('exec_sql')) {
                        // If exec_sql doesn't exist, we need to handle this differently
                        console.log('⚠️  exec_sql not available, skipping');
                        errors.push({
                            statement: statementType + ' ' + tableName,
                            error: 'exec_sql RPC not available - manual execution required'
                        });
                        errorCount++;
                    } else {
                        console.log('❌ Error');
                        errors.push({
                            statement: statementType + ' ' + tableName,
                            error: error.message
                        });
                        errorCount++;
                    }
                } else {
                    console.log('✅ Success');
                    successCount++;
                }
            } catch (err) {
                console.log('❌ Exception');
                errors.push({
                    statement: statementType + ' ' + tableName,
                    error: err.message
                });
                errorCount++;
            }
        }
        
        // Summary
        console.log('\n=========================================');
        console.log('📊 Deployment Summary:');
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${errorCount}`);
        
        if (errors.length > 0) {
            console.log('\n⚠️  Errors encountered:');
            errors.forEach(err => {
                console.log(`   - ${err.statement}: ${err.error}`);
            });
            
            console.log('\n💡 Alternative Deployment Method:');
            console.log('   Since exec_sql RPC is not available, you can:');
            console.log('   1. Go to Supabase Dashboard → SQL Editor');
            console.log('   2. Copy the contents of database/production-marketing-schema.sql');
            console.log('   3. Paste and execute in the SQL editor');
            console.log('   4. Or use Supabase CLI: supabase db push');
        }
        
        // Test if tables were created
        console.log('\n🔍 Verifying table creation...');
        await verifyTables();
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

async function verifyTables() {
    const tables = [
        'marketing_campaigns',
        'campaign_recipients',
        'marketing_billing_records',
        'customer_segments',
        'email_unsubscribes',
        'sms_opt_outs',
        'campaign_queue',
        'webhook_events'
    ];
    
    console.log('\n📋 Checking for marketing tables:');
    
    for (const table of tables) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.log(`   ❌ ${table}: Not found or error`);
            } else {
                console.log(`   ✅ ${table}: Exists`);
            }
        } catch (err) {
            console.log(`   ❌ ${table}: ${err.message}`);
        }
    }
    
    console.log('\n💡 Next Steps:');
    console.log('   1. If tables are missing, deploy manually via Supabase Dashboard');
    console.log('   2. Run test-marketing-database.js to verify functionality');
    console.log('   3. Continue with Phase 1.2: Environment configuration');
}

// Run deployment
deployMarketingTables().catch(console.error);