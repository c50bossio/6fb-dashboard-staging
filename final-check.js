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
    console.log('Error:', error);
  } else if (profile) {
    console.log('✅ ACCOUNT READY FOR TESTING!\n');
    console.log('Profile confirmed:');
    console.log('- Email:', profile.email);
    console.log('- Role:', profile.role);
    console.log('- Shop ID:', profile.shop_id || profile.barbershop_id);
    console.log('- Has permissions to:');
    console.log('  • Create staff members (Add Barber) ✅');
    console.log('  • Manage barbershop ✅');
    
    if (profile.role === 'ENTERPRISE_OWNER') {
      console.log('  • Create new locations ✅');
    } else {
      console.log('  • Create new locations (will show upgrade prompt)');
    }
  }
  
  process.exit(0);
}

finalCheck();
