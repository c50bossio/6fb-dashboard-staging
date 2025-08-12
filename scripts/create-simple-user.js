#!/usr/bin/env node
/**
 * Create a simple test user with basic password
 */

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

async function createSimpleUser() {
  console.log('Creating simple test user...\n');
  
  const testUser = {
    email: 'test@bookedbarber.com',
    password: 'Test1234',  // Simple password without special characters
    userData: {
      full_name: 'Test User',
      role: 'user'
    }
  };

  try {
    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true,
      user_metadata: testUser.userData
    });

    if (error) {
      if (error.message.includes('already exists')) {
        console.log('User already exists, updating password...');
        
        // Get user ID first
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find(u => u.email === testUser.email);
        
        if (existingUser) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            { password: testUser.password }
          );
          
          if (updateError) {
            console.error('Failed to update password:', updateError.message);
          } else {
            console.log('✅ Password updated successfully');
          }
        }
      } else {
        console.error('Error:', error.message);
        return;
      }
    } else {
      console.log('✅ User created successfully');
    }

    console.log('\n📝 Simple Test Credentials:');
    console.log('   Email: test@bookedbarber.com');
    console.log('   Password: Test1234');
    console.log('\n✅ Ready to test!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createSimpleUser();