import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getProfilesSchema() {
  console.log('=== PROFILES TABLE DETAILED ANALYSIS ===\n');

  // 1. Get all profiles with all columns
  console.log('1. Querying profiles table to see actual structure...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.error('Error querying profiles:', profilesError);
  } else if (profiles && profiles.length > 0) {
    console.log('✓ Profiles table structure (from sample record):');
    const sampleProfile = profiles[0];
    Object.keys(sampleProfile).forEach(key => {
      const value = sampleProfile[key];
      const type = typeof value;
      console.log(`  - ${key}: ${type} = ${JSON.stringify(value)}`);
    });
  } else {
    console.log('⚠ Table is empty, cannot determine structure from data');
  }
  console.log();

  // 2. Check PostgreSQL information_schema directly via REST API
  console.log('2. Querying information_schema.columns...');
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_profiles_schema', {});

  if (columnsError) {
    console.log('RPC function not available:', columnsError.message);
    console.log('Attempting direct query to information_schema...');

    // Try direct query (this usually requires specific permissions)
    const { data: schemaData, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.log('Cannot query information_schema:', schemaError.message);
    } else if (schemaData) {
      console.log('✓ Schema from information_schema:');
      schemaData.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
    }
  }
  console.log();

  // 3. Check for RLS policies
  console.log('3. Checking Row Level Security (RLS) policies...');
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_table_policies', { table_name: 'profiles' });

  if (policiesError) {
    console.log('Cannot query policies:', policiesError.message);
    console.log('(This is expected - requires custom RPC function)');
  } else if (policies) {
    console.log('✓ RLS Policies found:', policies);
  }
  console.log();

  // 4. Test insert permissions
  console.log('4. Testing INSERT permissions (dry run)...');
  const testProfile = {
    id: '00000000-0000-0000-0000-000000000000', // Will fail due to unique constraint
    email: 'test-insert-permission@test.com',
    role: 'CLIENT'
  };

  const { data: insertTest, error: insertError } = await supabase
    .from('profiles')
    .insert(testProfile)
    .select();

  if (insertError) {
    console.log('Insert test result:', insertError.message);
    if (insertError.code === '23505') {
      console.log('✓ INSERT permission granted (unique constraint failed as expected)');
    } else if (insertError.code === '42501') {
      console.log('⚠ RLS POLICY BLOCKING INSERTS');
    } else {
      console.log('⚠ Other insert error:', insertError.code);
    }
  } else {
    console.log('✓ Insert succeeded (unexpected - should have failed on unique constraint)');
    // Clean up
    await supabase.from('profiles').delete().eq('id', testProfile.id);
  }
  console.log();

  // 5. Check auth.users vs profiles
  console.log('5. Checking Supabase Auth integration...');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.log('Cannot list auth users:', authError.message);
  } else if (authUsers) {
    console.log(`✓ Found ${authUsers.users.length} users in auth.users`);

    // Check if profiles exist for auth users
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email');

    const profileIds = new Set(profilesData?.map(p => p.id) || []);
    const authUserIds = authUsers.users.map(u => u.id);

    const missingProfiles = authUserIds.filter(id => !profileIds.has(id));

    if (missingProfiles.length > 0) {
      console.log(`⚠ ${missingProfiles.length} auth users WITHOUT profiles:`);
      missingProfiles.forEach(id => {
        const user = authUsers.users.find(u => u.id === id);
        console.log(`  - ${user.email} (${id})`);
      });
    } else {
      console.log('✓ All auth users have profiles');
    }
  }
}

getProfilesSchema()
  .then(() => {
    console.log('\n=== ANALYSIS COMPLETE ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
