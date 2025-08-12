// Comprehensive Shop Data Seeding Script
// Creates realistic test data for complete barbershop management system

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTIxMjUzMiwiZXhwIjoyMDUwNzg4NTMyfQ.VwP1RlHkKwMqNl0XDLPabxJZKgMkGRBu84hvOeLI8gQ'

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to generate random dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomTime(startHour = 9, endHour = 18) {
  const hour = startHour + Math.random() * (endHour - startHour)
  const minute = Math.floor(Math.random() * 4) * 15 // 0, 15, 30, 45
  return `${Math.floor(hour).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

async function seedCompleteShopData() {
  console.log('🌱 Starting comprehensive shop data seeding...')
  
  try {
    // 1. Ensure we have a shop owner and barbershop
    let ownerId = 'test-shop-owner-uuid'
    let shopId
    
    // Create/verify shop owner exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', ownerId)
      .single()
    
    if (!existingProfile) {
      console.log('👤 Creating shop owner profile...')
      await supabase
        .from('profiles')
        .insert({
          id: ownerId,
          email: 'owner@elitecuts.com',
          full_name: 'Marcus Johnson',
          role: 'SHOP_OWNER',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
        })
    }
    
    // Create/verify barbershop exists
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', ownerId)
      .single()
    
    if (!existingShop) {
      console.log('🏪 Creating Elite Cuts Barbershop...')
      const { data: newShop } = await supabase
        .from('barbershops')
        .insert({
          name: 'Elite Cuts Barbershop',
          owner_id: ownerId,
          slug: 'elite-cuts',
          address: '2547 Broadway Street',
          city: 'San Francisco',
          state: 'CA',
          zip_code: '94115',
          phone: '(415) 555-2847',
          email: 'info@elitecuts.com',
          website: 'https://elitecuts.com',
          description: 'Premium barbershop experience with master barbers specializing in classic and modern cuts.',
          is_active: true,
          total_clients: 0,
          monthly_revenue: 0,
          rating: 0,
          total_reviews: 0
        })
        .select()
        .single()
      shopId = newShop.id
    } else {
      shopId = existingShop.id
    }
    
    console.log(`✅ Shop ID: ${shopId}`)
    
    // 2. Create barber profiles and staff relationships
    console.log('✂️ Creating barber team...')
    const barbers = [
      {
        id: 'barber-alex-uuid',
        email: 'alex@elitecuts.com',
        full_name: 'Alex Rodriguez',
        role: 'BARBER',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        specialty: 'Classic cuts, beard styling',
        commission_rate: 60
      },
      {
        id: 'barber-jamie-uuid',
        email: 'jamie@elitecuts.com',
        full_name: 'Jamie Chen',
        role: 'BARBER',
        avatar_url: 'https://images.unsplash.com/photo-1494790108755-2616b332-111?w=150',
        specialty: 'Modern styles, fades',
        commission_rate: 65
      },
      {
        id: 'barber-mike-uuid',
        email: 'mike@elitecuts.com',
        full_name: 'Mike Thompson',
        role: 'BARBER',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        specialty: 'Precision cuts, styling',
        commission_rate: 70
      }
    ]
    
    for (const barber of barbers) {
      // Create profile if doesn't exist
      const { data: existingBarber } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', barber.id)
        .single()
      
      if (!existingBarber) {
        await supabase.from('profiles').insert({
          id: barber.id,
          email: barber.email,
          full_name: barber.full_name,
          role: barber.role,
          avatar_url: barber.avatar_url
        })
        
        // Add to barbershop staff
        await supabase.from('barbershop_staff').insert({
          barbershop_id: shopId,
          user_id: barber.id,
          role: 'BARBER',
          is_active: true,
          commission_rate: barber.commission_rate,
          financial_model: 'commission'
        })
        
        console.log(`✅ Created barber: ${barber.full_name}`)
      }
    }
    
    // 3. Create service catalog
    console.log('💇 Creating service catalog...')
    const services = [
      {
        name: 'Classic Haircut',
        description: 'Traditional scissor cut with styling',
        category: 'haircut',
        price: 35.00,
        duration_minutes: 45,
        is_featured: true,
        display_order: 1
      },
      {
        name: 'Fade Cut',
        description: 'Modern fade with precise blending',
        category: 'haircut',
        price: 40.00,
        duration_minutes: 50,
        is_featured: true,
        display_order: 2
      },
      {
        name: 'Beard Trim & Shape',
        description: 'Professional beard trimming and shaping',
        category: 'beard',
        price: 25.00,
        duration_minutes: 30,
        display_order: 3
      },
      {
        name: 'Hot Towel Shave',
        description: 'Traditional straight razor shave with hot towel',
        category: 'shave',
        price: 45.00,
        duration_minutes: 60,
        requires_consultation: true,
        display_order: 4
      },
      {
        name: 'Hair Wash & Style',
        description: 'Shampoo, conditioning, and professional styling',
        category: 'styling',
        price: 20.00,
        duration_minutes: 25,
        display_order: 5
      },
      {
        name: 'Full Service Package',
        description: 'Haircut, beard trim, shampoo, and styling',
        category: 'combo',
        price: 75.00,
        duration_minutes: 90,
        is_featured: true,
        display_order: 6
      }
    ]
    
    const { data: insertedServices } = await supabase
      .from('services')
      .insert(services.map(service => ({ ...service, barbershop_id: shopId })))
      .select()
    
    console.log(`✅ Created ${insertedServices.length} services`)
    
    // 4. Create customers
    console.log('👥 Creating customer base...')
    const customers = [
      { first_name: 'David', last_name: 'Wilson', email: 'david.wilson@email.com', phone: '(415) 555-0123' },
      { first_name: 'Michael', last_name: 'Brown', email: 'michael.brown@email.com', phone: '(415) 555-0124' },
      { first_name: 'James', last_name: 'Davis', email: 'james.davis@email.com', phone: '(415) 555-0125' },
      { first_name: 'Robert', last_name: 'Miller', email: 'robert.miller@email.com', phone: '(415) 555-0126' },
      { first_name: 'John', last_name: 'Garcia', email: 'john.garcia@email.com', phone: '(415) 555-0127' },
      { first_name: 'William', last_name: 'Rodriguez', email: 'william.rodriguez@email.com', phone: '(415) 555-0128' },
      { first_name: 'Richard', last_name: 'Martinez', email: 'richard.martinez@email.com', phone: '(415) 555-0129' },
      { first_name: 'Charles', last_name: 'Anderson', email: 'charles.anderson@email.com', phone: '(415) 555-0130' },
      { first_name: 'Christopher', last_name: 'Taylor', email: 'christopher.taylor@email.com', phone: '(415) 555-0131' },
      { first_name: 'Daniel', last_name: 'Thomas', email: 'daniel.thomas@email.com', phone: '(415) 555-0132' },
      { first_name: 'Matthew', last_name: 'Jackson', email: 'matthew.jackson@email.com', phone: '(415) 555-0133' },
      { first_name: 'Anthony', last_name: 'White', email: 'anthony.white@email.com', phone: '(415) 555-0134' },
      { first_name: 'Mark', last_name: 'Harris', email: 'mark.harris@email.com', phone: '(415) 555-0135' },
      { first_name: 'Donald', last_name: 'Martin', email: 'donald.martin@email.com', phone: '(415) 555-0136' },
      { first_name: 'Steven', last_name: 'Thompson', email: 'steven.thompson@email.com', phone: '(415) 555-0137' },
      { first_name: 'Andrew', last_name: 'Garcia', email: 'andrew.garcia@email.com', phone: '(415) 555-0138' },
      { first_name: 'Joshua', last_name: 'Martinez', email: 'joshua.martinez@email.com', phone: '(415) 555-0139' },
      { first_name: 'Kenneth', last_name: 'Robinson', email: 'kenneth.robinson@email.com', phone: '(415) 555-0140' },
      { first_name: 'Paul', last_name: 'Clark', email: 'paul.clark@email.com', phone: '(415) 555-0141' },
      { first_name: 'Kevin', last_name: 'Lewis', email: 'kevin.lewis@email.com', phone: '(415) 555-0142' }
    ]
    
    const { data: insertedCustomers } = await supabase
      .from('customers')
      .insert(customers.map(customer => ({
        ...customer,
        barbershop_id: shopId,
        first_visit: randomDate(new Date(2024, 3, 1), new Date(2024, 10, 1)), // Apr-Nov 2024
        marketing_consent: Math.random() > 0.3,
        referral_source: ['Google', 'Facebook', 'Walk-in', 'Referral', 'Instagram'][Math.floor(Math.random() * 5)]
      })))
      .select()
    
    console.log(`✅ Created ${insertedCustomers.length} customers`)
    
    // 5. Create appointments (past, present, future)
    console.log('📅 Creating appointment history...')
    const appointments = []
    const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'no_show']
    const paymentMethods = ['cash', 'card', 'card', 'card', 'online']
    
    // Create appointments over the last 3 months
    for (let i = 0; i < 150; i++) {
      const customer = insertedCustomers[Math.floor(Math.random() * insertedCustomers.length)]
      const service = insertedServices[Math.floor(Math.random() * insertedServices.length)]
      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      
      const appointmentDate = randomDate(new Date(2024, 8, 1), new Date()) // Sep 1 - now
      const startTime = randomTime(9, 17)
      const endTime = new Date(`2024-01-01 ${startTime}`)
      endTime.setMinutes(endTime.getMinutes() + service.duration_minutes)
      
      const status = Math.random() > 0.15 ? 'completed' : statuses[Math.floor(Math.random() * statuses.length)]
      const tipAmount = status === 'completed' ? Math.random() * 15 : 0
      
      appointments.push({
        barbershop_id: shopId,
        customer_id: customer.id,
        barber_id: barber.id,
        service_id: service.id,
        appointment_date: appointmentDate.toISOString().split('T')[0],
        start_time: new Date(`${appointmentDate.toISOString().split('T')[0]} ${startTime}`).toISOString(),
        end_time: new Date(`${appointmentDate.toISOString().split('T')[0]} ${endTime.toTimeString().split(' ')[0]}`).toISOString(),
        duration_minutes: service.duration_minutes,
        status,
        service_name: service.name,
        base_price: service.price,
        total_amount: service.price,
        payment_status: status === 'completed' ? 'paid' : 'pending',
        payment_method: status === 'completed' ? paymentMethods[Math.floor(Math.random() * paymentMethods.length)] : null,
        tip_amount: tipAmount,
        completed_at: status === 'completed' ? appointmentDate.toISOString() : null
      })
    }
    
    // Add today's appointments
    const today = new Date()
    const todayAppointments = [
      { hour: 9, customer: insertedCustomers[0], service: insertedServices[0], barber: barbers[0], status: 'completed' },
      { hour: 10, customer: insertedCustomers[1], service: insertedServices[1], barber: barbers[1], status: 'completed' },
      { hour: 11, customer: insertedCustomers[2], service: insertedServices[2], barber: barbers[0], status: 'in_progress' },
      { hour: 14, customer: insertedCustomers[3], service: insertedServices[0], barber: barbers[2], status: 'confirmed' },
      { hour: 15, customer: insertedCustomers[4], service: insertedServices[3], barber: barbers[1], status: 'confirmed' },
      { hour: 16, customer: insertedCustomers[5], service: insertedServices[1], barber: barbers[0], status: 'confirmed' }
    ]
    
    todayAppointments.forEach(apt => {
      const startTime = new Date(today)
      startTime.setHours(apt.hour, 0, 0, 0)
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + apt.service.duration_minutes)
      
      appointments.push({
        barbershop_id: shopId,
        customer_id: apt.customer.id,
        barber_id: apt.barber.id,
        service_id: apt.service.id,
        appointment_date: today.toISOString().split('T')[0],
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: apt.service.duration_minutes,
        status: apt.status,
        service_name: apt.service.name,
        base_price: apt.service.price,
        total_amount: apt.service.price,
        payment_status: apt.status === 'completed' ? 'paid' : 'pending',
        payment_method: apt.status === 'completed' ? 'card' : null,
        tip_amount: apt.status === 'completed' ? 5 + Math.random() * 10 : 0,
        completed_at: apt.status === 'completed' ? startTime.toISOString() : null
      })
    })
    
    const { data: insertedAppointments } = await supabase
      .from('appointments')
      .insert(appointments)
      .select()
    
    console.log(`✅ Created ${insertedAppointments.length} appointments`)
    
    // 6. Create transactions for completed appointments
    console.log('💰 Creating transaction history...')
    const transactions = []
    
    insertedAppointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const barber = barbers.find(b => b.id === apt.barber_id)
        const commissionRate = barber.commission_rate
        const commissionAmount = (apt.total_amount * commissionRate) / 100
        const shopAmount = apt.total_amount - commissionAmount
        
        // Service transaction
        transactions.push({
          barbershop_id: shopId,
          appointment_id: apt.id,
          customer_id: apt.customer_id,
          barber_id: apt.barber_id,
          transaction_type: 'service',
          amount: apt.total_amount,
          net_amount: apt.total_amount,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          shop_amount: shopAmount,
          barber_amount: commissionAmount,
          payment_method: apt.payment_method,
          payment_status: 'completed',
          processed_at: apt.completed_at,
          description: `Service: ${apt.service_name}`
        })
        
        // Tip transaction if there's a tip
        if (apt.tip_amount > 0) {
          transactions.push({
            barbershop_id: shopId,
            appointment_id: apt.id,
            customer_id: apt.customer_id,
            barber_id: apt.barber_id,
            transaction_type: 'tip',
            amount: apt.tip_amount,
            net_amount: apt.tip_amount,
            commission_rate: 100,
            commission_amount: apt.tip_amount,
            shop_amount: 0,
            barber_amount: apt.tip_amount,
            payment_method: apt.payment_method,
            payment_status: 'completed',
            processed_at: apt.completed_at,
            description: 'Customer tip'
          })
        }
      })
    
    await supabase.from('transactions').insert(transactions)
    console.log(`✅ Created ${transactions.length} transactions`)
    
    // 7. Create reviews for some completed appointments
    console.log('⭐ Creating customer reviews...')
    const completedAppointments = insertedAppointments.filter(apt => apt.status === 'completed')
    const reviewsToCreate = completedAppointments.slice(0, 25) // Reviews for 25 appointments
    
    const reviews = reviewsToCreate.map(apt => ({
      barbershop_id: shopId,
      customer_id: apt.customer_id,
      appointment_id: apt.id,
      barber_id: apt.barber_id,
      rating: 4 + Math.floor(Math.random() * 2), // 4 or 5 stars
      title: [
        'Great service!',
        'Excellent haircut',
        'Professional and friendly',
        'Best barber in town',
        'Highly recommend',
        'Amazing experience',
        'Perfect cut every time'
      ][Math.floor(Math.random() * 7)],
      comment: [
        'Alex did an amazing job on my haircut. Very professional and the shop has a great atmosphere.',
        'Been coming here for months and never disappointed. Great team of barbers.',
        'Perfect fade cut. Jamie really knows what they\'re doing.',
        'Mike gave me the best haircut I\'ve had in years. Will definitely be back.',
        'Clean shop, skilled barbers, fair prices. What more could you want?',
        'The hot towel shave was incredibly relaxing. Highly recommended.',
        'Great attention to detail and customer service. Five stars!'
      ][Math.floor(Math.random() * 7)],
      service_rating: 5,
      cleanliness_rating: 5,
      value_rating: 4 + Math.floor(Math.random() * 2),
      is_verified: true,
      review_source: 'internal'
    }))
    
    await supabase.from('reviews').insert(reviews)
    console.log(`✅ Created ${reviews.length} reviews`)
    
    // 8. Update barbershop stats
    console.log('📊 Updating barbershop statistics...')
    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    
    await supabase
      .from('barbershops')
      .update({
        total_clients: insertedCustomers.length,
        monthly_revenue: Math.round(totalRevenue * 0.3), // Approximate monthly
        rating: Math.round(avgRating * 10) / 10,
        total_reviews: reviews.length
      })
      .eq('id', shopId)
    
    console.log('\n🎉 Comprehensive shop data seeding completed!')
    console.log('\n📈 Summary:')
    console.log(`• Shop: Elite Cuts Barbershop`)
    console.log(`• Barbers: ${barbers.length} active`)
    console.log(`• Customers: ${insertedCustomers.length}`)
    console.log(`• Services: ${insertedServices.length}`)
    console.log(`• Appointments: ${insertedAppointments.length}`)
    console.log(`• Transactions: ${transactions.length}`)
    console.log(`• Reviews: ${reviews.length}`)
    console.log(`• Total Revenue: $${totalRevenue.toFixed(2)}`)
    console.log(`• Average Rating: ${avgRating.toFixed(1)}/5`)
    
    console.log('\n🚀 Your shop dashboard is now ready with realistic data!')
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
  }
}

// Run the seeding
seedCompleteShopData()