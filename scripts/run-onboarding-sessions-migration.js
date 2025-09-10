#!/usr/bin/env node

/**
 * Run Onboarding Sessions Database Migration
 * 
 * This script applies the onboarding sessions migration to Supabase
 * for real-time cross-tab state management
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

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
    const migrationPath = path.join(__dirname, '..', 'database', 'onboarding-sessions-migration.sql');
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
        }...`);
        
        const { data, error } = await supabase.rpc('exec', {
          query: statement + ';'
        });

        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.message.includes('duplicate key') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            `);
          } else {
            
            // Don't fail on warnings, continue execution
          }
        } else {
          
        }
      } catch (err) {
        
      }
    }

    // Test onboarding_sessions table
    try {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('*')
        .limit(1);

      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Test active_onboarding_sessions view
    try {
      const { data, error } = await supabase
        .from('active_onboarding_sessions')
        .select('*')
        .limit(1);

      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Test RLS policies
    
    try {
      // This should work if RLS is properly configured
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('id')
        .limit(1);

      if (error) {
        
      } else {
        
      }
    } catch (err) {
      
    }

    // Test functions
    
    const functions = [
      'update_onboarding_sessions_updated_at',
      'cleanup_expired_onboarding_sessions',
      'notify_onboarding_session_change'
    ];

    for (const func of functions) {
      try {
        const { data, error } = await supabase.rpc('exec', {
          query: `SELECT routine_name FROM information_schema.routines WHERE routine_name = '${func}';`
        });
        
        if (error) {
          
        } else {
          
        }
      } catch (err) {
        
      }
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);

    process.exit(1);
  }
}

runMigration();