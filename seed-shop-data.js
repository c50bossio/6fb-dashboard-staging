import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function seedShopData() {
  console.log('🌱 Seeding shop management data...')
  
  try {
    // 1. Create a test shop owner profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'SHOP_OWNER')
      .limit(1)
      .single()
    
    let ownerId = existingProfile?.id
    
    if (!ownerId) {
      console.log('📝 Creating test shop owner profile...')
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: 'test-shop-owner-uuid',
          email: 'owner@testshop.com',
          full_name: 'Test Shop Owner',
          role: 'SHOP_OWNER'
        })
        .select()
        .single()
      
      if (profileError) {
        console.log('Profile might already exist, continuing...')
        ownerId = 'test-shop-owner-uuid'
      } else {
        ownerId = newProfile.id
      }
    }
    
    console.log(`✅ Shop owner ID: ${ownerId}`)
    
    // 2. Create a test barbershop if it doesn't exist
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', ownerId)
      .single()
    
    let shopId = existingShop?.id
    
    if (!shopId) {
      console.log('🏪 Creating test barbershop...')
      const { data: newShop, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: 'Elite Cuts Barbershop',
          owner_id: ownerId,
          slug: 'elite-cuts',
          address: '123 Main Street',
          city: 'Demo City',
          state: 'CA',
          zip_code: '90210',
          phone: '(555) 123-4567',
          email: 'info@elitecuts.com',
          description: 'Premium barbershop with expert barbers',
          is_active: true,
          total_clients: 0,
          monthly_revenue: 0,
          rating: 0,
          total_reviews: 0
        })
        .select()
        .single()
      
      if (shopError) {
        console.error('Error creating shop:', shopError)
        return
      }
      shopId = newShop.id
    }
    
    console.log(`✅ Shop ID: ${shopId}`)
    
    // 3. Create test products
    console.log('🧴 Creating test products...')
    const products = [
      {
        barbershop_id: shopId,
        name: 'Premium Hair Pomade',
        description: 'Strong hold, matte finish pomade for professional styling',
        category: 'hair_care',
        brand: 'Elite Cuts',
        sku: 'EC-POMADE-001',
        cost_price: 8.50,
        retail_price: 24.99,
        current_stock: 15,
        min_stock_level: 5,
        max_stock_level: 50,
        track_inventory: true,
        is_active: true
      },
      {
        barbershop_id: shopId,
        name: 'Beard Oil - Sandalwood',
        description: 'Natural beard conditioning oil with sandalwood scent',
        category: 'beard_care',
        brand: 'Elite Cuts',
        sku: 'EC-BEARD-002',
        cost_price: 12.00,
        retail_price: 29.99,
        current_stock: 8,
        min_stock_level: 3,
        max_stock_level: 30,
        track_inventory: true,
        is_active: true
      },
      {
        barbershop_id: shopId,
        name: 'Professional Scissors',
        description: 'High-quality Japanese steel barber scissors',
        category: 'tools',
        brand: 'Pro Tools',
        sku: 'PT-SCISSORS-001',
        cost_price: 45.00,
        retail_price: 89.99,
        current_stock: 2,
        min_stock_level: 1,
        max_stock_level: 5,
        track_inventory: true,
        is_active: true
      }
    ]
    
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id')
      .eq('barbershop_id', shopId)
    
    if (!existingProducts || existingProducts.length === 0) {
      const { error: productsError } = await supabase
        .from('products')
        .insert(products)
      
      if (productsError) {
        console.error('Error creating products:', productsError)
      } else {
        console.log(`✅ Created ${products.length} test products`)
      }
    } else {
      console.log('✅ Products already exist')
    }
    
    // 4. Create test barber profiles
    console.log('✂️ Creating test barber profiles...')
    const barbers = [
      {
        id: 'test-barber-1-uuid',
        email: 'john@elitecuts.com',
        full_name: 'John Martinez',
        role: 'BARBER'
      },
      {
        id: 'test-barber-2-uuid', 
        email: 'mike@elitecuts.com',
        full_name: 'Mike Thompson',
        role: 'BARBER'
      }
    ]
    
    for (const barber of barbers) {
      const { data: existingBarber } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', barber.id)
        .single()
      
      if (!existingBarber) {
        const { error: barberError } = await supabase
          .from('profiles')
          .insert(barber)
        
        if (barberError) {
          console.log(`Barber ${barber.full_name} might already exist, continuing...`)
        } else {
          console.log(`✅ Created barber profile: ${barber.full_name}`)
        }
      }
    }
    
    console.log('\n🎉 Shop management data seeding completed!')
    console.log('\nYou can now test the shop management features:')
    console.log('- View shop dashboard with metrics')
    console.log('- Manage product inventory')
    console.log('- View financial arrangements')
    console.log('- Configure shop settings')
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
  }
}

seedShopData()