const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBookingLinksDatabase() {
  console.log('🔧 Setting up booking links database tables...\n');

  try {
    // First, let's create a simplified booking_links table for immediate use
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS booking_links (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        barber_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        services JSONB DEFAULT '[]',
        time_slots TEXT[] DEFAULT '{}',
        duration INTEGER DEFAULT 45,
        custom_price DECIMAL(10,2),
        discount INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE,
        description TEXT,
        active BOOLEAN DEFAULT true,
        clicks INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        revenue DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Execute the table creation
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql_query: createTableQuery
    });

    if (tableError) {
      console.log('❌ Error creating table via RPC, trying direct approach...');
      console.log('Error:', tableError.message);
    } else {
      console.log('✅ booking_links table created successfully');
    }

    // Insert some sample booking links for testing
    console.log('\n📝 Adding sample booking links...');
    
    const sampleLinks = [
      {
        barber_id: '11111111-1111-1111-1111-111111111111', // Demo user
        name: 'Quick Haircut Link',
        url: '/book/demo-barber?services=haircut',
        services: ['Classic Cut', 'Fade Cut'],
        description: 'Book a quick haircut appointment',
        duration: 45
      },
      {
        barber_id: '11111111-1111-1111-1111-111111111111', // Demo user  
        name: 'Full Service Package',
        url: '/book/demo-barber?services=full',
        services: ['Classic Cut', 'Beard Trim', 'Hot Towel Shave'],
        description: 'Complete grooming package',
        duration: 90,
        custom_price: 85.00
      }
    ];

    for (const link of sampleLinks) {
      const { data, error } = await supabase
        .from('booking_links')
        .insert(link)
        .select()
        .single();

      if (error) {
        console.log('⚠️ Error inserting sample link:', error.message);
      } else {
        console.log('✅ Created sample link:', link.name);
      }
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }

  // Test the table exists now
  console.log('\n🔍 Testing booking_links table...');
  const { data: testData, error: testError } = await supabase
    .from('booking_links')
    .select('*')
    .limit(5);

  if (testError) {
    console.error('❌ Table test failed:', testError.message);
  } else {
    console.log('✅ Table test successful! Found', testData?.length || 0, 'records');
    if (testData && testData.length > 0) {
      console.log('Sample record:', testData[0].name);
    }
  }
}

setupBookingLinksDatabase().catch(console.error);