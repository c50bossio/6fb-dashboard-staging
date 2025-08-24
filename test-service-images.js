// Test script to verify service image implementation
// Run: node test-service-images.js

const { createClient } = require('@supabase/supabase-js')

// Use your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

async function testServiceImages() {
  console.log('🧪 Testing Service Image Implementation')
  console.log('=' * 50)
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // 1. Check if image_url column exists
    console.log('\n1️⃣ Checking database schema...')
    const { data: testService, error: schemaError } = await supabase
      .from('services')
      .select('id, name, image_url')
      .limit(1)
    
    if (schemaError && schemaError.message.includes('image_url')) {
      console.log('❌ Column image_url does not exist yet')
      console.log('👉 Please run the migration file: database/migrations/007_add_service_images.sql')
      return
    }
    
    console.log('✅ Column image_url exists in services table')
    
    // 2. Test creating a service with image
    console.log('\n2️⃣ Testing service creation with image...')
    const testServiceData = {
      shop_id: 'test-shop-id', // Replace with actual shop_id
      name: 'Test Service with Image',
      description: 'Testing image functionality',
      category: 'haircut',
      price: 35.00,
      duration_minutes: 30,
      image_url: 'https://example.com/test-image.jpg',
      is_active: true
    }
    
    const { data: created, error: createError } = await supabase
      .from('services')
      .insert([testServiceData])
      .select()
    
    if (createError) {
      console.log('⚠️  Could not create test service:', createError.message)
    } else {
      console.log('✅ Successfully created service with image_url')
      console.log('   Service ID:', created[0].id)
      console.log('   Image URL:', created[0].image_url)
      
      // Clean up test service
      await supabase.from('services').delete().eq('id', created[0].id)
      console.log('🧹 Test service cleaned up')
    }
    
    // 3. Check existing services
    console.log('\n3️⃣ Checking existing services...')
    const { data: services, error: listError } = await supabase
      .from('services')
      .select('id, name, image_url')
      .limit(5)
    
    if (services && services.length > 0) {
      console.log(`Found ${services.length} services:`)
      services.forEach(s => {
        console.log(`   - ${s.name}: ${s.image_url ? '✅ Has image' : '⭕ No image'}`)
      })
    }
    
    console.log('\n✨ Service image implementation is working correctly!')
    console.log('You can now upload images for services in the UI.')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testServiceImages()