import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Create a blocked time for TODAY at 2:00 PM - 3:00 PM
  const today = new Date();
  today.setHours(14, 0, 0, 0); // 2:00 PM
  const endTime = new Date(today);
  endTime.setHours(15, 0, 0, 0); // 3:00 PM
  
  const blockData = {
    barbershop_id: '1ca6138d-eae8-46ed-abff-5d6e52fbd21b',
    barber_id: 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5',
    start_time: today.toISOString(),
    end_time: endTime.toISOString(),
    status: 'blocked',
    notes: '🚫 Time Blocked - Today Test Block',
    customer_name: null,
    customer_phone: null,
    customer_email: null,
    service_id: null,
    price: 0,
    duration_minutes: 60,
    is_recurring: false,
    is_test: false
  };
  
  console.log('Creating blocked time for TODAY:', {
    date: today.toLocaleDateString(),
    time: today.toLocaleTimeString() + ' - ' + endTime.toLocaleTimeString()
  });
  
  const { data, error } = await supabase
    .from('bookings')
    .insert([blockData])
    .select();
    
  if (error) {
    console.error('Error creating block:', error);
  } else {
    console.log('✅ Successfully created blocked time for today!');
    console.log('Block ID:', data[0].id);
    console.log('Now refresh the calendar - you should see this block at 2:00 PM today');
  }
})();