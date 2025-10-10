import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const today = new Date();
  
  // Create 3 test blocks for different times today
  const blocks = [
    {
      startHour: 10,
      startMinute: 0,
      duration: 30,
      notes: 'Morning Break'
    },
    {
      startHour: 13,
      startMinute: 0,
      duration: 60,
      notes: 'Lunch Break'
    },
    {
      startHour: 15,
      startMinute: 30,
      duration: 30,
      notes: 'Afternoon Meeting'
    }
  ];
  
  console.log('Creating test blocked times for today:', today.toLocaleDateString());
  console.log('=====================================\n');
  
  for (const block of blocks) {
    const startTime = new Date(today);
    startTime.setHours(block.startHour, block.startMinute, 0, 0);
    
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + block.duration);
    
    const blockData = {
      barbershop_id: '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
      barber_id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'blocked',
      notes: `🚫 Time Blocked - ${block.notes}`,
      customer_name: null,
      customer_phone: null,
      customer_email: null,
      service_id: null,
      price: 0,
      duration_minutes: block.duration,
      is_recurring: false,
      is_test: false
    };
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([blockData])
      .select();
      
    if (error) {
      console.error(`❌ Error creating block "${block.notes}":`, error.message);
    } else {
      console.log(`✅ Created: ${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()}`);
      console.log(`   Notes: ${block.notes}`);
      console.log(`   ID: ${data[0].id}\n`);
    }
  }
  
  console.log('=====================================');
  console.log('🎯 Test Instructions:');
  console.log('1. Go to http://localhost:9999/dashboard/calendar');
  console.log('2. You should see 3 blocked time slots today');
  console.log('3. Click on any blocked time (🚫 icon)');
  console.log('4. The appointment modal will open');
  console.log('5. Click the "Delete" button (trash icon)');
  console.log('6. Confirm the deletion');
  console.log('7. The blocked time should disappear from the calendar');
})();