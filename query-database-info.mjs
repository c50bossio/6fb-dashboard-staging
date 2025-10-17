import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('Querying Supabase database...\n');

// Query for user
const { data: user, error: userError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', 'c50bossio@gmail.com')
  .maybeSingle();

console.log('=== USER c50bossio@gmail.com ===');
if (userError) console.log('Error:', userError);
else console.log(JSON.stringify(user, null, 2));

// Query all barbershops
const { data: shops, error: shopsError } = await supabase
  .from('barbershops')
  .select('*');

console.log('\n=== ALL BARBERSHOPS ===');
if (shopsError) console.log('Error:', shopsError);
else console.log(JSON.stringify(shops, null, 2));

// Query staff members
const { data: staff, error: staffError } = await supabase
  .from('barbershop_staff')
  .select('*, users(*)');

console.log('\n=== STAFF MEMBERS ===');
if (staffError) console.log('Error:', staffError);
else console.log(JSON.stringify(staff, null, 2));

// Query services
const { data: services, error: servicesError } = await supabase
  .from('services')
  .select('*')
  .limit(10);

console.log('\n=== SERVICES (first 10) ===');
if (servicesError) console.log('Error:', servicesError);
else console.log(JSON.stringify(services, null, 2));

// Query appointments
const { data: appointments, error: apptError } = await supabase
  .from('appointments')
  .select('*')
  .limit(3);

console.log('\n=== APPOINTMENTS (first 3) ===');
if (apptError) console.log('Error:', apptError);
else console.log(JSON.stringify(appointments, null, 2));
