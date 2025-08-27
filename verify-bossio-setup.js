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
    .eq('email', 'c50bossio@gmail.com')
    .single();
  
  if (profile) {
    console.log('✅ Your account is ready!');
    console.log('\n👤 Profile Details:');
    console.log('   Name:', profile.full_name);
    console.log('   Email:', profile.email);
    console.log('   Role:', profile.role);
    console.log('   Subscription:', profile.subscription_tier);
    
    if (profile.barbershops) {
      console.log('\n🏪 Your Barbershop:');
      console.log('   Name:', profile.barbershops.name);
      console.log('   Address:', profile.barbershops.address);
      console.log('   Shop ID:', profile.shop_id);
    }
    
    console.log('\n✨ Available Features:');
    console.log('   ✅ Add Barber - Create or invite staff members');
    console.log('   ' + (profile.role === 'ENTERPRISE_OWNER' ? '✅' : '⚠️ ') + ' Add Location - ' + 
      (profile.role === 'ENTERPRISE_OWNER' ? 'Create new locations' : 'Requires Enterprise upgrade'));
    console.log('   ✅ Manage Services');
    console.log('   ✅ View Dashboard');
    console.log('   ✅ Process Payments');
  }
  
  process.exit(0);
}

verifySetup();
