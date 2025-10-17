import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking user accounts...\n')

// Check both accounts
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, shop_id, barbershop_id, role, full_name')
  .in('email', ['c50bossio@gmail.com', 'dev@barbershop.com'])

console.log('Current accounts:')
if (profiles) {
  profiles.forEach(p => {
    const shopId = p.shop_id || p.barbershop_id || 'none'
    console.log(`\n  Email: ${p.email}`)
    console.log(`  ID: ${p.id}`)
    console.log(`  Shop ID: ${shopId}`)
    console.log(`  Role: ${p.role}`)
    console.log(`  Name: ${p.full_name || 'N/A'}`)
  })
}

// Check which shop has the revenue
const DEMO_SHOP = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const { data: appointments } = await supabase
  .from('appointments')
  .select('id')
  .eq('barbershop_id', DEMO_SHOP)

console.log(`\n💰 Demo shop (${DEMO_SHOP}) has ${(appointments || []).length} appointments`)
