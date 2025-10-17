const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLocationsAPI() {
  console.log('🧪 Testing /api/user/locations endpoint...\n');

  const userId = '303bb1b9-5d25-4874-8380-4de3ad1e965c';
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, barbershop_id')
    .eq('id', userId)
    .single();

  console.log('👤 User Profile:');
  console.log(`   Email: ${profile.email}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   barbershop_id: ${profile.barbershop_id}\n`);

  // Simulate what getUserAccessibleLocations does
  console.log('🔍 Simulating getUserAccessibleLocations logic...\n');

  // BARBER role permissions
  const permittedLevels = ['RESOURCE']; // From LOCATION_PERMISSIONS
  console.log(`   Role permissions: ${permittedLevels.join(', ')}`);
  console.log(`   Has 'LOCATION' permission: ${permittedLevels.includes('LOCATION')}\n`);

  // Check fallback
  console.log('🔄 Checking FALLBACK (profile.barbershop_id)...');
  if (profile.barbershop_id) {
    const { data: shopData, error } = await supabase
      .from('barbershops')
      .select('id, name, address, city, state, phone, email, business_hours, is_active, owner_id')
      .eq('id', profile.barbershop_id)
      .single();

    if (error) {
      console.log('   ❌ Error querying barbershop:', error.message);
    } else if (shopData) {
      console.log('   ✅ Found barbershop via fallback:');
      console.log(`      Name: ${shopData.name}`);
      console.log(`      ID: ${shopData.id}`);
      console.log(`      Active: ${shopData.is_active}`);
      console.log(`      Owner: ${shopData.owner_id || 'null'}`);
      console.log('\n   📍 Location object that should be returned:');
      console.log(JSON.stringify({
        id: shopData.id,
        name: shopData.name,
        city: shopData.city,
        state: shopData.state
      }, null, 2));
    } else {
      console.log('   ⚠️  No barbershop found with ID:', profile.barbershop_id);
    }
  } else {
    console.log('   ❌ No barbershop_id in profile!');
  }
}

testLocationsAPI().catch(console.error);
