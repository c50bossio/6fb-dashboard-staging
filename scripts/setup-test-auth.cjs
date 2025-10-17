#!/usr/bin/env node
/**
 * Setup Test Authentication Users
 * Creates test users in Supabase for authentication testing
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

async function setupTestUsers() {

  const testUsers = [
    {
      email: 'demo@bookedbarber.com',
      password: 'Demo123!@#',
      userData: {
        full_name: 'Demo User',
        role: 'user',
        phone: '+1-555-0100'
      }
    },
    {
      email: 'barber@bookedbarber.com',
      password: 'Barber123!@#',
      userData: {
        full_name: 'Test Barber',
        role: 'barber',
        phone: '+1-555-0101'
      }
    },
    {
      email: 'owner@bookedbarber.com',
      password: 'Owner123!@#',
      userData: {
        full_name: 'Shop Owner',
        role: 'shop_owner',
        phone: '+1-555-0102'
      }
    }
  ];

  for (const user of testUsers) {
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirm email for testing
        user_metadata: user.userData
      });

      if (authError) {
        if (authError.message.includes('already exists')) {

          const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
            authData?.id || '', 
            { 
              password: user.password,
              email_confirm: true
            }
          );
          
          if (updateError && !updateError.message.includes('not found')) {
            
          } else {
            
          }
        } else {
          
          continue;
        }
      } else {
        
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        const profileToInsert = {
          id: authData?.id || crypto.randomUUID(),
          email: user.email,
          full_name: user.userData.full_name,
          role: user.userData.role,
          phone: user.userData.phone,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('profiles')
          .insert(profileToInsert);

        if (insertError) {
          
        } else {
          
        }
      } else if (!profileError) {
        
      }

    } catch (error) {
      console.error(`❌ Error processing ${user.email}:`, error.message);
    }
  }

  console.log('✅ Test users setup completed');

}

async function checkAuthSettings() {

  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {

      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to check auth settings:', error.message);
    return false;
  }
}

async function main() {

  const isConnected = await checkAuthSettings();
  
  if (!isConnected) {
    
    process.exit(1);
  }
  
  await setupTestUsers();
}

main().catch(console.error);