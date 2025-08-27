import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDirectStaffCreation() {
  try {
    // Get the test owner
    const { data: owner } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'testowner@6fb-demo.com')
      .single();
    
    if (!owner) {
      console.error('Test owner not found');
      return;
    }
    
    const barbershopId = owner.shop_id || owner.barbershop_id;

    // Create staff data
    const testEmail = 'teststaff' + Date.now() + '@test.com';
    const testPassword = 'TempPass123!';

    // Create auth user using admin API
    const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Test Staff Member',
        phone: '555-TEST',
        role: 'BARBER',
        created_by: owner.id,
        barbershop_id: barbershopId
      }
    });
    
    if (authError) {
      console.error('Failed to create auth user:', authError);
      return;
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        email: testEmail,
        full_name: 'Test Staff Member',
        first_name: 'Test',
        last_name: 'Staff Member',
        phone: '555-TEST',
        role: 'BARBER',
        shop_id: barbershopId,
        barbershop_id: barbershopId
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('Failed to create profile:', profileError);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(newAuthUser.user.id);
      return;
    }

    // Add to barbershop_staff
    const { data: staffRecord, error: staffError } = await supabase
      .from('barbershop_staff')
      .insert({
        barbershop_id: barbershopId,
        user_id: newAuthUser.user.id,
        role: 'BARBER',
        is_active: true
      })
      .select()
      .single();
    
    if (staffError) {
      console.error('Failed to create staff record:', staffError);
    } else {
      
    }
    
    // Verify everything worked
    const { data: verification } = await supabase
      .from('barbershop_staff')
      .select('*, profiles:user_id(*)')
      .eq('user_id', newAuthUser.user.id)
      .single();
    
    if (verification) {

    }
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

testDirectStaffCreation();
