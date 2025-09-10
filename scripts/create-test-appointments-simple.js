/**
 * Simplified script to create test bookings for auto-selection testing
 * Uses only the actual columns that exist in the bookings table
 * 
 * Run with: node scripts/create-test-appointments-simple.js
 */

const { createClient } = require('@supabase/supabase-js');

// Production database credentials
const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSimpleTestBookings() {

  try {
    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
      .single();
    
    if (!barbershop) {
      console.error('❌ No barbershop found');
      return;
    }

    // Get barbers
    const { data: barbers } = await supabase
      .from('barbershop_staff')
      .select('user_id, metadata')
      .eq('barbershop_id', barbershop.id)
      .eq('role', 'BARBER')
      .eq('is_active', true);

    // Use existing customers
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('barbershop_id', barbershop.id)
      .limit(3);
    
    if (!customers || customers.length === 0) {
      console.error('❌ No customers found');
      return;
    }

    // Create simple bookings

    let bookingsCreated = 0;
    const today = new Date();
    
    for (let i = 0; i < Math.min(6, customers.length * 2); i++) {
      const customer = customers[i % customers.length];
      const barber = barbers ? barbers[i % barbers.length] : null;
      
      const appointmentDate = new Date(today);
      appointmentDate.setDate(today.getDate() + Math.floor(i / 2));
      appointmentDate.setHours(9 + (i * 2), 0, 0, 0);
      
      const barberName = barber?.metadata?.full_name || barber?.metadata?.display_name || 'Walk-in';
      const barberId = barber?.user_id || null;
      
      const bookingData = {
        barbershop_id: barbershop.id,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone || '555-0000',
        customer_email: customer.email || 'test@example.com',
        service_name: 'Haircut',
        start_time: appointmentDate.toISOString(),
        end_time: new Date(appointmentDate.getTime() + 30 * 60000).toISOString(),
        status: i === 0 ? 'completed' : i < 3 ? 'confirmed' : 'pending',
        price: 35,
        duration_minutes: 30,
        notes: barberId ? `Assigned to: ${barberName} (${barberId})` : 'Walk-in appointment'
      };
      
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();
      
      if (error) {
        
      } else {
        bookingsCreated++;
        }`);
        
        // For completed bookings with barbers, create commission records
        if (booking.status === 'completed' && barberId) {
          const { error: commError } = await supabase
            .from('commission_transactions')
            .insert({
              payment_intent_id: `test_${Date.now()}_${i}`,
              arrangement_id: booking.id,
              barber_id: barberId,
              barbershop_id: barbershop.id,
              payment_amount: 35,
              commission_amount: 21, // 60%
              shop_amount: 14, // 40%
              commission_percentage: 60,
              arrangement_type: 'commission',
              status: 'pending_payout'
            });
          
          if (!commError) {
            
          }
        }
      }
    }
    
    // Verify

    const { data: allBookings } = await supabase
      .from('bookings')
      .select('id, status, customer_name, notes')
      .eq('barbershop_id', barbershop.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (allBookings && allBookings.length > 0) {
      
      allBookings.slice(0, 5).forEach(b => {
        const assignee = b.notes?.includes('Assigned to:') 
          ? b.notes.split('Assigned to: ')[1]?.split(' (')[0] 
          : 'No barber';
        `);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run it
createSimpleTestBookings()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal:', error);
    process.exit(1);
  });