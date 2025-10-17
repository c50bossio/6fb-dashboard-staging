const { createClient } = require('./lib/supabase/UNIFIED_CLIENT.js');

async function checkUserRole() {
  const supabase = createClient();
  
  // Check Chris Bossio's profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, barbershop_id, shop_id')
    .eq('email', 'bossio@bookedbarber.com')
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    return;
  }
  
  console.log('User Profile:', JSON.stringify(profile, null, 2));
  
  // Check if the barbershop exists
  if (profile.barbershop_id || profile.shop_id) {
    const shopId = profile.barbershop_id || profile.shop_id;
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .eq('id', shopId)
      .single();
    
    console.log('Associated Shop:', JSON.stringify(shop, null, 2));
    console.log('Is Owner?', shop?.owner_id === profile.id);
  }
  
  // Check staff records
  const { data: staffRecords } = await supabase
    .from('barbershop_staff')
    .select('*')
    .eq('user_id', profile.id);
  
  console.log('Staff Records:', JSON.stringify(staffRecords, null, 2));
}

checkUserRole();
