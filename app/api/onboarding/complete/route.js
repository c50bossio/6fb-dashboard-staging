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
    const { completedSteps, skippedSteps, data: onboardingData } = body
    
    // If old format (just onboardingData), handle it
    const finalData = onboardingData || body.onboardingData || {}
    
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
      role: mapRole(finalData.role),
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
      
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: finalData.businessName,
          address: finalData.businessAddress,
          phone: finalData.businessPhone,
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
          }
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
    if (barbershopId && finalData.services && finalData.services.length > 0) {
      await supabase
        .from('services')
        .delete()
        .eq('shop_id', barbershopId)
      
      const servicesData = finalData.services.map(service => ({
        shop_id: barbershopId,
        name: service.name,
        description: service.description || '',
        price: service.price,
        duration_minutes: service.duration,
        category: 'general',
        is_active: true
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
    if (barbershopId && finalData.staff && finalData.staff.length > 0) {
      // First, delete existing staff for this barbershop (for updates)
      await supabase
        .from('barbers')
        .delete()
        .eq('shop_id', barbershopId)
      
      const staffData = finalData.staff.map(member => ({
        shop_id: barbershopId,
        name: member.name || `${member.firstName} ${member.lastName}`,
        email: member.email,
        phone: member.phone,
        bio: member.bio || '',
        specialties: member.specialty ? [member.specialty] : [],
        experience_years: member.experience || 0,
        is_active: true,
        // Store profile image - we'll handle base64 for now
        // In production, you'd want to upload to Supabase Storage
        avatar_url: member.profileImage || null,
        // Additional fields from the form
        chair_number: member.chairNumber || null,
        instagram_handle: member.instagram || null,
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
    
    // 5. NOW update profile with barbershop_id if we have one
    if (barbershopId) {
      profileUpdateData.barbershop_id = barbershopId
    }
    
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
    
    // 6. Save final onboarding data
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        step_name: 'completed',
        step_data: finalData,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,step_name'
      })
    
    if (results.errors.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Onboarding completed with some errors',
          results 
        },
        { status: 207 } // Multi-status
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully!',
      results,
      barbershopId,
      bookingUrl: `https://bookedbarber.com/${results.barbershop?.shop_slug || 'shop'}`
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