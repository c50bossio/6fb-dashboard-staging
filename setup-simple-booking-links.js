const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSimpleBookingLinks() {
  console.log('🔧 Setting up simplified booking links for demo...\n');

  console.log('📋 Checking existing tables...');
  
  const { data: tables, error } = await supabase
    .from('information_schema.tables')  
    .select('table_name')
    .eq('table_schema', 'public');

  if (error) {
    console.log('❌ Cannot check tables:', error.message);
  } else {
    console.log('📊 Available tables:', tables?.map(t => t.table_name).join(', '));
  }

  console.log('\n👤 Checking profiles table...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .limit(3);

  if (profilesError) {
    console.log('❌ Cannot access profiles:', profilesError.message);
  } else {
    console.log('✅ Profiles table accessible, found', profiles?.length || 0, 'users');
    if (profiles && profiles.length > 0) {
      profiles.forEach((profile, i) => {
        console.log(`  ${i+1}. ${profile.email || 'no-email'} (${profile.role || 'no-role'})`);
      });
    }
  }

  console.log('\n💡 Creating temporary booking links solution...');
  
  const mockBookingLinks = [
    {
      id: 'demo-link-1',
      name: 'Quick Haircut Booking',
      url: '/book/demo-barber?service=haircut',
      services: ['Classic Cut', 'Fade Cut'],
      description: 'Book your haircut appointment',
      active: true,
      clicks: 15,
      conversions: 3,
      created_at: new Date().toISOString()
    },
    {
      id: 'demo-link-2', 
      name: 'Full Grooming Package',
      url: '/book/demo-barber?service=full',
      services: ['Classic Cut', 'Beard Trim', 'Hot Towel Shave'],
      description: 'Complete grooming experience',
      active: true,
      clicks: 8,
      conversions: 2,
      created_at: new Date().toISOString()
    }
  ];

  console.log('✅ Mock booking links prepared:');
  mockBookingLinks.forEach((link, i) => {
    console.log(`  ${i+1}. ${link.name} (${link.services.length} services)`);
  });

  return mockBookingLinks;
}

setupSimpleBookingLinks()
  .then(links => {
    console.log('\n🎯 Booking links setup complete!');
    console.log('📝 Next steps:');
    console.log('  1. Update booking-links page to use mock data temporarily');
    console.log('  2. Test embed functionality with existing data');
    console.log('  3. Create Supabase table when possible');
  })
  .catch(console.error);