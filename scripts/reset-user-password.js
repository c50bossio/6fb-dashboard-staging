#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function resetUserPassword() {
  const email = 'c50bossio@gmail.com';
  const newPassword = 'test123';
  
  console.log(`🔐 Resetting password for ${email}...\n`);

  try {
    const { data: usersData, error: getUsersError } = await supabase.auth.admin.listUsers();
    
    if (getUsersError) {
      throw getUsersError;
    }
    
    const user = usersData.users.find(u => u.email === email);
    
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return;
    }
    
    console.log(`✅ Found user: ${email} (ID: ${user.id})`);
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`✅ Password reset successfully for ${email}`);
    console.log('\n📝 Updated Credentials:');
    console.log('─'.repeat(40));
    console.log(`Email:    ${email}`);
    console.log(`Password: ${newPassword}`);
    console.log('─'.repeat(40));
    
    console.log('\n🎯 You can now:');
    console.log('1. Go to http://localhost:9999/login');
    console.log('2. Sign in with the updated credentials above');
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

resetUserPassword();