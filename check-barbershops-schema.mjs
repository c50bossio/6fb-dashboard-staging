import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Query to check table structure
const { data, error } = await supabase
  .from('barbershops')
  .select('*')
  .limit(1);

if (error) {
  console.log('Error:', error);
} else {
  console.log('Barbershops table columns:');
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]).join(', '));
  }
}

// Check if organization_id column exists
const { data: shops } = await supabase
  .from('barbershops')
  .select('id, name, organization_id')
  .limit(3);

console.log('\nSample shops with organization_id:');
console.log(JSON.stringify(shops, null, 2));
