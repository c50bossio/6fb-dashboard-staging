/**
 * Fixed script to create test appointment data for barber auto-selection testing
 * This creates bookings (not appointments) with proper schema
 * 
 * Run with: node scripts/create-test-appointments-fixed.js
 */

const { createClient } = require('@supabase/supabase-js');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestAppointments() {

  try {
    // Step 1: Get barbershop
    const { data: barbershop, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
      .single();
    
    if (shopError || !barbershop) {
      console.error('❌ No barbershop found');
      return;
    }

    // Step 2: Get active barber staff
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

    barbers.forEach(b => {
      const name = b.metadata?.full_name || b.metadata?.display_name || 'Unknown';
      }...)`);
    });
    
    // Step 3: Create test customers first

    const testCustomers = [
      { name: 'John Test Customer', email: 'john.test@example.com', phone: '555-0101' },
      { name: 'Mike Test Customer', email: 'mike.test@example.com', phone: '555-0102' },
      { name: 'Sarah Test Customer', email: 'sarah.test@example.com', phone: '555-0103' }
    ];
    
    const customerIds = [];
    
    for (const customer of testCustomers) {
      // Check if customer exists
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
            phone: customer.phone
          })
          .select()
          .single();
        
        if (customerError) {
          
        } else {
          customerIds.push(newCustomer.id);
          
        }
      }
    }
    
    // Step 4: Create bookings WITHOUT barber_id initially (to avoid FK constraint)

    const bookingsCreated = [];
    const appointmentStatuses = ['completed', 'confirmed', 'pending'];
    
    // Create bookings for the next 3 days
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + dayOffset);
      
      // Create 2 bookings per day
      for (let i = 0; i < 2; i++) {
        const customerIndex = (dayOffset * 2 + i) % customerIds.length;
        const customerId = customerIds[customerIndex];
        const customer = testCustomers[customerIndex];
        const status = appointmentStatuses[dayOffset];
        
        // Set appointment time (9 AM - 5 PM)
        const hour = 9 + (i * 3) + dayOffset;
        appointmentDate.setHours(hour, 0, 0, 0);
        
        // Select a barber for this booking
        const barberIndex = (dayOffset + i) % barbers.length;
        const barber = barbers[barberIndex];
        const barberName = barber.metadata?.full_name || barber.metadata?.display_name || 'Test Barber';
        
        const bookingData = {
          barbershop_id: barbershop.id,
          customer_id: customerId,
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email,
          service_name: 'Haircut',
          start_time: appointmentDate.toISOString(),
          end_time: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(),
          status: status,
          price: 35,
          duration_minutes: 30,
          notes: `Test booking for auto-selection testing - Assigned to ${barberName}`,
          // Store barber info in metadata for now
          metadata: {
            assigned_barber_id: barber.user_id,
            assigned_barber_name: barberName,
            is_test: true
          }
        };
        
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();
        
        if (bookingError) {
          
        } else {
          bookingsCreated.push({
            ...booking,
            assigned_barber: barber
          });
          } - ${customer.name} with ${barberName}`);
        }
      }
    }
    
    // Step 5: Create commission transactions for completed bookings

    const completedBookings = bookingsCreated.filter(b => b.status === 'completed');
    
    for (const booking of completedBookings) {
      const barber = booking.assigned_barber;
      const commissionAmount = booking.price * 0.60; // 60% commission
      const shopAmount = booking.price * 0.40;
      
      const { error: commissionError } = await supabase
        .from('commission_transactions')
        .insert({
          payment_intent_id: `test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          arrangement_id: booking.id,
          barber_id: barber.user_id,
          barbershop_id: barbershop.id,
          payment_amount: booking.price,
          commission_amount: commissionAmount,
          shop_amount: shopAmount,
          commission_percentage: 60,
          arrangement_type: 'commission',
          status: 'pending_payout',
          metadata: {
            booking_id: booking.id,
            service_name: booking.service_name,
            test_transaction: true
          }
        });
      
      if (commissionError) {
        
      } else {
        const barberName = barber.metadata?.full_name || 'Unknown';
        } for ${barberName}`);
      }
    }
    
    // Step 6: Verification

    const { data: verifyBookings } = await supabase
      .from('bookings')
      .select('id, status, customer_name, metadata')
      .eq('barbershop_id', barbershop.id)
      .order('start_time', { ascending: true });

    if (verifyBookings && verifyBookings.length > 0) {
      
      const statusCounts = {};
      verifyBookings.forEach(booking => {
        statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, count]) => {
        
      });

      verifyBookings.slice(0, 5).forEach(booking => {
        const barberName = booking.metadata?.assigned_barber_name || 'Unassigned';
        `);
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