/**
 * Script to create test barber staff records for auto-selection testing
 * This creates barbershop_staff records that can be used for testing
 * 
 * Run with: node scripts/create-test-barber-staff.js
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestBarberStaff() {

  try {
    // Step 1: Get the first barbershop
    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .limit(1)
      .single();
    
    if (shopError || !barbershops) {
      console.error('❌ No barbershops found in database');
      return;
    }

    // Step 2: Check if we have any existing profiles we can use
    const { data: existingProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .limit(5);
    
    if (existingProfiles && existingProfiles.length > 0) {

      // Update the first 3 profiles to be BARBERs
      let barbersCreated = 0;
      for (let i = 0; i < Math.min(3, existingProfiles.length); i++) {
        const profile = existingProfiles[i];

        // Update profile to BARBER role
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'BARBER',
            barbershop_id: barbershops.id,
            barbershop_id: barbershops.id,
            onboarding_completed: true
          })
          .eq('id', profile.id);
        
        if (updateError) {
          
          continue;
        }

        // Create or update barbershop_staff record
        const { error: staffError } = await supabase
          .from('barbershop_staff')
          .upsert({
            barbershop_id: barbershops.id,
            user_id: profile.id,
            role: 'BARBER',
            is_active: true,
            financial_model: 'commission',
            commission_rate: 0.60,
            years_experience: 3 + i * 2,
            metadata: {
              test_user: true,
              created_for: 'auto-selection-testing',
              display_name: `Barber${i + 1}`,
              specialties: ['Fades', 'Beard Trim', 'Classic Cuts'][i % 3],
              email: profile.email,
              full_name: profile.full_name || `Test Barber ${i + 1}`
            }
          }, {
            onConflict: 'barbershop_id,user_id'
          });
        
        if (staffError) {
          
        } else {
          
          barbersCreated++;
        }
        
        // Initialize commission balance
        const { error: balanceError } = await supabase
          .from('barber_commission_balances')
          .upsert({
            barber_id: profile.id,
            barbershop_id: barbershops.id,
            pending_amount: 0,
            paid_amount: 0,
            total_earned: 0
          }, {
            onConflict: 'barber_id,barbershop_id'
          });
        
        if (!balanceError) {
          
        }
      }

    } else {
      
    }
    
    // Step 3: Verify the results

    const { data: verifyStaff, error: verifyError } = await supabase
      .from('barbershop_staff')
      .select('user_id, role, is_active, metadata')
      .eq('barbershop_id', barbershops.id)
      .eq('role', 'BARBER')
      .eq('is_active', true);
    
    if (verifyError) {
      
    } else {
      
      verifyStaff.forEach(staff => {
        const fullName = staff.metadata?.full_name || 'Unknown';
        }...)`);
      });
    }
    
    // Step 4: Test the auto-selection readiness

    const { data: activeBarbers } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'BARBER')
      .eq('barbershop_id', barbershops.id);

    if (activeBarbers && activeBarbers.length > 0) {

      activeBarbers.forEach(barber => {
        `);
      });
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error);
  }
}

// Run the script
createTestBarberStaff()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });