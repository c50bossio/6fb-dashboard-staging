/**
 * Script to create test BARBER users in production database
 * This enables testing of the intelligent barber auto-selection feature
 * 
 * Run with: node scripts/create-test-barber-users.js
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Production database credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestBarberUsers() {

  try {
    // Step 1: Get an existing barbershop to associate barbers with
    const { data: barbershops, error: shopError } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .limit(1)
      .single();
    
    if (shopError || !barbershops) {
      console.error('❌ No barbershops found in database');
      return;
    }

    // Step 2: Define test barber users
    const testBarbers = [
      {
        email: 'test.barber1@bookedbarber.com',
        full_name: 'John Test Barber',
        role: 'BARBER',
        years_experience: 5,
        specialties: ['Fades', 'Beard Trim'],
        onboarding_data: {
          display_name: 'John',
          test_user: true,
          created_for: 'auto-selection-testing'
        }
      },
      {
        email: 'test.barber2@bookedbarber.com',
        full_name: 'Mike Test Barber',
        role: 'BARBER',
        years_experience: 3,
        specialties: ['Classic Cuts', 'Hot Towel Shave'],
        onboarding_data: {
          display_name: 'Mike',
          test_user: true,
          created_for: 'auto-selection-testing'
        }
      },
      {
        email: 'test.barber3@bookedbarber.com',
        full_name: 'Sarah Test Barber',
        role: 'BARBER',
        years_experience: 7,
        specialties: ['Designs', 'Kids Cuts'],
        onboarding_data: {
          display_name: 'Sarah',
          test_user: true,
          created_for: 'auto-selection-testing'
        }
      }
    ];

    for (const barberData of testBarbers) {

      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', barberData.email)
        .single();
      
      let profileId;
      
      if (existingProfile) {
        
        profileId = existingProfile.id;
        
        // Update the role to BARBER if needed
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'BARBER',
            full_name: barberData.full_name,
            barbershop_id: barbershops.id,
            barbershop_id: barbershops.id,
            onboarding_data: barberData.onboarding_data,
            onboarding_completed: true
          })
          .eq('id', profileId);
        
        if (updateError) {
          
        } else {
          
        }
      } else {
        // Create new profile
        const newProfileId = uuidv4();
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: newProfileId,
            email: barberData.email,
            full_name: barberData.full_name,
            role: 'BARBER',
            barbershop_id: barbershops.id,
            barbershop_id: barbershops.id,
            onboarding_completed: true,
            onboarding_data: barberData.onboarding_data
          })
          .select()
          .single();
        
        if (createError) {
          
          continue;
        }
        
        profileId = newProfile.id;
        
      }
      
      // Step 3: Create or update barbershop_staff record
      const { data: existingStaff } = await supabase
        .from('barbershop_staff')
        .select('id')
        .eq('user_id', profileId)
        .eq('barbershop_id', barbershops.id)
        .single();
      
      if (existingStaff) {
        // Update existing staff record
        const { error: staffUpdateError } = await supabase
          .from('barbershop_staff')
          .update({
            is_active: true,
            role: 'BARBER',
            email: barberData.email,
            full_name: barberData.full_name,
            financial_model: 'commission',
            commission_rate: 0.60,
            years_experience: barberData.years_experience,
            metadata: {
              ...barberData.onboarding_data,
              specialties: barberData.specialties,
              years_experience: barberData.years_experience
            }
          })
          .eq('id', existingStaff.id);
        
        if (staffUpdateError) {
          
        } else {
          
        }
      } else {
        // Create new staff record
        const { error: staffCreateError } = await supabase
          .from('barbershop_staff')
          .insert({
            barbershop_id: barbershops.id,
            user_id: profileId,
            role: 'BARBER',
            is_active: true,
            email: barberData.email,
            full_name: barberData.full_name,
            financial_model: 'commission',
            commission_rate: 0.60,
            years_experience: barberData.years_experience,
            metadata: {
              ...barberData.onboarding_data,
              specialties: barberData.specialties,
              years_experience: barberData.years_experience
            }
          });
        
        if (staffCreateError) {
          
        } else {
          
        }
      }
      
      // Step 4: Initialize commission balance
      const { error: balanceError } = await supabase
        .from('barber_commission_balances')
        .upsert({
          barber_id: profileId,
          barbershop_id: barbershops.id,
          pending_amount: 0,
          paid_amount: 0,
          total_earned: 0
        }, {
          onConflict: 'barber_id,barbershop_id'
        });
      
      if (balanceError) {
        
      } else {
        
      }
    }
    
    // Step 5: Verify the test users were created

    const { data: verifyBarbers, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('role', 'BARBER')
      .eq('barbershop_id', barbershops.id);
    
    if (verifyError) {
      
    } else {
      
      verifyBarbers.forEach(barber => {
        `);
      });
    }
    
    // Step 6: Test the auto-selection logic

    const { data: activeStaff } = await supabase
      .from('barbershop_staff')
      .select('user_id, full_name, role, is_active')
      .eq('barbershop_id', barbershops.id)
      .eq('is_active', true)
      .eq('role', 'BARBER');

    if (activeStaff && activeStaff.length > 0) {

    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    console.error(error);
  }
}

// Run the script
createTestBarberUsers()
  .then(() => {
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });