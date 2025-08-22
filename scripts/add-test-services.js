const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Test barbershop ID - Elite Cuts GMB Test
const barbershopId = 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9'

// Sample services for a barbershop
const services = [
  {
    shop_id: barbershopId,
    name: 'Classic Haircut',
    description: 'Traditional barbershop haircut with hot towel finish',
    duration_minutes: 30,
    price: 35,
    category: 'Popular',
    is_active: true
  },
  {
    shop_id: barbershopId,
    name: 'Fade Cut',
    description: 'Modern fade haircut with precision blending',
    duration_minutes: 45,
    price: 45,
    category: 'Popular',
    is_active: true
  },
  {
    shop_id: barbershopId,
    name: 'Beard Trim',
    description: 'Professional beard shaping and grooming',
    duration_minutes: 20,
    price: 25,
    category: 'Grooming',
    is_active: true
  },
  {
    shop_id: barbershopId,
    name: 'Hot Shave',
    description: 'Classic straight razor shave with hot towels',
    duration_minutes: 30,
    price: 40,
    category: 'Grooming',
    is_active: true
  },
  {
    shop_id: barbershopId,
    name: 'Hair & Beard Combo',
    description: 'Complete haircut and beard grooming package',
    duration_minutes: 60,
    price: 60,
    category: 'Packages',
    is_active: true
  },
  {
    shop_id: barbershopId,
    name: 'Kids Cut',
    description: 'Haircut for children 12 and under',
    duration_minutes: 20,
    price: 20,
    category: 'Specialty',
    is_active: true
  }
]

async function addServices() {
  try {
    console.log('🔄 Adding services to barbershop...')
    
    // First, check if services already exist
    const { data: existingServices, error: checkError } = await supabase
      .from('services')
      .select('id, name')
      .eq('shop_id', barbershopId)
    
    if (checkError) {
      console.error('Error checking existing services:', checkError)
      return
    }
    
    if (existingServices && existingServices.length > 0) {
      console.log(`✅ Services already exist for this barbershop (${existingServices.length} services)`)
      console.log('Existing services:', existingServices.map(s => s.name).join(', '))
      return
    }
    
    // Add services
    const { data, error } = await supabase
      .from('services')
      .insert(services)
      .select()
    
    if (error) {
      console.error('Error adding services:', error)
      return
    }
    
    console.log(`✅ Successfully added ${data.length} services to barbershop`)
    console.log('Services added:', data.map(s => s.name).join(', '))
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the script
addServices()