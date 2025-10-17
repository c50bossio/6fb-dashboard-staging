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
  console.log('🔍 Comprehensive Data Diagnosis...\n');

  // 1. Check user profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, role, barbershop_id')
    .not('barbershop_id', 'is', null)
    .limit(3);

  console.log('👤 User Profiles:');
  if (profiles && profiles.length > 0) {
    profiles.forEach(p => {
      console.log(`   - ${p.email}`);
      console.log(`     User ID: ${p.id}`);
      console.log(`     Shop ID: ${p.barbershop_id}`);
      console.log(`     Role: ${p.role}\n`);
    });
  } else {
    console.log('   ⚠️  NO PROFILES WITH barbershop_id\n');
    return;
  }

  const testUser = profiles[0];
  const userId = testUser.id;
  const barbershopId = testUser.barbershop_id;

  // 2. Check if barbershop exists
  console.log('🏪 Barbershops Table:');
  const { data: barbershop } = await supabase
    .from('barbershops')
    .select('id, name, owner_id')
    .eq('id', barbershopId)
    .single();

  if (barbershop) {
    console.log(`   ✅ Shop Found: ${barbershop.name}`);
    console.log(`   Shop ID: ${barbershop.id}`);
    console.log(`   Owner ID: ${barbershop.owner_id}`);
    console.log(`   Owner Match: ${barbershop.owner_id === userId ? '✅ YES' : '❌ NO'}\n`);
  } else {
    console.log(`   ❌ NO SHOP FOUND with ID: ${barbershopId}`);
    console.log(`   This is why products page is empty!\n`);
  }

  // 3. Check products
  console.log('📦 Products Table:');
  const { data: products, count: productCount } = await supabase
    .from('products')
    .select('id, name, barbershop_id', { count: 'exact' })
    .eq('barbershop_id', barbershopId)
    .limit(5);

  console.log(`   Total products for shop: ${productCount || 0}`);
  if (products && products.length > 0) {
    products.forEach(p => {
      console.log(`   - ${p.name} (${p.id.substring(0, 8)}...)`);
    });
  } else {
    console.log(`   ⚠️  NO PRODUCTS for shop ${barbershopId.substring(0, 8)}...`);
  }
  console.log();

  // 4. Check staff/barbers
  console.log('👔 Staff Table (profiles):');
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('barbershop_id', barbershopId);

  console.log(`   Total staff members: ${staff?.length || 0}`);
  if (staff && staff.length > 0) {
    staff.forEach(s => {
      console.log(`   - ${s.full_name || s.email} (${s.role})`);
      console.log(`     ID: ${s.id}`);
    });
  } else {
    console.log(`   ⚠️  NO STAFF for shop ${barbershopId.substring(0, 8)}...`);
  }
  console.log();

  // 5. Check barbers table (legacy)
  console.log('💈 Barbers Table (legacy):');
  const { data: barbers } = await supabase
    .from('barbers')
    .select('id, name, barbershop_id')
    .eq('barbershop_id', barbershopId);

  console.log(`   Total barbers: ${barbers?.length || 0}`);
  if (barbers && barbers.length > 0) {
    barbers.forEach(b => {
      console.log(`   - ${b.name}`);
      console.log(`     ID: ${b.id}`);
    });
  }
  console.log();

  // 6. Check appointments
  console.log('📅 Appointments Table:');
  const { data: appointments, count: apptCount } = await supabase
    .from('appointments')
    .select('id, client_name, barber_id, scheduled_at, barbershop_id', { count: 'exact' })
    .eq('barbershop_id', barbershopId)
    .limit(5);

  console.log(`   Total appointments: ${apptCount || 0}`);
  if (appointments && appointments.length > 0) {
    console.log(`   Sample appointments:`);
    appointments.forEach(a => {
      console.log(`   - ${a.client_name} on ${a.scheduled_at}`);
      console.log(`     Barber ID: ${a.barber_id}`);
    });

    // Check if barber IDs match staff
    console.log('\n   🔗 Barber ID Cross-Check:');
    const staffIds = new Set((staff || []).map(s => s.id));
    const barberIds = new Set((barbers || []).map(b => b.id));
    const apptBarberIds = [...new Set(appointments.map(a => a.barber_id))];

    apptBarberIds.forEach(barberId => {
      const inStaff = staffIds.has(barberId);
      const inBarbers = barberIds.has(barberId);
      const status = (inStaff || inBarbers) ? '✅' : '❌';
      console.log(`   ${status} Barber ${barberId.substring(0, 8)}... - In staff: ${inStaff}, In barbers: ${inBarbers}`);
    });
  } else {
    console.log(`   ⚠️  NO APPOINTMENTS for shop ${barbershopId.substring(0, 8)}...`);
  }
  console.log();

  // 7. Summary
  console.log('📊 DIAGNOSIS SUMMARY:');
  console.log('─────────────────────────────────────');
  if (!barbershop) {
    console.log('❌ CRITICAL: Barbershop record missing!');
    console.log('   → This causes products page to show empty');
    console.log('   → Need to create barbershop record or fix profile.barbershop_id');
  }
  if (!products || products.length === 0) {
    console.log('⚠️  No products in database for this shop');
  }
  if (!staff || staff.length === 0) {
    console.log('⚠️  No staff members for this shop');
    console.log('   → Calendar needs staff to display appointments');
  }
  if (!appointments || appointments.length === 0) {
    console.log('⚠️  No appointments for this shop');
  }
  if (appointments && appointments.length > 0 && (!staff || staff.length === 0) && (!barbers || barbers.length === 0)) {
    console.log('❌ CRITICAL: Appointments exist but NO staff/barbers!');
    console.log('   → Calendar cannot display appointments without matching staff');
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
