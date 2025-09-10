#!/usr/bin/env node

/**
 * Run Birthday/Anniversary Database Migration
 * 
 * This script applies the birthday and anniversary features migration to Supabase
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
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '003_add_birthday_anniversary_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    }KB\n`);

    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'BEGIN' && stmt !== 'COMMIT');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (!statement || statement.startsWith('--') || statement.trim() === '') {
        continue;
      }

      try {

        // For Supabase, we use the raw query execution
        const { data, error } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key') ||
              error.message.includes('column') && error.message.includes('already exists')) {
            : ${statement.substring(0, 50)}...`);
          } else {
            
            }...`);
          }
        } else {
          
        }
      } catch (err) {
        
      }
    }

    // Check if birthday/anniversary columns were added
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, birthday, anniversary_date, birthday_reminders_enabled, anniversary_reminders_enabled')
        .limit(1);

      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Check new tables
    const tablesToCheck = [
      'birthday_campaigns',
      'birthday_templates'
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

    // Check if default templates were inserted
    try {
      const { data, error } = await supabase
        .from('birthday_templates')
        .select('id, template_name, template_type')
        .eq('barbershop_id', 'default')
        .eq('is_default', true);

      if (error) {
        
      } else {
        
        data.forEach(template => {
          `);
        });
      }
    } catch (err) {
      
    }

    // Test the get_upcoming_birthdays function
    
    try {
      const { data, error } = await supabase.rpc('get_upcoming_birthdays', {
        p_barbershop_id: 'test',
        p_days_ahead: 30,
        p_campaign_type: 'birthday'
      });

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