#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import 'dotenv/config';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQLFile() {
  try {
    const sqlFilePath = join(__dirname, '../database/supabase-setup.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;
    
    for (const [index, statement] of statements.entries()) {
      try {

        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_statement: statement + ';' 
        });
        
        if (error) {
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);
          
          if (directError && directError.message?.includes('relation "information_schema.tables"')) {
            
          } else {
            throw error;
          }
        }

        successCount++;
        
      } catch (error) {
        console.error(`❌ Error executing statement ${index + 1}:`, error.message);
         + '...');
        errorCount++;
      }
    }

    return errorCount === 0;
    
  } catch (error) {
    console.error('💥 Failed to execute SQL setup:', error);
    return false;
  }
}

async function createTablesDirectly() {

  try {
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      return false;
    }

    [1].split('.')[0]);

    return true;
    
  } catch (error) {
    console.error('💥 Direct table creation failed:', error);
    return false;
  }
}

async function verifySetup() {

  try {
    const { data: barbershops, error } = await supabase
      .from('barbershops')
      .select('id, name, shop_slug, website_enabled')
      .limit(5);
    
    if (error) {
      console.error('❌ Verification failed - barbershops table not accessible:', error.message);
      return false;
    }

    if (barbershops && barbershops.length > 0) {
      
      barbershops.forEach(shop => {
         [${shop.website_enabled ? 'enabled' : 'disabled'}]`);
      });
    }
    
    const { data: demoShop, error: demoError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single();
    
    if (demoError) {
      
      return true; // Not a failure, just needs setup
    }

    return true;
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
    return false;
  }
}

async function main() {

  const setupSuccess = await verifySetup();
  
  if (!setupSuccess) {

    const sqlSuccess = await executeSQLFile();
    
    if (!sqlSuccess) {
      
      await createTablesDirectly();
    }

    const finalSuccess = await verifySetup();
    
    if (finalSuccess) {

    } else {

    }
  } else {

  }

}

main().catch(console.error);