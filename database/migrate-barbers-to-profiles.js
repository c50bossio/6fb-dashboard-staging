#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_PASSWORD = 'Barber2025!';
const BARBERSHOP_ID = 'c5a58548-8f23-426c-bedc-49a83d238724';

async function migrateBarber(barber) {
  console.log(`\n📋 Migrating: ${barber.name}`);
  console.log(`   Email: ${barber.email}`);

  try {
    // Step 1: Create auth.users entry
    console.log('   1️⃣ Creating/finding auth account...');
    let authData;
    const { data: createData, error: authError } = await supabase.auth.admin.createUser({
      email: barber.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: barber.name,
        phone: barber.phone
      }
    });

    if (authError && authError.message.includes('already registered')) {
      console.log('   ⚠️  Auth account already exists, looking up user...');
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const existingUser = users.find(u => u.email === barber.email);
      if (existingUser) {
        console.log(`   ✅ Found existing user: ${existingUser.id}`);
        authData = { user: existingUser };
      } else {
        throw new Error('User exists but cannot be found');
      }
    } else if (authError) {
      throw authError;
    } else {
      console.log(`   ✅ Auth account created: ${createData.user.id}`);
      authData = createData;
    }

    const userId = authData.user.id;

    // Step 2: Create profiles entry (using actual production schema)
    console.log('   2️⃣ Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: barber.email,
        full_name: barber.name,
        first_name: barber.name.split(' ')[0] || barber.name,
        last_name: barber.name.split(' ').slice(1).join(' ') || '',
        phone: barber.phone,
        avatar_url: barber.avatar_url,
        bio: barber.bio,
        specialties: barber.specialties,
        role: 'BARBER',
        barbershop_id: BARBERSHOP_ID,
        is_active: true,
        onboarding_completed: true
      }, { onConflict: 'id' });

    if (profileError) throw profileError;
    console.log('   ✅ Profile created');

    // Step 3: Create barbershop_staff entry
    console.log('   3️⃣ Creating barbershop_staff entry...');
    const commissionRate = barber.experience_years >= 10 ? 0.65 :
                          barber.experience_years >= 5 ? 0.60 : 0.55;

    const { error: staffError } = await supabase
      .from('barbershop_staff')
      .upsert({
        barbershop_id: BARBERSHOP_ID,
        user_id: userId,
        role: 'BARBER',
        commission_rate: commissionRate,
        employment_type: 'commission',
        is_active: true,
        started_at: barber.created_at
      }, { onConflict: 'barbershop_id,user_id' });

    if (staffError) throw staffError;
    console.log(`   ✅ Barbershop_staff entry created (${(commissionRate * 100).toFixed(0)}% commission)`);

    // Step 4: Link legacy record
    console.log('   4️⃣ Linking legacy record...');
    await supabase.from('barbers').update({ user_id: userId }).eq('id', barber.id);
    console.log('   ✅ Legacy record linked');

    console.log(`   🎉 SUCCESS: ${barber.name} migrated!`);
    return { success: true, userId, barber: barber.name };

  } catch (error) {
    console.error(`   ❌ FAILED: ${error.message}`);
    return { success: false, error: error.message, barber: barber.name };
  }
}

async function main() {
  console.log('🚀 Starting Barber Migration...\n');
  console.log('='.repeat(60));

  const { data: barbers, error } = await supabase
    .from('barbers')
    .select('*')
    .eq('barbershop_id', BARBERSHOP_ID)
    .eq('is_active', true);

  if (error) {
    console.error('❌ Failed to fetch barbers:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${barbers.length} barbers to migrate\n`);
  console.log(`🔑 Default password: ${DEFAULT_PASSWORD}`);
  console.log('='.repeat(60));

  const results = [];
  for (const barber of barbers) {
    results.push(await migrateBarber(barber));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  successful.forEach(r => console.log(`   - ${r.barber}`));

  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
    failed.forEach(r => console.log(`   - ${r.barber}: ${r.error}`));
  }

  console.log('\n='.repeat(60));
  console.log('🎉 Migration complete!\n');
}

main().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
