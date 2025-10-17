const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserLocations() {
  console.log('🔧 Fixing user_locations table...\n');

  const userId = '303bb1b9-5d25-4874-8380-4de3ad1e965c';
  const shopId = '1ca6138d-eae8-46ed-abff-5d6e52fbd21b';

  // Delete any existing entries for this user
  await supabase
    .from('user_locations')
    .delete()
    .eq('user_id', userId);

  console.log('🗑️  Cleared existing user_locations entries');

  // Insert correct location
  const { data, error } = await supabase
    .from('user_locations')
    .insert({
      user_id: userId,
      barbershop_id: shopId,
      is_primary: true,
      has_access: true,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Added user to Elite Cuts Barbershop');
  console.log('   User ID:', userId);
  console.log('   Shop ID:', shopId);
  console.log('   Is Primary: true\n');

  console.log('🎉 Location selector should now show the correct shop!');
  console.log('   Refresh the calendar page to see your 60 appointments.');
}

fixUserLocations().catch(console.error);
