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

  try {
    const { data: usersData, error: getUsersError } = await supabase.auth.admin.listUsers();
    
    if (getUsersError) {
      throw getUsersError;
    }
    
    const user = usersData.users.find(u => u.email === email);
    
    if (!user) {
      
      return;
    }
    
    `);
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      throw updateError;
    }

    );

    );

  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    process.exit(1);
  }
}

resetUserPassword();