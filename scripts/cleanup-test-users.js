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
  
  );
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {

    ');

    return;
  }
  
  try {

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      
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

    );
    
    if (testUsers.length === 0) {
      
      return;
    }
    
    testUsers.forEach((user, index) => {
      `);
      .toLocaleString()}`);
      
    });

    );
    
    ');
    ');
    
    :');
    );
    
    testUsers.forEach((user, index) => {

    });
    
    :');
    );

    );

    );

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  );

   + '\n');
}

cleanupTestUsers().catch(console.error);