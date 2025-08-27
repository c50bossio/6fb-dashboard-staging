import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function finalCheck() {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'c50bossio@gmail.com')
    .single();
  
  if (error) {
    
  } else if (profile) {

     ✅');

    if (profile.role === 'ENTERPRISE_OWNER') {
      
    } else {
      ');
    }
  }
  
  process.exit(0);
}

finalCheck();
