#!/usr/bin/env node

/**
 * Run Supabase Database Migration
 * 
 * This script applies the subscription migration to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase environment variables not found');
  
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {

  try {
    const migrationPath = path.join(__dirname, '..', 'database', 'subscription-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    }KB\n`);

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement || statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {

        const { data, error } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key')) {
            : ${statement.substring(0, 50)}...`);
          } else {
            
            }...`);
          }
        } else {
          
        }
      } catch (err) {
        
      }
    }

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
          
        } else {
          
        }
      } catch (err) {
        
      }
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, subscription_tier, subscription_status, stripe_customer_id')
        .limit(1);

      if (error) {

      } else {
        
      }
    } catch (err) {
      
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    process.exit(1);
  }
}

runMigration();