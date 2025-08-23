import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { completedSteps, skippedSteps, data: onboardingData, prePopulatedData, importedData } = body
    
    // Handle multiple data formats for backward compatibility
    const finalData = onboardingData || body.onboardingData || body
    
    // Map new onboarding fields to expected format
    if (finalData.barbershopName && !finalData.businessName) {
      finalData.businessName = finalData.barbershopName
    }
    if (finalData.numberOfBarbers && !finalData.businessSize) {
      finalData.businessSize = finalData.numberOfBarbers
    }
    if (finalData.primaryGoal && !finalData.goals) {
      finalData.goals = [finalData.primaryGoal]
    }
    
    // Include pre-populated metadata for analytics
    if (prePopulatedData) {
      finalData.prePopulatedMetadata = {
        provider: prePopulatedData.provider,
        hasName: prePopulatedData.hasName,
        hasPhone: prePopulatedData.hasPhone,
        isOAuthUser: prePopulatedData.isOAuthUser,
        dataSource: 'oauth_extraction'
      }
    }
    
    const results = {
      profile: null,
      barbershop: null,
      services: null,
      errors: []
    }
    
    // Save analytics event for completion
    const { error: analyticsError } = await supabase
      .from('analytics_events')
      .insert({
        user_id: user.id,
        event_name: 'onboarding_completed',
        event_properties: {
          completed_steps: completedSteps || [],
          skipped_steps: skippedSteps || [],
          total_steps: (completedSteps?.length || 0) + (skippedSteps?.length || 0),
          completion_rate: completedSteps?.length ? 
            Math.round((completedSteps.length / (completedSteps.length + (skippedSteps?.length || 0))) * 100) : 100,
          timestamp: new Date().toISOString(),
          business_type: finalData.businessType,
          role: finalData.role
        },
        user_properties: {
          user_id: user.id,
          role: finalData.role
        },
        session_id: request.headers.get('x-session-id') || null
      })
    
    if (analyticsError) {
      console.error('Error saving analytics:', analyticsError)
      // Continue even if analytics fails
    }
    
    // 1. Update profile with onboarding completion (but wait for barbershop_id)
    const profileUpdateData = {
      shop_name: finalData.businessName,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_data: finalData,
      onboarding_progress_percentage: 100,
      user_goals: finalData.goals || [],
      business_size: finalData.businessSize || null,
      role: mapRole(finalData.role || 'SHOP_OWNER'), // Default to shop owner if no role specified
      // Add extracted user metadata for profile enrichment
      full_name: prePopulatedData?.displayName || user.user_metadata?.full_name || null,
      phone: prePopulatedData?.phone || user.user_metadata?.phone || null,
      avatar_url: prePopulatedData?.avatar || user.user_metadata?.avatar_url || null,
      updated_at: new Date().toISOString()
    }
    
    // We'll update profile after creating barbershop to include barbershop_id
    
    // 2. Create or update barbershop
    let barbershopId = null
    
    const { data: existingShop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (existingShop) {
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .update({
          name: finalData.businessName,
          address: finalData.businessAddress,
          phone: finalData.businessPhone,
          business_type: finalData.businessType,
          business_hours_template: finalData.schedule || finalData.businessHours,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingShop.id)
        .select()
        .single()
      
      if (shopError) {
        results.errors.push({ type: 'barbershop_update', error: shopError.message })
      } else {
        results.barbershop = shopData
        barbershopId = shopData.id
      }
    } else {
      const shopSlug = generateSlug(finalData.businessName)
      
      // Use pre-populated data for better defaults
      const shopEmail = finalData.businessEmail || 
                       prePopulatedData?.email || 
                       user.email
      const shopPhone = finalData.businessPhone || 
                       prePopulatedData?.phone || 
                       user.user_metadata?.phone || ''
      
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: finalData.businessName,
          email: shopEmail,
          phone: shopPhone,
          address: finalData.businessAddress,
          owner_id: user.id,
          business_type: finalData.businessType,
          business_hours_template: finalData.schedule || finalData.businessHours,
          shop_slug: shopSlug,
          custom_domain: finalData.customDomain || null,
          website_enabled: true,
          booking_enabled: true,
          online_booking_enabled: true,
          brand_colors: {
            primary: finalData.branding?.primaryColor || '#3B82F6',
            secondary: finalData.branding?.secondaryColor || '#1F2937'
          },
          // Add metadata about pre-population for analytics
          onboarding_metadata: finalData.prePopulatedMetadata || null
        })
        .select()
        .single()
      
      if (shopError) {
        results.errors.push({ type: 'barbershop_create', error: shopError.message })
      } else {
        results.barbershop = shopData
        barbershopId = shopData.id
      }
    }
    
    // 3. Add services if barbershop was created/updated successfully
    // Prioritize imported data over onboarding form data
    const servicesToAdd = (importedData?.services && importedData.services.length > 0) 
      ? importedData.services 
      : finalData.services
      
    if (barbershopId && servicesToAdd && servicesToAdd.length > 0) {
      await supabase
        .from('services')
        .delete()
        .eq('shop_id', barbershopId)
      
      const servicesData = servicesToAdd.map(service => ({
        shop_id: barbershopId,
        name: service.name,
        description: service.description || '',
        price: service.price || service.cost,
        duration_minutes: service.duration || service.duration_minutes,
        category: service.category || 'general',
        is_active: service.is_active !== false // Default to true unless explicitly false
      }))
      
      const { data: createdServices, error: servicesError } = await supabase
        .from('services')
        .insert(servicesData)
        .select()
      
      if (servicesError) {
        results.errors.push({ type: 'services', error: servicesError.message })
      } else {
        results.services = createdServices
      }
    }
    
    // 4. Add staff members if present and barbershop was created
    // Prioritize imported data over onboarding form data
    const staffToAdd = (importedData?.staff && importedData.staff.length > 0) 
      ? importedData.staff 
      : finalData.staff
      
    if (barbershopId && staffToAdd && staffToAdd.length > 0) {
      // First, delete existing staff for this barbershop (for updates)
      await supabase
        .from('barbers')
        .delete()
        .eq('shop_id', barbershopId)
      
      const staffData = staffToAdd.map(member => ({
        shop_id: barbershopId,
        name: member.name || `${member.firstName} ${member.lastName}` || member.full_name,
        email: member.email,
        phone: member.phone,
        bio: member.bio || '',
        specialties: member.specialty ? [member.specialty] : (member.specialties || []),
        experience_years: member.experience || member.experience_years || 0,
        is_active: member.is_active !== false, // Default to true unless explicitly false
        // Store profile image - we'll handle base64 for now
        // In production, you'd want to upload to Supabase Storage
        avatar_url: member.profileImage || member.avatar_url || null,
        // Additional fields from the form
        chair_number: member.chairNumber || member.chair_number || null,
        instagram_handle: member.instagram || member.instagram_handle || null,
        languages: member.languages || ['English'],
        availability: member.availability || 'full_time'
      }))
      
      const { data: createdStaff, error: staffError } = await supabase
        .from('barbers')
        .insert(staffData)
        .select()
      
      if (staffError) {
        console.error('Error creating staff:', staffError)
        results.errors.push({ type: 'staff', error: staffError.message })
      } else {
        results.staff = createdStaff
      }
    }
    
    // 5. Add imported customers if present and barbershop was created
    if (barbershopId && importedData?.customers && importedData.customers.length > 0) {
      const customersData = importedData.customers.map(customer => ({
        barbershop_id: barbershopId,
        name: customer.name || customer.full_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        email: customer.email,
        phone: customer.phone,
        notes: customer.notes || '',
        preferences: customer.preferences || {},
        tags: customer.tags || [],
        status: customer.status || 'active',
        created_at: customer.created_at || new Date().toISOString(),
        // Store import metadata
        import_metadata: {
          imported_at: new Date().toISOString(),
          import_source: 'csv_onboarding',
          original_id: customer.id || customer.customer_id
        }
      }))
      
      const { data: createdCustomers, error: customersError } = await supabase
        .from('customers')
        .insert(customersData)
        .select()
      
      if (customersError) {
        console.error('Error creating customers:', customersError)
        results.errors.push({ type: 'customers', error: customersError.message })
      } else {
        results.customers = createdCustomers
      }
    }
    
    // 6. Add imported appointments if present and barbershop was created
    if (barbershopId && importedData?.appointments && importedData.appointments.length > 0) {
      const appointmentsData = importedData.appointments.map(appointment => ({
        barbershop_id: barbershopId,
        customer_id: appointment.customer_id, // Will need to be mapped to new customer IDs
        service_id: appointment.service_id,   // Will need to be mapped to new service IDs
        barber_id: appointment.barber_id,     // Will need to be mapped to new barber IDs
        start_time: appointment.start_time || appointment.date,
        end_time: appointment.end_time,
        duration: appointment.duration || 30,
        price: appointment.price || appointment.cost,
        status: appointment.status || 'completed',
        notes: appointment.notes || '',
        created_at: appointment.created_at || new Date().toISOString(),
        // Store import metadata
        import_metadata: {
          imported_at: new Date().toISOString(),
          import_source: 'csv_onboarding',
          original_id: appointment.id || appointment.appointment_id
        }
      }))
      
      const { data: createdAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .insert(appointmentsData)
        .select()
      
      if (appointmentsError) {
        console.error('Error creating appointments:', appointmentsError)
        results.errors.push({ type: 'appointments', error: appointmentsError.message })
      } else {
        results.appointments = createdAppointments
      }
    }
    
    // 7. NOW update profile with barbershop_id if we have one
    if (barbershopId) {
      // Update both fields to ensure compatibility
      profileUpdateData.barbershop_id = barbershopId
      profileUpdateData.shop_id = barbershopId
    }
    
    // First, check current profile state
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('shop_id, barbershop_id, onboarding_completed')
      .eq('id', user.id)
      .single()
    
    // Log for debugging
    console.log('Profile before update:', {
      current_shop_id: currentProfile?.shop_id,
      current_barbershop_id: currentProfile?.barbershop_id,
      new_barbershop_id: barbershopId,
      updating_to_completed: true
    })
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', user.id)
      .select()
      .single()
    
    if (profileError) {
      results.errors.push({ type: 'profile', error: profileError.message })
    } else {
      results.profile = profileData
    }
    
    // 8. Save final onboarding data with import metadata
    const onboardingDataToSave = {
      ...finalData,
      importedData: importedData || null,
      hasImportedData: !!(importedData?.customers?.length || importedData?.appointments?.length || importedData?.services?.length || importedData?.staff?.length)
    }
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        step_name: 'completed',
        step_data: onboardingDataToSave,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,step_name'
      })
    
    // 9. Verify completion was successful
    const verificationChecks = {
      barbershopCreated: !!barbershopId,
      profileUpdated: !!profileData && profileData.onboarding_completed === true,
      servicesAdded: servicesToAdd ? results.services?.length > 0 : true,
      staffAdded: staffToAdd ? results.staff?.length > 0 : true,
      progressSaved: true // We attempted to save, assume success
    }
    
    const allChecksPass = Object.values(verificationChecks).every(check => check === true)
    
    console.log('Onboarding completion verification:', {
      checks: verificationChecks,
      allPass: allChecksPass,
      errors: results.errors
    })
    
    if (results.errors.length > 0) {
      // Log errors but don't fail if non-critical
      const criticalErrors = results.errors.filter(e => 
        e.type === 'barbershop_create' || e.type === 'profile'
      )
      
      if (criticalErrors.length > 0) {
        return NextResponse.json(
          { 
            success: false,
            message: 'Critical onboarding errors occurred',
            results,
            verification: verificationChecks
          },
          { status: 500 }
        )
      }
      
      // Non-critical errors - continue but notify
      return NextResponse.json(
        { 
          success: true,
          message: 'Onboarding completed with minor issues',
          results,
          verification: verificationChecks,
          warnings: results.errors
        },
        { status: 200 }
      )
    }
    
    // Create a comprehensive success message
    let successMessage = 'Onboarding completed successfully!'
    if (importedData) {
      const importCounts = []
      if (importedData.customers?.length) importCounts.push(`${importedData.customers.length} customers`)
      if (importedData.services?.length) importCounts.push(`${importedData.services.length} services`)
      if (importedData.staff?.length) importCounts.push(`${importedData.staff.length} staff members`)
      if (importedData.appointments?.length) importCounts.push(`${importedData.appointments.length} appointments`)
      
      if (importCounts.length > 0) {
        successMessage += ` Imported ${importCounts.join(', ')}.`
      }
    }
    
    return NextResponse.json({
      success: true,
      message: successMessage,
      results,
      barbershopId,
      bookingUrl: `https://bookedbarber.com/${results.barbershop?.shop_slug || 'shop'}`,
      importSummary: importedData ? {
        customersImported: importedData.customers?.length || 0,
        servicesImported: importedData.services?.length || 0,
        staffImported: importedData.staff?.length || 0,
        appointmentsImported: importedData.appointments?.length || 0,
        totalRecordsImported: (importedData.customers?.length || 0) + 
                             (importedData.services?.length || 0) + 
                             (importedData.staff?.length || 0) + 
                             (importedData.appointments?.length || 0)
      } : null
    })
    
  } catch (error) {
    console.error('Error completing onboarding:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

function mapRole(role) {
  const roleMap = {
    'individual': 'BARBER',
    'individual_barber': 'BARBER',
    'shop_owner': 'SHOP_OWNER', 
    'enterprise': 'ENTERPRISE_OWNER',
    'enterprise_owner': 'ENTERPRISE_OWNER'
  }
  return roleMap[role] || 'user'
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}