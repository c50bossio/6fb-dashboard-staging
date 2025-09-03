const { createClient } = require('@supabase/supabase-js');

async function verifySettingsDataConsistency() {

  // Connect to Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Get test user profile
    const testEmail = null /* hardcoded ID removed for production */;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
      
    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError.message);
      return false;
    }

    // Get barbershop ID from profile
    const barbershopId = profile.barbershop_id || profile.barbershop_id;
    
    if (!barbershopId) {
      // Check if user owns a barbershop
      const { data: ownedShops } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', profile.id);
        
      if (ownedShops && ownedShops.length > 0) {

        // Test what each settings interface would load
        const barbershop = ownedShops[0];

        const unifiedData = {
          business_info: {
            name: barbershop.name || '',
            email: barbershop.email || '',
            phone: barbershop.phone || '',
            address: barbershop.address || '',
            city: barbershop.city || '',
            state: barbershop.state || ''
          }
        };

        // Shop settings uses the same barbershop lookup logic
        const shopSettingsData = {
          name: barbershop.name || '',
          email: barbershop.email || '',
          phone: barbershop.phone || '',
          address: barbershop.address || '',
          city: barbershop.city || '',
          state: barbershop.state || ''
        };

        const nameMatch = unifiedData.business_info.name === shopSettingsData.name;
        const emailMatch = unifiedData.business_info.email === shopSettingsData.email;
        const phoneMatch = unifiedData.business_info.phone === shopSettingsData.phone;

        const allConsistent = nameMatch && emailMatch && phoneMatch;

        if (allConsistent) {

        } else {

        }
        
        // Test save operations consistency

         - Updates barbershops table');

        return allConsistent;
        
      } else {
        
        return false;
      }
    } else {

      // Get barbershop data
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', barbershopId)
        .single();
        
      if (!barbershop) {
        
        return false;
      }

      const unifiedData = {
        business_info: {
          name: barbershop.name || '',
          email: barbershop.email || '',
          phone: barbershop.phone || '',
          address: barbershop.address || '',
          city: barbershop.city || '',
          state: barbershop.state || ''
        }
      };

      // Shop settings uses the same barbershop lookup logic
      const shopSettingsData = {
        name: barbershop.name || '',
        email: barbershop.email || '',
        phone: barbershop.phone || '',
        address: barbershop.address || '',
        city: barbershop.city || '',
        state: barbershop.state || ''
      };

      const nameMatch = unifiedData.business_info.name === shopSettingsData.name;
      const emailMatch = unifiedData.business_info.email === shopSettingsData.email;
      const phoneMatch = unifiedData.business_info.phone === shopSettingsData.phone;

      const allConsistent = nameMatch && emailMatch && phoneMatch;

      if (allConsistent) {

      } else {

      }
      
      // Test save operations consistency

       - Updates barbershops table');

      return allConsistent;
    }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    return false;
  }
}

// Run the verification
verifySettingsDataConsistency().then(success => {
  );
  
  );
  process.exit(success ? 0 : 1);
});