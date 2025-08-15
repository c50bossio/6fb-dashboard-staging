import { createClient } from '@/lib/supabase/server-client'
import { NextResponse } from 'next/server'
export const runtime = 'edge'

export async function POST(request) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { onboardingData } = body
    
    const results = {
      profile: null,
      barbershop: null,
      services: null,
      errors: []
    }
    
    // 1. Update profile with onboarding completion
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .update({
        shop_name: onboardingData.businessName,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        user_goals: onboardingData.goals || [],
        business_size: onboardingData.businessSize || null,
        role: mapRole(onboardingData.role),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single()
    
    if (profileError) {
      results.errors.push({ type: 'profile', error: profileError.message })
    } else {
      results.profile = profileData
    }
    
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
          name: onboardingData.businessName,
          address: onboardingData.businessAddress,
          phone: onboardingData.businessPhone,
          business_type: onboardingData.businessType,
          business_hours_template: onboardingData.businessHours,
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
      const shopSlug = generateSlug(onboardingData.businessName)
      
      const { data: shopData, error: shopError } = await supabase
        .from('barbershops')
        .insert({
          name: onboardingData.businessName,
          address: onboardingData.businessAddress,
          phone: onboardingData.businessPhone,
          owner_id: user.id,
          business_type: onboardingData.businessType,
          business_hours_template: onboardingData.businessHours,
          shop_slug: shopSlug,
          custom_domain: onboardingData.customDomain || null,
          website_enabled: true,
          booking_enabled: true,
          online_booking_enabled: true,
          brand_colors: {
            primary: onboardingData.primaryColor || '#3B82F6',
            secondary: onboardingData.secondaryColor || '#1F2937'
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
    if (barbershopId && onboardingData.services && onboardingData.services.length > 0) {
      await supabase
        .from('services')
        .delete()
        .eq('shop_id', barbershopId)
      
      const servicesData = onboardingData.services.map(service => ({
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
    
    // 4. Save final onboarding data
    await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        step_name: 'completed',
        step_data: onboardingData,
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
    'shop_owner': 'SHOP_OWNER',
    'enterprise': 'ENTERPRISE_OWNER'
  }
  return roleMap[role] || 'user'
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}