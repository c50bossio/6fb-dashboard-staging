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
    .eq('email', null /* hardcoded ID removed for production */)
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
