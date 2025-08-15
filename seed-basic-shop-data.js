import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createBasicShopData() {
  console.log('🌱 Creating basic shop data...')
  
  try {
    // 1. Create a shop owner profile
    const ownerId = 'test-shop-owner-123'
    
    console.log('👤 Creating shop owner...')
    const { data: ownerData, error: ownerError } = await supabase
      .from('profiles')
      .upsert({
        id: ownerId,
        email: 'owner@elitecuts.com',
        full_name: 'Marcus Johnson',
        role: 'SHOP_OWNER'
      })
      .select()
    
    if (ownerError) {
      console.error('Owner creation error:', ownerError)
      return
    }
    
    console.log('✅ Shop owner created')
    
    // 2. Check if barbershops table exists by trying to insert
    console.log('🏪 Creating barbershop...')
    
    const { data: shopData, error: shopError } = await supabase
      .from('barbershops')
      .upsert({
        id: 'elite-cuts-shop-123',
        owner_id: ownerId,
        name: 'Elite Cuts Barbershop',
        slug: 'elite-cuts',
        address: '2547 Broadway Street',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94115',
        phone: '(415) 555-2847',
        email: 'info@elitecuts.com',
        description: 'Premium barbershop experience',
        is_active: true,
        total_clients: 45,
        monthly_revenue: 12500,
        rating: 4.8,
        total_reviews: 23
      })
      .select()
    
    if (shopError) {
      console.error('Shop creation error:', shopError)
      console.log('Note: This may be because the barbershops table does not exist yet.')
      console.log('Please run the SQL schema first.')
      return
    }
    
    console.log('✅ Barbershop created')
    
    // 3. Create some barber profiles
    const barbers = [
      {
        id: 'barber-alex-123',
        email: 'alex@elitecuts.com',
        full_name: 'Alex Rodriguez',
        role: 'BARBER'
      },
      {
        id: 'barber-jamie-123',
        email: 'jamie@elitecuts.com',
        full_name: 'Jamie Chen',
        role: 'BARBER'
      }
    ]
    
    console.log('✂️ Creating barbers...')
    for (const barber of barbers) {
      const { error: barberError } = await supabase
        .from('profiles')
        .upsert(barber)
      
      if (barberError) {
        console.error(`Error creating barber ${barber.full_name}:`, barberError)
      } else {
        console.log(`✅ Created barber: ${barber.full_name}`)
      }
    }
    
    // 4. Create staff relationships if barbershop_staff table exists
    console.log('👥 Creating staff relationships...')
    
    for (const barber of barbers) {
      const { error: staffError } = await supabase
        .from('barbershop_staff')
        .upsert({
          barbershop_id: 'elite-cuts-shop-123',
          user_id: barber.id,
          role: 'BARBER',
          is_active: true,
          commission_rate: 65.00,
          financial_model: 'commission'
        })
      
      if (staffError) {
        console.error(`Error creating staff relation for ${barber.full_name}:`, staffError)
      } else {
        console.log(`✅ Added ${barber.full_name} to staff`)
      }
    }
    
    console.log('\n🎉 Basic shop data creation completed!')
    console.log('\n📈 Summary:')
    console.log('• Shop Owner: Marcus Johnson')
    console.log('• Shop: Elite Cuts Barbershop')
    console.log(`• Barbers: ${barbers.length} added`)
    console.log('• Shop Dashboard: Ready for testing')
    
  } catch (error) {
    console.error('❌ Error creating basic shop data:', error)
  }
}

createBasicShopData()