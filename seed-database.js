/**
 * Simple Database Seed Script for Test Data
 * Run with: node seed-database.js
 */

const { createClient } = require('./lib/supabase/client.js')

async function seedDatabase() {
  console.log('🌱 Starting database seed with test data...')
  
  const supabase = createClient()
  
  try {
    // 1. Create test barbershop (if not exists)
    console.log('📍 Creating test barbershop...')
    const { data: shop, error: shopError } = await supabase
      .from('barbershops')
      .upsert({
        id: 'test-shop-001',
        owner_id: 'test-owner-001',
        name: 'Premium Cuts Barbershop',
        email: 'contact@premiumcuts.com',
        phone: '(555) 123-4567',
        address: '123 Main Street',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'USA',
        description: 'A premium barbershop offering top-notch grooming services',
        is_active: true
      }, {
        onConflict: 'id'
      })
      .select()
      .single()
    
    if (shopError && !shopError.message.includes('duplicate')) {
      console.error('Shop error:', shopError)
    } else {
      console.log('✅ Barbershop created/updated')
    }
    
    // 2. Create test appointments for the past 30 days
    console.log('📅 Creating test appointments...')
    const appointments = []
    const services = ['Haircut', 'Beard Trim', 'Hair & Beard', 'Fade', 'Line Up', 'Hot Shave']
    const statuses = ['completed', 'completed', 'completed', 'confirmed', 'cancelled']
    
    for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
      const appointmentDate = new Date()
      appointmentDate.setDate(appointmentDate.getDate() - daysAgo)
      
      // 3-8 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 6) + 3
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const startTime = new Date(appointmentDate)
        startTime.setHours(9 + Math.floor(Math.random() * 9), Math.random() > 0.5 ? 0 : 30)
        
        const endTime = new Date(startTime)
        endTime.setMinutes(endTime.getMinutes() + 30)
        
        appointments.push({
          barbershop_id: 'test-shop-001',
          barber_id: `test-barber-00${(i % 3) + 1}`,
          customer_id: `test-customer-00${Math.floor(Math.random() * 10) + 1}`,
          service_name: services[Math.floor(Math.random() * services.length)],
          service_duration: 30,
          service_price: Math.floor(Math.random() * 30) + 25,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: statuses[Math.floor(Math.random() * statuses.length)],
          created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    }
    
    const batchSize = 50
    for (let i = 0; i < appointments.length; i += batchSize) {
      const batch = appointments.slice(i, i + batchSize)
      const { error: apptError } = await supabase
        .from('appointments')
        .insert(batch)
      
      if (apptError && !apptError.message.includes('duplicate')) {
        console.error('Appointment batch error:', apptError)
      }
    }
    console.log(`✅ Created ${appointments.length} test appointments`)
    
    // 3. Create test transactions for completed appointments
    console.log('💰 Creating test transactions...')
    const transactions = []
    const completedAppointments = appointments.filter(a => a.status === 'completed')
    
    for (const appointment of completedAppointments) {
      const serviceAmount = appointment.service_price
      const tipAmount = Math.random() > 0.3 ? Math.floor(Math.random() * 15) + 5 : 0
      const totalAmount = serviceAmount + tipAmount
      
      transactions.push({
        barbershop_id: 'test-shop-001',
        barber_id: appointment.barber_id,
        customer_id: appointment.customer_id,
        type: 'service',
        amount: serviceAmount,
        tip_amount: tipAmount,
        total_amount: totalAmount,
        commission_amount: serviceAmount * 0.6,
        payment_method: Math.random() > 0.5 ? 'card' : 'cash',
        status: 'completed',
        created_at: appointment.end_time
      })
    }
    
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)
      const { error: transError } = await supabase
        .from('transactions')
        .insert(batch)
      
      if (transError && !transError.message.includes('duplicate')) {
        console.error('Transaction batch error:', transError)
      }
    }
    console.log(`✅ Created ${transactions.length} test transactions`)
    
    // 4. Create test customers
    console.log('👥 Creating test customers...')
    const customers = []
    const customerNames = [
      'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince',
      'Edward Norton', 'Fiona Apple', 'George Lucas', 'Helen Hunt',
      'Ian McKellen', 'Julia Roberts'
    ]
    
    for (let i = 0; i < customerNames.length; i++) {
      customers.push({
        id: `test-customer-00${i + 1}`,
        barbershop_id: 'test-shop-001',
        full_name: customerNames[i],
        email: `${customerNames[i].toLowerCase().replace(' ', '.')}@customer.com`,
        phone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    const { error: custError } = await supabase
      .from('customers')
      .upsert(customers, { onConflict: 'id' })
    
    if (custError && !custError.message.includes('duplicate')) {
      console.error('Customer error:', custError)
    } else {
      console.log(`✅ Created ${customers.length} test customers`)
    }
    
    // 5. Create test barber staff
    console.log('✂️ Creating test barbers...')
    const barbers = [
      { id: 'test-barber-001', name: 'Mike Barber', commission: 60 },
      { id: 'test-barber-002', name: 'Sarah Stylist', commission: 65 },
      { id: 'test-barber-003', name: 'Tom Trimmer', commission: 55 }
    ]
    
    for (const barber of barbers) {
      const { error: staffError } = await supabase
        .from('barbershop_staff')
        .upsert({
          barbershop_id: 'test-shop-001',
          user_id: barber.id,
          role: 'BARBER',
          is_active: true,
          commission_rate: barber.commission,
          financial_model: 'commission'
        }, {
          onConflict: 'barbershop_id,user_id'
        })
      
      if (staffError && !staffError.message.includes('duplicate')) {
        console.error('Staff error:', staffError)
      }
    }
    console.log(`✅ Created ${barbers.length} test barbers`)
    
    console.log('\n🎉 Database seeded successfully!')
    console.log('\n📊 Test Data Summary:')
    console.log(`- 1 Barbershop (Premium Cuts)`)
    console.log(`- ${barbers.length} Barbers`)
    console.log(`- ${customers.length} Customers`)
    console.log(`- ${appointments.length} Appointments (past 30 days)`)
    console.log(`- ${transactions.length} Transactions`)
    console.log('\n💡 The barber reports page will now show real data from the database!')
    
  } catch (error) {
    console.error('❌ Seed error:', error)
    process.exit(1)
  }
}

seedDatabase()