const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEV_SHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const CHRIS_BOSSIO_ID = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';

// Service IDs from database
const SERVICES = {
  HAIRCUT: '9781d8d0-6883-4558-b448-8e4bc66a222c',
  BEARD_TRIM: '8951e326-ebd5-4732-9ec1-4a8a1260f1f8',
  HOT_TOWEL: '9d893bb5-52fd-46cc-ac4e-24568d2565ad',
  HAIRCUT_BEARD: '61f775c4-35e7-477b-b8e3-9a9b6e193497'
};

// Realistic customer data
const CUSTOMERS = [
  {
    full_name: 'Michael Rodriguez',
    email: 'michael.rodriguez@email.com',
    phone: '+1-555-234-5678',
    total_visits: 12,
    total_spent: 420
  },
  {
    full_name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1-555-345-6789',
    total_visits: 8,
    total_spent: 280
  },
  {
    full_name: 'James Wilson',
    email: 'james.wilson@email.com',
    phone: '+1-555-456-7890',
    total_visits: 15,
    total_spent: 525
  },
  {
    full_name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    phone: '+1-555-567-8901',
    total_visits: 6,
    total_spent: 210
  },
  {
    full_name: 'David Thompson',
    email: 'david.thompson@email.com',
    phone: '+1-555-678-9012',
    total_visits: 20,
    total_spent: 900
  },
  {
    full_name: 'Jennifer Lee',
    email: 'jennifer.lee@email.com',
    phone: '+1-555-789-0123',
    total_visits: 10,
    total_spent: 350
  },
  {
    full_name: 'Robert Martinez',
    email: 'robert.martinez@email.com',
    phone: '+1-555-890-1234',
    total_visits: 18,
    total_spent: 630
  },
  {
    full_name: 'Amanda Brown',
    email: 'amanda.brown@email.com',
    phone: '+1-555-901-2345',
    total_visits: 14,
    total_spent: 490
  }
];

async function seedData() {
  console.log('🌱 Starting data seed for Dev Barbershop...\n');

  try {
    // Step 1: Create customers
    console.log('👥 Creating 8 realistic customers...');
    const { data: createdCustomers, error: customersError } = await supabase
      .from('customers')
      .insert(
        CUSTOMERS.map(customer => ({
          ...customer,
          barbershop_id: DEV_SHOP_ID,
          created_at: new Date().toISOString()
        }))
      )
      .select();

    if (customersError) {
      console.error('❌ Error creating customers:', customersError);
      return;
    }

    console.log(`✅ Created ${createdCustomers.length} customers\n`);

    // Map customers for easy access
    const customerMap = {};
    createdCustomers.forEach((customer, index) => {
      customerMap[CUSTOMERS[index].full_name] = customer.id;
    });

    // Step 2: Update existing recurring appointment
    console.log('🔄 Updating existing recurring appointment...');
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        client_name: 'Michael Rodriguez',
        client_email: 'michael.rodriguez@email.com',
        client_phone: '+1-555-234-5678',
        service_id: SERVICES.HAIRCUT,
        client_notes: 'Weekly regular - prefers 10am slot',
        total_amount: 35,
        service_price: 35
      })
      .eq('id', '1b5a193b-f4c4-4244-91ea-34af58ca9e17');

    if (updateError) {
      console.error('❌ Error updating appointment:', updateError);
    } else {
      console.log('✅ Updated recurring appointment with Michael Rodriguez\n');
    }

    // Step 3: Create additional recurring appointments
    console.log('🔁 Creating 2 additional recurring appointments...');

    const newRecurringAppointments = [
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'David Thompson',
        client_email: 'david.thompson@email.com',
        client_phone: '+1-555-678-9012',
        service_id: SERVICES.HAIRCUT_BEARD,
        scheduled_at: '2025-10-10T17:00:00Z', // Friday 5pm
        duration_minutes: 45,
        status: 'CONFIRMED',
        total_amount: 50,
        service_price: 50,
        client_notes: 'Bi-weekly - Friday evening regular',
        is_recurring: true,
        recurrence_rule: JSON.stringify({
          rrule: 'DTSTART:20251010T170000Z\nFREQ=WEEKLY;INTERVAL=2;COUNT=6',
          duration: 'PT45M',
          timezone: 'America/Los_Angeles'
        })
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'James Wilson',
        client_email: 'james.wilson@email.com',
        client_phone: '+1-555-456-7890',
        service_id: SERVICES.HOT_TOWEL,
        scheduled_at: '2025-10-06T16:00:00Z', // First Monday of October at 4pm
        duration_minutes: 45,
        status: 'CONFIRMED',
        total_amount: 45,
        service_price: 45,
        client_notes: 'Monthly shave - first Monday of month',
        is_recurring: true,
        recurrence_rule: JSON.stringify({
          rrule: 'DTSTART:20251006T160000Z\nFREQ=MONTHLY;BYDAY=1MO;COUNT=3',
          duration: 'PT45M',
          timezone: 'America/Los_Angeles'
        })
      }
    ];

    const { data: recurringApts, error: recurringError } = await supabase
      .from('appointments')
      .insert(newRecurringAppointments)
      .select();

    if (recurringError) {
      console.error('❌ Error creating recurring appointments:', recurringError);
    } else {
      console.log(`✅ Created ${recurringApts.length} recurring appointments\n`);
    }

    // Step 4: Create regular appointments
    console.log('📅 Creating 8 regular appointments...');

    const regularAppointments = [
      // Past appointments (completed)
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Sarah Chen',
        client_email: 'sarah.chen@email.com',
        client_phone: '+1-555-345-6789',
        service_id: SERVICES.BEARD_TRIM,
        scheduled_at: '2025-10-01T18:00:00Z',
        duration_minutes: 20,
        status: 'COMPLETED',
        total_amount: 20,
        service_price: 20,
        client_notes: 'Quick beard trim',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Robert Martinez',
        client_email: 'robert.martinez@email.com',
        client_phone: '+1-555-890-1234',
        service_id: SERVICES.HAIRCUT,
        scheduled_at: '2025-10-03T15:30:00Z',
        duration_minutes: 30,
        status: 'COMPLETED',
        total_amount: 35,
        service_price: 35,
        client_notes: 'Standard cut',
        is_recurring: false
      },
      // Future appointments (confirmed)
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Maria Garcia',
        client_email: 'maria.garcia@email.com',
        client_phone: '+1-555-567-8901',
        service_id: SERVICES.HAIRCUT,
        scheduled_at: '2025-10-09T14:00:00Z',
        duration_minutes: 30,
        status: 'CONFIRMED',
        total_amount: 35,
        service_price: 35,
        client_notes: 'Trim and style',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Jennifer Lee',
        client_email: 'jennifer.lee@email.com',
        client_phone: '+1-555-789-0123',
        service_id: SERVICES.HAIRCUT_BEARD,
        scheduled_at: '2025-10-11T16:30:00Z',
        duration_minutes: 45,
        status: 'CONFIRMED',
        total_amount: 50,
        service_price: 50,
        client_notes: 'Full service',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Amanda Brown',
        client_email: 'amanda.brown@email.com',
        client_phone: '+1-555-901-2345',
        service_id: SERVICES.BEARD_TRIM,
        scheduled_at: '2025-10-14T17:00:00Z',
        duration_minutes: 20,
        status: 'PENDING',
        total_amount: 20,
        service_price: 20,
        client_notes: 'Beard shape-up',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Sarah Chen',
        client_email: 'sarah.chen@email.com',
        client_phone: '+1-555-345-6789',
        service_id: SERVICES.HOT_TOWEL,
        scheduled_at: '2025-10-16T15:00:00Z',
        duration_minutes: 45,
        status: 'CONFIRMED',
        total_amount: 45,
        service_price: 45,
        client_notes: 'Special occasion shave',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'Robert Martinez',
        client_email: 'robert.martinez@email.com',
        client_phone: '+1-555-890-1234',
        service_id: SERVICES.HAIRCUT_BEARD,
        scheduled_at: '2025-10-18T13:00:00Z',
        duration_minutes: 45,
        status: 'PENDING',
        total_amount: 50,
        service_price: 50,
        client_notes: 'Haircut and beard trim',
        is_recurring: false
      },
      {
        barbershop_id: DEV_SHOP_ID,
        barber_id: CHRIS_BOSSIO_ID,
        client_name: 'James Wilson',
        client_email: 'james.wilson@email.com',
        client_phone: '+1-555-456-7890',
        service_id: SERVICES.HAIRCUT,
        scheduled_at: '2025-10-20T10:30:00Z',
        duration_minutes: 30,
        status: 'CONFIRMED',
        total_amount: 35,
        service_price: 35,
        client_notes: 'Business cut',
        is_recurring: false
      }
    ];

    const { data: regularApts, error: regularError } = await supabase
      .from('appointments')
      .insert(regularAppointments)
      .select();

    if (regularError) {
      console.error('❌ Error creating regular appointments:', regularError);
    } else {
      console.log(`✅ Created ${regularApts.length} regular appointments\n`);
    }

    // Summary
    console.log('📊 Seed Summary:');
    console.log('─────────────────────────────────────');
    console.log(`✅ Customers: ${createdCustomers.length}`);
    console.log(`✅ Recurring Appointments: 3 series`);
    console.log(`   - Weekly (Michael Rodriguez): 4 occurrences`);
    console.log(`   - Bi-weekly (David Thompson): 6 occurrences`);
    console.log(`   - Monthly (James Wilson): 3 occurrences`);
    console.log(`✅ Regular Appointments: ${regularApts?.length || 0}`);
    console.log(`✅ Total Calendar Instances: ${(4 + 6 + 3 + (regularApts?.length || 0))}`);
    console.log('─────────────────────────────────────\n');

    console.log('🎉 Seed complete! Visit http://localhost:9999/dashboard/calendar');

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

// Run the seed
seedData();
