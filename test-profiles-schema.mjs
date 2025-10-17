import 'dotenv/config';
import supabaseQuery from './lib/supabase-query.js';

async function testProfilesTable() {
  console.log('=== CHECKING PROFILES TABLE ===\n');

  // 1. List all tables
  console.log('1. Listing all tables...');
  const tables = await supabaseQuery.listTables();
  console.log('Tables found:', tables.length);
  console.log(tables.map(t => t.table_name || t).join(', '));
  console.log();

  // 2. Get profiles table schema
  console.log('2. Getting profiles table schema...');
  const schema = await supabaseQuery.getTableSchema('profiles');
  if (schema.error) {
    console.log('ERROR:', schema.error);
  } else if (schema.data && schema.data.length > 0) {
    console.log('Profiles table columns:');
    schema.data.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
  } else {
    console.log('Profiles table DOES NOT EXIST or exec_sql RPC is not available');
    console.log('Response:', JSON.stringify(schema, null, 2));
  }
  console.log();

  // 3. Query profiles table directly
  console.log('3. Querying profiles table directly (checking if table exists)...');
  const profiles = await supabaseQuery.queryTable('profiles', { limit: 5 });
  if (profiles.error) {
    console.log('ERROR querying profiles:', profiles.error);
    console.log('This likely means the profiles table does NOT exist');
  } else {
    console.log('✓ Profiles table EXISTS');
    console.log('Profile count:', profiles.data?.length || 0);
    if (profiles.data && profiles.data.length > 0) {
      console.log('Sample profiles:');
      profiles.data.forEach(p => {
        console.log(`  - ID: ${p.id?.substring(0, 8)}..., Email: ${p.email}, Role: ${p.role}, Created: ${p.created_at}`);
      });
    } else {
      console.log('⚠ Table exists but is EMPTY - no profiles found');
    }
  }
  console.log();

  // 4. Check for users table (from complete-schema.sql)
  console.log('4. Checking for users table...');
  const usersSchema = await supabaseQuery.getTableSchema('users');
  if (usersSchema.error) {
    console.log('Users table does not exist or error:', usersSchema.error);
  } else if (usersSchema.data && usersSchema.data.length > 0) {
    console.log('✓ Users table EXISTS with', usersSchema.data.length, 'columns');
    console.log('Key columns:', usersSchema.data.slice(0, 5).map(c => c.column_name).join(', '));
  } else {
    console.log('Users table does not exist');
  }
  console.log();

  // 5. Query auth.users (Supabase auth table)
  console.log('5. Checking auth.users table (Supabase Auth)...');
  try {
    const { data, error } = await supabaseQuery.queryTable('auth.users', { limit: 5 });
    if (error) {
      console.log('Cannot query auth.users:', error);
    } else {
      console.log('✓ Auth.users accessible, user count:', data?.length || 0);
      if (data && data.length > 0) {
        data.forEach(u => {
          console.log(`  - ID: ${u.id?.substring(0, 8)}..., Email: ${u.email}, Created: ${u.created_at}`);
        });
      }
    }
  } catch (err) {
    console.log('Cannot query auth.users (expected - requires special permissions)');
  }
}

testProfilesTable()
  .then(() => {
    console.log('\n=== TEST COMPLETE ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
