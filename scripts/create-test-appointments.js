/**
 * Script to create test appointment data for barber auto-selection testing
 * This creates appointments with barber assignments to test the appointment-based selection
 * 
 * Run with: node scripts/create-test-appointments.js
 */

const { createClient } = require('@supabase/supabase-js');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAppointments() {

  try {
    // Step 1: Get barbershop and barber staff
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
      .single();
    
    if (shopError || !barbershop) {
      console.error('❌ No barbershop found');
      return;
    }

    // Get active barber staff
    const { data: barbers, error: barbersError } = await supabase
      .from('barbershop_staff')
      .select('user_id, role, metadata')
      .eq('barbershop_id', barbershop.id)
      .eq('role', 'BARBER')
      .eq('is_active', true);
    
    if (barbersError || !barbers || barbers.length === 0) {
      console.error('❌ No active barbers found');
      return;
    }

    // Step 2: Get or create test customers

    const testCustomers = [
      { name: 'John Test Customer', email: 'john.test@example.com', phone: '555-0101' },
      { name: 'Mike Test Customer', email: 'mike.test@example.com', phone: '555-0102' },
      { name: 'Sarah Test Customer', email: 'sarah.test@example.com', phone: '555-0103' },
      { name: 'David Test Customer', email: 'david.test@example.com', phone: '555-0104' }
    ];
    
    const customerIds = [];
    
    for (const customer of testCustomers) {
      // Try to get existing customer or create new one
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('barbershop_id', barbershop.id)
        .eq('email', customer.email)
        .single();
      
      if (existingCustomer) {
        customerIds.push(existingCustomer.id);
        
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            barbershop_id: barbershop.id,
            barbershop_id: barbershop.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (customerError) {
          
        } else {
          customerIds.push(newCustomer.id);
          
        }
      }
    }
    
    // Step 3: Get services from the barbershop
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .limit(3);
    
    let serviceIds = [];
    
    if (services && services.length > 0) {
      serviceIds = services.map(s => s.id);
      
      services.forEach(s => `));
    } else {

      const defaultServices = [
        { name: 'Haircut', price: 35, duration_minutes: 30 },
        { name: 'Beard Trim', price: 20, duration_minutes: 20 },
        { name: 'Full Service', price: 50, duration_minutes: 45 }
      ];
      
      for (const service of defaultServices) {
        const { data: newService, error: serviceError } = await supabase
          .from('services')
          .insert({
            barbershop_id: barbershop.id,
            ...service,
            is_active: true,
            category: 'general'
          })
          .select()
          .single();
        
        if (!serviceError && newService) {
          serviceIds.push(newService.id);
          
        }
      }
    }
    
    // Step 4: Create appointments with barber assignments

    const appointmentStatuses = ['completed', 'confirmed', 'pending', 'cancelled'];
    const appointmentsCreated = [];
    
    // Create appointments for the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + dayOffset);
      
      // Create 2-3 appointments per day
      const appointmentsPerDay = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < appointmentsPerDay; i++) {
        const barber = barbers[Math.floor(Math.random() * barbers.length)];
        const customerIndex = Math.floor(Math.random() * customerIds.length);
        const customerId = customerIds[customerIndex];
        const serviceId = serviceIds[Math.floor(Math.random() * serviceIds.length)];
        const status = dayOffset === 0 ? 'completed' : 
                       dayOffset <= 2 ? 'confirmed' : 
                       appointmentStatuses[Math.floor(Math.random() * appointmentStatuses.length)];
        
        // Set appointment time (9 AM - 6 PM)
        const hour = 9 + Math.floor(Math.random() * 9);
        const minute = Math.random() < 0.5 ? 0 : 30;
        appointmentDate.setHours(hour, minute, 0, 0);
        
        // Get the service details for the booking
        const service = services?.find(s => s.id === serviceId);
        const customer = testCustomers[customerIndex];
        const barberMetadata = barber.metadata || {};
        
        const bookingData = {
          barbershop_id: barbershop.id,
          customer_id: customerId,
          service_id: serviceId,
          barber_id: barber.user_id,
          start_time: appointmentDate.toISOString(),
          end_time: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(),
          status: status,
          price: service?.price || 35,
          notes: `Test appointment for auto-selection testing`,
          customer_name: customer?.name || 'Test Customer',
          customer_phone: customer?.phone || '555-0000',
          customer_email: customer?.email || 'test@example.com',
          service_name: service?.name || 'Haircut',
          barber_name: barberMetadata.full_name || 'Test Barber',
          duration_minutes: service?.duration_minutes || 30,
          is_test: true,
          created_at: new Date().toISOString()
        };
        
        const { data: appointment, error: appointmentError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();
        
        if (appointmentError) {
          
        } else {
          appointmentsCreated.push(appointment);
          const barberName = barber.metadata?.full_name || 'Unknown Barber';
          } with ${barberName}`);
        }
      }
    }
    
    // Step 5: Create commission transactions for completed appointments

    const completedAppointments = appointmentsCreated.filter(a => a.status === 'completed');
    
    for (const appointment of completedAppointments) {
      const service = services?.find(s => s.id === appointment.service_id);
      const barber = barbers.find(b => b.user_id === appointment.barber_id);
      
      if (service && barber) {
        const commissionAmount = service.price * 0.60; // 60% commission rate
        const shopAmount = service.price * 0.40;
        
        const { error: commissionError } = await supabase
          .from('commission_transactions')
          .insert({
            payment_intent_id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            arrangement_id: appointment.id, // Using appointment ID as arrangement reference
            barber_id: appointment.barber_id,
            barbershop_id: barbershop.id,
            payment_amount: service.price,
            commission_amount: commissionAmount,
            shop_amount: shopAmount,
            commission_percentage: 60,
            arrangement_type: 'commission',
            status: 'pending_payout',
            metadata: {
              appointment_id: appointment.id,
              service_name: service.name,
              test_transaction: true
            }
          });
        
        if (commissionError) {
          
        } else {
          
        }
      }
    }
    
    // Step 6: Verification

    const { data: verifyAppointments, error: verifyError } = await supabase
      .from('bookings')
      .select('id, status, barber_id')
      .eq('barbershop_id', barbershop.id)
      .not('barber_id', 'is', null);
    
    if (verifyError) {
      
    } else {
      const appointmentsByBarber = {};
      verifyAppointments.forEach(apt => {
        appointmentsByBarber[apt.barber_id] = (appointmentsByBarber[apt.barber_id] || 0) + 1;
      });

      Object.entries(appointmentsByBarber).forEach(([barberId, count]) => {
        const barber = barbers.find(b => b.user_id === barberId);
        const barberName = barber?.metadata?.full_name || 'Unknown';
        
      });
    }

    ');
    
    ');
    
    ');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error);
  }
}

// Run the script
createTestAppointments()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });