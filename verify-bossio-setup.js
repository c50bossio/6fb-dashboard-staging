import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySetup() {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, barbershops!barbershop_id(*)')
    .eq('email', null /* hardcoded ID removed for production */)
    .single();
  
  if (profile) {

    if (profile.barbershops) {

    }

     + ' Add Location - ' + 
      (profile.role === 'ENTERPRISE_OWNER' ? 'Create new locations' : 'Requires Enterprise upgrade'));

  }
  
  process.exit(0);
}

verifySetup();
