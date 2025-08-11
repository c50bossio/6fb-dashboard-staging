require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function executeMigration() {
  console.log('🚀 Starting database migration...\n');
  
  // Read the SQL file
  const sqlContent = fs.readFileSync('./FIX_APPOINTMENT_TABLES_NOW.sql', 'utf8');
  
  // Split SQL into individual statements (removing comments and empty lines)
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('/*'))
    .map(stmt => stmt + ';');

  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip if statement is just whitespace or comments
    if (!statement.trim() || statement.trim() === ';') continue;
    
    // Get first 50 chars of statement for logging
    const stmtPreview = statement.substring(0, 50).replace(/\n/g, ' ');
    
    try {
      // For ALTER TABLE and CREATE statements, we need to use raw SQL
      // Supabase JS client doesn't support DDL directly, so we'll handle these differently
      
      if (statement.includes('ALTER TABLE') || 
          statement.includes('CREATE INDEX') || 
          statement.includes('CREATE TRIGGER') ||
          statement.includes('CREATE OR REPLACE FUNCTION') ||
          statement.includes('CREATE OR REPLACE VIEW') ||
          statement.includes('CREATE POLICY') ||
          statement.includes('DROP TRIGGER')) {
        
        // These DDL statements can't be run via Supabase JS client
        // We'll need to handle them via direct SQL execution
        console.log(`⚠️  DDL Statement needs manual execution: ${stmtPreview}...`);
        errors.push({
          statement: stmtPreview,
          error: 'DDL statements must be run in Supabase SQL Editor'
        });
        errorCount++;
        
      } else if (statement.includes('UPDATE customers') || statement.includes('UPDATE bookings')) {
        // Try to execute UPDATE statements
        console.log(`📝 Executing UPDATE: ${stmtPreview}...`);
        
        // Parse and execute UPDATE statements using Supabase client
        if (statement.includes('UPDATE customers')) {
          // This is complex SQL that needs direct execution
          console.log(`⚠️  Complex UPDATE needs manual execution`);
          errors.push({
            statement: stmtPreview,
            error: 'Complex UPDATE must be run in Supabase SQL Editor'
          });
          errorCount++;
        } else {
          console.log(`⚠️  UPDATE statement needs manual execution`);
          errors.push({
            statement: stmtPreview,
            error: 'UPDATE statements must be run in Supabase SQL Editor'
          });
          errorCount++;
        }
        
      } else if (statement.includes('INSERT INTO customers')) {
        console.log(`📝 Executing INSERT: ${stmtPreview}...`);
        console.log(`⚠️  Complex INSERT needs manual execution`);
        errors.push({
          statement: stmtPreview,
          error: 'Complex INSERT must be run in Supabase SQL Editor'
        });
        errorCount++;
      } else {
        console.log(`⏭️  Skipping: ${stmtPreview}...`);
      }
      
    } catch (error) {
      console.error(`❌ Error executing statement ${i + 1}:`, error.message);
      errors.push({
        statement: stmtPreview,
        error: error.message
      });
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successful statements: ${successCount}`);
  console.log(`❌ Failed statements: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️  The following statements need to be run manually in Supabase SQL Editor:');
    console.log('='.repeat(60));
    
    // Save SQL for manual execution
    const manualSQL = fs.readFileSync('./FIX_APPOINTMENT_TABLES_NOW.sql', 'utf8');
    
    console.log('\n📋 INSTRUCTIONS:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Create a new query');
    console.log('4. Copy and paste the contents of FIX_APPOINTMENT_TABLES_NOW.sql');
    console.log('5. Click "Run" to execute all statements');
    console.log('\n✅ The SQL file has been prepared and is ready for manual execution.');
    console.log('📁 File location: /Users/bossio/6FB AI Agent System/FIX_APPOINTMENT_TABLES_NOW.sql');
  }
}

executeMigration()
  .then(() => {
    console.log('\n✅ Migration preparation complete!');
    console.log('⚠️  IMPORTANT: Please run the SQL manually in Supabase SQL Editor');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });