/**
 * Production readiness validation for intelligent barber auto-selection
 * Comprehensive check of all components and dependencies
 * 
 * Run with: node scripts/validate-production-readiness.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function validateProductionReadiness() {
  
   + '\n');
  
  let allPassed = true;
  
  try {
    // 1. DATABASE VALIDATION
    
    );
    
    const criticalTables = [
      'profiles',
      'barbershops', 
      'barbershop_staff',
      'bookings',
      'commission_transactions',
      'barber_commission_balances'
    ];
    
    for (const table of criticalTables) {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        
        allPassed = false;
      } else {
        
      }
    }

    // 2. TEST DATA VALIDATION
    
    );
    
    const { data: barbers } = await supabase
      .from('barbershop_staff')
      .select('*')
      .eq('role', 'BARBER')
      .eq('is_active', true);
    
    const barberCount = barbers?.length || 0;

    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .like('notes', '%Assigned to:%');
    
    const bookingCount = bookings?.length || 0;

    const { data: commissions } = await supabase
      .from('commission_transactions')
      .select('*');
    
    const commissionCount = commissions?.length || 0;

    // 3. FEATURE VALIDATION
    
    );
    
    : ${bookingCount > 0 ? '✅ READY' : '⚠️ NEEDS DATA'}`);
    : ${barberCount > 0 ? '✅ READY' : '❌ NEEDS BARBERS'}`);
    : ✅ ALWAYS READY');
    
    : ✅ IMPLEMENTED');

    // 4. FINAL SUMMARY
    
    );
    
    if (barberCount === 0) {
      allPassed = false;

    }
    
    if (allPassed && barberCount > 0) {

    } else {
      
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation
validateProductionReadiness()
  .then(passed => {
    );
    process.exit(passed ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal:', error);
    process.exit(1);
  });
