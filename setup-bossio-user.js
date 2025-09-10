import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupBossioUser() {

  try {
    // First, create or get the auth user
    let userId;
    
    // Try to create the auth user first
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: null /* hardcoded ID removed for production */,
      email_confirm: true,
      user_metadata: {
        full_name: 'Blake Bossio',
        role: 'SHOP_OWNER'
      }
    });
    
    if (authError && authError.message.includes('already been registered')) {
      // User already exists in auth, get their ID
      const { data: users } = await supabase.auth.admin.listUsers();
      const existingUser = users.users.find(u => u.email === null /* hardcoded ID removed for production */);
      if (existingUser) {
        userId = existingUser.id;
        
      }
    } else if (authUser) {
      userId = authUser.user.id;
      
    }
    
    if (!userId) {
      console.error('Could not create or find auth user');
      return;
    }
    
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (existingProfile) {

      // Update the profile to ensure proper permissions
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'SHOP_OWNER',
          subscription_tier: 'PROFESSIONAL',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
      } else {
        
      }
    } else {
      // Create a new profile

      // First, create a barbershop for this user
      const { data: barbershop, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: "Bossio's Barbershop",
          owner_id: userId,
          address: '123 Main St, San Francisco, CA 94105',
          phone: '555-BOSS-01',
          email: null /* hardcoded ID removed for production */,
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '10:00', close: '17:00' },
            sunday: { closed: true }
          }
        })
        .select()
        .single();
      
      if (shopError) {
        console.error('Error creating barbershop:', shopError);
        return;
      }

      // Create the profile
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: null /* hardcoded ID removed for production */,
          full_name: 'Blake Bossio',
          first_name: 'Blake',
          last_name: 'Bossio',
          role: 'SHOP_OWNER',
          barbershop_id: barbershop.id,
          barbershop_id: barbershop.id,
          subscription_tier: 'PROFESSIONAL',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (profileError) {
        console.error('Error creating profile:', profileError);
      } else {

        // Add to barbershop_staff
        await supabase
          .from('barbershop_staff')
          .insert({
            barbershop_id: barbershop.id,
            user_id: userId,
            role: 'SHOP_OWNER',
            is_active: true
          });

      }
    }

  } catch (error) {
    console.error('Error setting up user:', error);
  }
  
  process.exit(0);
}

setupBossioUser();
