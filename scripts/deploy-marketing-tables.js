#!/usr/bin/env node

/**
 * Deploy Marketing Tables to Supabase
 * This script creates all production marketing tables in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployMarketingTables() {

    try {
        const schemaPath = path.join(__dirname, '..', 'database', 'production-marketing-schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i] + ';';
            
            const statementType = statement.match(/^(CREATE|ALTER|DROP)\s+(TABLE|INDEX|TRIGGER|FUNCTION)/i)?.[0] || 'SQL';
            const tableName = statement.match(/(?:TABLE|INDEX|TRIGGER|FUNCTION)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[1] || '';
            
            process.stdout.write(`${i + 1}/${statements.length} ${statementType} ${tableName}... `);
            
            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    sql_query: statement
                });
                
                if (error) {
                    if (error.message.includes('exec_sql')) {
                        
                        errors.push({
                            statement: statementType + ' ' + tableName,
                            error: 'exec_sql RPC not available - manual execution required'
                        });
                        errorCount++;
                    } else {
                        
                        errors.push({
                            statement: statementType + ' ' + tableName,
                            error: error.message
                        });
                        errorCount++;
                    }
                } else {
                    
                    successCount++;
                }
            } catch (err) {
                
                errors.push({
                    statement: statementType + ' ' + tableName,
                    error: err.message
                });
                errorCount++;
            }
        }

        if (errors.length > 0) {
            
            errors.forEach(err => {
                
            });

        }

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

    for (const table of tables) {
        try {
            const { data, error, count } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                
            } else {
                
            }
        } catch (err) {
            
        }
    }

}

deployMarketingTables().catch(console.error);