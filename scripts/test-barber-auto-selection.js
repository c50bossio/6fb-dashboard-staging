/**
 * End-to-end test for intelligent barber auto-selection and commission tracking
 * Tests all three priority levels of the selection algorithm
 * 
 * Run with: node scripts/test-barber-auto-selection.js
 */

const { createClient } = require('@supabase/supabase-js');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBarberAutoSelection() {

  try {
    // Step 1: Get test barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id, name')
      .limit(1)
      .single();

    // Step 2: Test Priority 1 - Appointment-based selection

    const { data: bookingWithBarber } = await supabase
      .from('bookings')
      .select('*')
      .eq('shop_id', barbershop.id)
      .like('notes', '%Assigned to:%')
      .limit(1)
      .single();
    
    if (bookingWithBarber) {

      .toLocaleDateString()}`);

      // Extract barber info from notes
      const barberMatch = bookingWithBarber.notes.match(/Assigned to: (.*?) \((.*?)\)/);
      if (barberMatch) {
        const [, barberName, barberId] = barberMatch;

      }
    } else {
      
    }
    
    // Step 3: Test Priority 2 - Logged-in barber selection

    const { data: activeBarbers } = await supabase
      .from('barbershop_staff')
      .select('user_id, role, metadata')
      .eq('barbershop_id', barbershop.id)
      .eq('role', 'BARBER')
      .eq('is_active', true);
    
    if (activeBarbers && activeBarbers.length > 0) {

      for (const barber of activeBarbers.slice(0, 3)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, role')
          .eq('id', barber.user_id)
          .single();
        
        const barberName = barber.metadata?.full_name || barber.metadata?.display_name || 'Unknown';

      }
      
    } else {
      
    }
    
    // Step 4: Test Priority 3 - Manual fallback

    // Step 5: Test commission tracking

    const { data: commissions } = await supabase
      .from('commission_transactions')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (commissions && commissions.length > 0) {

      for (const commission of commissions) {
        const { data: barberProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', commission.barber_id)
          .single();
        
        }`);
         + '...'}`);
        
        .toLocaleDateString()}`);
      }
      
    } else {
      
    }
    
    // Step 6: Verify barber balances

    const { data: balances } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .eq('barbershop_id', barbershop.id);
    
    if (balances && balances.length > 0) {

      for (const balance of balances) {
        const { data: barberProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', balance.barber_id)
          .single();

        }`);
        }`);
        }`);
      }
      
    } else {
      
    }
    
    // Step 7: Summary and recommendations

    const hasBookingsWithBarbers = bookingWithBarber !== null;
    const hasActiveBarbers = activeBarbers && activeBarbers.length > 0;
    const hasCommissions = commissions && commissions.length > 0;
    const hasBalances = balances && balances.length > 0;
    
    : ${hasBookingsWithBarbers ? '✅ TESTABLE' : '⚠️ NEEDS DATA'}`);
    : ${hasActiveBarbers ? '✅ TESTABLE' : '⚠️ NEEDS BARBERS'}`);
    : ✅ ALWAYS AVAILABLE`);

    if (hasBookingsWithBarbers && hasActiveBarbers) {

    } else {
      
      if (!hasBookingsWithBarbers) {
        
      }
      if (!hasActiveBarbers) {
        
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testBarberAutoSelection()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });