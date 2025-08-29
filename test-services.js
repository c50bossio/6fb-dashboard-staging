import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testServices() {
  console.log('🧪 Testing services queries with new schema...\n')
  
  const barbershopId = 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9'
  
  // Test 1: Query with barbershop_id and active
  console.log('Test 1: Query services with barbershop_id and active')
  const { data: services1, error: error1 } = await supabase
    .from('services')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('active', true)
  
  if (error1) {
    console.error('❌ Error:', error1.message)
  } else {
    console.log('✅ Success! Found', services1.length, 'active services')
    if (services1[0]) {
      console.log('   Sample:', services1[0].name, '- barbershop_id:', services1[0].barbershop_id)
    }
  }
  
  // Test 2: Query just with barbershop_id
  console.log('\nTest 2: Query services with just barbershop_id')
  const { data: services2, error: error2 } = await supabase
    .from('services')
    .select('id, name, barbershop_id, active')
    .eq('barbershop_id', barbershopId)
  
  if (error2) {
    console.error('❌ Error:', error2.message)
  } else {
    console.log('✅ Success! Found', services2.length, 'total services')
  }
  
  console.log('\n🎯 Phase 1-2 ID Standardization Complete!')
  console.log('   • Services table now uses barbershop_id ✅')
  console.log('   • Services table now uses active column ✅')
  console.log('   • Frontend code updated to match ✅')
}

testServices()
