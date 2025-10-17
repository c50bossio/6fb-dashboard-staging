const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Diagnosing Calendar Appointments Issue...\n');

  // 1. Check total appointments
  const { data: allAppts, error: allError, count } = await supabase
    .from('appointments')
    .select('id, barbershop_id, scheduled_at, status, client_name', { count: 'exact' })
    .limit(5);

  console.log(`📊 Total appointments in database: ${count}`);
  if (allAppts && allAppts.length > 0) {
    console.log(`   Sample appointments:`);
    allAppts.forEach(a => {
      console.log(`   - ${a.id.substring(0,8)}... | ${a.client_name} | ${a.scheduled_at} | Shop: ${a.barbershop_id.substring(0,8)}...`);
    });
  } else {
    console.log('   ⚠️  NO APPOINTMENTS FOUND IN DATABASE');
  }

  // 2. Check profiles with barbershop_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, barbershop_id')
    .not('barbershop_id', 'is', null)
    .limit(3);

  console.log(`\n👥 Users with barbershop_id:`);
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`   - ${p.email}: ${p.barbershop_id.substring(0,8)}...`);
    });
  } else {
    console.log('   ⚠️  NO PROFILES WITH barbershop_id');
  }

  // 3. Check if appointments match any profile's barbershop_id
  if (profiles && profiles.length > 0 && allAppts && allAppts.length > 0) {
    const profileShopIds = new Set(profiles.map(p => p.barbershop_id));
    const apptShopIds = new Set(allAppts.map(a => a.barbershop_id));
    const overlap = [...profileShopIds].filter(id => apptShopIds.has(id));

    console.log(`\n🔗 Shop ID Overlap Check:`);
    console.log(`   - Profile shop IDs: ${[...profileShopIds].map(id => id.substring(0,8) + '...').join(', ')}`);
    console.log(`   - Appointment shop IDs: ${[...apptShopIds].map(id => id.substring(0,8) + '...').join(', ')}`);

    if (overlap.length > 0) {
      console.log(`   ✅ MATCHING: ${overlap.map(id => id.substring(0,8) + '...').join(', ')}`);
    } else {
      console.log(`   ❌ NO MATCH - THIS IS WHY CALENDAR IS EMPTY!`);
      console.log(`      User is querying for shop: ${[...profileShopIds][0]?.substring(0,8)}...`);
      console.log(`      But appointments exist for: ${[...apptShopIds][0]?.substring(0,8)}...`);
    }
  }

  // 4. Check date range
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
  const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString();

  const { data: inRange, count: rangeCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact' })
    .gte('scheduled_at', startDate)
    .lte('scheduled_at', endDate);

  console.log(`\n📅 Appointments in calendar date range:`);
  console.log(`   Date range: ${startDate.split('T')[0]} to ${endDate.split('T')[0]}`);
  console.log(`   Count: ${rangeCount}`);

  if (rangeCount === 0) {
    console.log(`   ⚠️  NO APPOINTMENTS IN CURRENT DATE RANGE`);
    console.log(`      (Calendar loads ±1 month from today)`);
  }
}

diagnose()
  .then(() => {
    console.log('\n✅ Diagnosis complete');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });
