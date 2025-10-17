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

async function checkEmailSettings() {
  
  );
  
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];

  );
  
  try {
    
    const testEmail = `test_${Date.now()}@example.com`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
    });
    
    if (signUpError) {
      
    } else if (signUpData.user && !signUpData.session) {

    } else if (signUpData.session) {

    }
    
    if (signUpData?.user) {
      await supabase.auth.admin.deleteUser(signUpData.user.id).catch(() => {});
    }
  } catch (error) {
    
  }

  ');
  ');

  );

  );
  
  try {
    const { data: testUser } = await supabase.auth.admin.getUserByEmail('test@barbershop.com');
    
    if (testUser?.user) {

    }
  } catch (error) {
    
  }

  );

  );
  :');

}

checkEmailSettings().catch(console.error);