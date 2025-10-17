#!/usr/bin/env node
/**
 * Diagnose 406 Error on user_context_preferences
 */

const { createClient } = require('@supabase/supabase-js');

async function diagnose406Error() {
  console.log('🔍 Diagnosing 406 Error on user_context_preferences\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const userId = '2951b2ff-9856-4d95-ab81-9dbc3db741e2';

  try {
    // Step 1: Check if table exists
    console.log('📋 Step 1: Checking table schema...');
    const { data: schema, error: schemaError } = await supabase
      .from('user_context_preferences')
      .select('*')
      .limit(0);

    if (schemaError) {
      console.error('❌ Schema error:', schemaError.message);
      console.log('   Hint:', schemaError.hint);
      console.log('   Details:', schemaError.details);
      return;
    }
    console.log('✅ Table exists\n');

    // Step 2: Check RLS policies
    console.log('🔐 Step 2: Checking RLS policies...');
    const { data: policies, error: policyError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT policyname, cmd, qual::text, with_check::text
        FROM pg_policies
        WHERE tablename = 'user_context_preferences'
        ORDER BY policyname;
      `
    });

    if (policyError) {
      console.log('⚠️  Could not query policies (expected - using service role)');
    } else {
      console.log('Policies:', policies);
    }

    // Step 3: Try to query the table
    console.log('\n🔍 Step 3: Attempting query with service role...');
    const { data, error, status, statusText } = await supabase
      .from('user_context_preferences')
      .select('default_context, last_context')
      .eq('user_id', userId)
      .single();

    console.log('Status:', status, statusText);

    if (error) {
      console.error('❌ Query error:', error.message);
      console.log('   Code:', error.code);
      console.log('   Details:', error.details);
      console.log('   Hint:', error.hint);

      if (error.code === 'PGRST116') {
        console.log('\n💡 DIAGNOSIS: No row found for this user_id');
        console.log('   This is expected if user has never set preferences');
        console.log('   Frontend should handle this gracefully\n');

        // Try inserting default preferences
        console.log('🔧 Attempting to create default preferences...');
        const { data: insertData, error: insertError } = await supabase
          .from('user_context_preferences')
          .insert({
            user_id: userId,
            default_context: { view: 'all-barbers' },
            last_context: { view: 'all-barbers' }
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Insert failed:', insertError.message);
        } else {
          console.log('✅ Default preferences created!');
          console.log('   Data:', insertData);
        }
      }
    } else {
      console.log('✅ Query successful!');
      console.log('   Data:', data);
    }

    // Step 4: Check if it's an Accept header issue
    console.log('\n📡 Step 4: Testing with explicit Accept header...');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_context_preferences?select=default_context,last_context&user_id=eq.${userId}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response status:', response.status, response.statusText);

    if (response.status === 406) {
      console.log('❌ 406 Not Acceptable - Content negotiation failed');
      console.log('   Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('   Response body:', responseText);
    } else {
      const responseData = await response.json();
      console.log('✅ REST API response:', responseData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error.stack);
  }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

diagnose406Error();
