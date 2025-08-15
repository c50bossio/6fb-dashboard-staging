#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function cleanupTestUsers() {
  console.log('🧹 Cleaning Up Test Users\n');
  console.log('=' .repeat(50));
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.log('\nTo get your service role key:');
    console.log('1. Go to Supabase Dashboard → Settings → API');
    console.log('2. Copy the "service_role" key (not anon key)');
    console.log('3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
    console.log('\n⚠️  Service role key has admin privileges - keep it secure!');
    return;
  }
  
  try {
    console.log('🔍 Finding test users...');
    
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return;
    }
    
    const testUsers = users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      return (
        email.includes('test') ||
        email.includes('@gmail.com') && email.includes('test') ||
        email.includes('testuser') ||
        email.includes('testflow') ||
        email.includes('@barbershop.com') ||
        email.includes('@example.com')
      );
    });
    
    console.log(`\n📋 Found ${testUsers.length} test users:`);
    console.log('─'.repeat(50));
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found to clean up');
      return;
    }
    
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id})`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Verified: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    });
    
    console.log('\n⚠️  DELETION OPTIONS:');
    console.log('─'.repeat(50));
    console.log('Option 1: Delete via Supabase SQL Editor');
    console.log('Option 2: Delete via service role (if configured)');
    console.log('Option 3: Keep for testing (recommended)');
    
    console.log('\n🔧 SQL Commands to Delete (use in Supabase SQL Editor):');
    console.log('─'.repeat(50));
    
    testUsers.forEach((user, index) => {
      console.log(`-- Delete user ${index + 1}: ${user.email}`);
      console.log(`DELETE FROM auth.users WHERE id = '${user.id}';`);
      console.log('');
    });
    
    console.log('💡 Delete All Test Users (use carefully):');
    console.log('─'.repeat(50));
    console.log(`DELETE FROM auth.users WHERE email LIKE '%test%';`);
    console.log(`DELETE FROM auth.users WHERE email LIKE '%@example.com';`);
    console.log(`DELETE FROM auth.users WHERE email LIKE '%barbershop.com';`);
    
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('─'.repeat(50));
    console.log('• User deletion is irreversible');
    console.log('• This will also delete related profile data');
    console.log('• Consider keeping one test user for ongoing testing');
    console.log('• Production users should never be deleted this way');
    
    console.log('\n🎯 RECOMMENDED APPROACH:');
    console.log('─'.repeat(50));
    console.log('1. Keep one verified test user for ongoing testing');
    console.log('2. Delete only unverified/incomplete test accounts');
    console.log('3. Use the SQL commands above in Supabase dashboard');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('🔗 To delete users manually:');
  console.log('Go to: Supabase Dashboard → SQL Editor');
  console.log('Run the DELETE commands shown above');
  console.log('=' .repeat(50) + '\n');
}

cleanupTestUsers().catch(console.error);