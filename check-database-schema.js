require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    // Check if customers table exists
    const { data: customerCheck } = await supabase
      .from('customers')
      .select('id')
      .limit(1);
    
    if (!customerCheck) {
      console.log('❌ Customers table does not exist or is not accessible');
    } else {
      console.log('✅ Customers table exists');
    }
  } catch (error) {
    console.log('❌ Customers table error:', error.message);
  }

  // Try to get bookings table columns
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*')
    .limit(1);
  
  if (bookingsError) {
    console.log('Bookings table error:', bookingsError.message);
  } else if (bookings && bookings.length > 0) {
    console.log('\nBookings table columns:', Object.keys(bookings[0]).join(', '));
  } else {
    console.log('Bookings table exists but is empty');
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });