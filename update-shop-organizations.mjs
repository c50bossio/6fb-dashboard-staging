import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const organizationId = '0849549e-1d4b-40d1-b0fa-cc6fe12360a2';
const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5'; // c50bossio@gmail.com

// Find Tomb45 shops
const { data: tomb45Shops, error: findError } = await supabase
  .from('barbershops')
  .select('*')
  .or('name.ilike.%Tomb45%,name.ilike.%tomb45%');

console.log('Found Tomb45 shops:', JSON.stringify(tomb45Shops, null, 2));

if (tomb45Shops && tomb45Shops.length > 0) {
  // Update each shop with organization_id
  for (const shop of tomb45Shops) {
    const { data, error } = await supabase
      .from('barbershops')
      .update({ 
        organization_id: organizationId,
        owner_id: userId
      })
      .eq('id', shop.id)
      .select();
    
    if (error) {
      console.log(`Error updating ${shop.name}:`, error);
    } else {
      console.log(`✅ Updated ${shop.name} with organization_id`);
    }
  }
  
  // Verify the update
  const { data: updated } = await supabase
    .from('barbershops')
    .select('id, name, city, state, organization_id, owner_id')
    .eq('organization_id', organizationId);
  
  console.log('\nUpdated shops:');
  console.log(JSON.stringify(updated, null, 2));
}
