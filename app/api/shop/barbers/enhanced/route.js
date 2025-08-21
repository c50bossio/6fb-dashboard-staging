import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// GET - Fetch all barbers with complete data
export async function GET(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'list' // 'list', 'performance', 'onboarding'
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's barbershop
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ 
        error: 'No barbershop found',
        setup_required: true 
      }, { status: 404 })
    }
    
    let query = supabase
      .from('barbershop_staff')
      .select(`
        *,
        user:users!barbershop_staff_user_id_fkey (
          id,
          email,
          full_name,
          avatar_url,
          phone,
          created_at
        ),
        financial_arrangement:financial_arrangements (
          type,
          commission_percentage,
          booth_rent_amount,
          booth_rent_frequency,
          product_commission_percentage
        ),
        customization:barber_customizations (
          bio,
          years_experience,
          specialties,
          profile_image_url,
          portfolio_images,
          booking_enabled,
          custom_url
        ),
        availability:barber_availability (
          day_of_week,
          start_time,
          end_time,
          is_available
        )
      `)
      .eq('barbershop_id', shop.id)
      .eq('role', 'BARBER')
    
    // Add view-specific data
    if (view === 'performance') {
      query = query.select(`
        *,
        performance:barber_performance (
          period_type,
          period_start,
          total_appointments,
          total_revenue,
          average_rating,
          client_retention_rate
        )
      `)
    } else if (view === 'onboarding') {
      query = query.select(`
        *,
        onboarding:barber_onboarding (
          onboarding_progress,
          fully_onboarded,
          license_uploaded,
          contract_signed,
          chair_assigned,
          payment_setup
        )
      `)
    }
    
    const { data: barbers, error } = await query
    
    if (error) {
      console.error('Error fetching barbers:', error)
      return NextResponse.json({ error: 'Failed to fetch barbers' }, { status: 500 })
    }
    
    // Calculate additional metrics
    const enhancedBarbers = await Promise.all(barbers.map(async (barber) => {
      // Get current month performance
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      const { data: monthlyMetrics } = await supabase
        .from('barber_performance')
        .select('total_revenue, total_appointments, average_rating')
        .eq('barber_id', barber.user_id)
        .eq('barbershop_id', shop.id)
        .eq('period_type', 'monthly')
        .gte('period_start', startOfMonth.toISOString())
        .single()
      
      // Get upcoming appointments count
      const { count: upcomingCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('barber_id', barber.user_id)
        .eq('barbershop_id', shop.id)
        .gte('appointment_date', now.toISOString())
        .eq('status', 'confirmed')
      
      // Get today's schedule
      const { data: todayShift } = await supabase
        .from('barber_shifts')
        .select('*')
        .eq('barber_id', barber.user_id)
        .eq('shift_date', now.toISOString().split('T')[0])
        .single()
      
      return {
        ...barber,
        metrics: {
          monthly_revenue: monthlyMetrics?.total_revenue || 0,
          monthly_appointments: monthlyMetrics?.total_appointments || 0,
          average_rating: monthlyMetrics?.average_rating || 0,
          upcoming_appointments: upcomingCount || 0,
          today_status: todayShift?.status || 'off'
        }
      }
    }))
    
    return NextResponse.json({ 
      barbers: enhancedBarbers,
      shop,
      total: enhancedBarbers.length
    })
    
  } catch (error) {
    console.error('Error in barbers API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add new barber with complete onboarding setup
export async function POST(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const data = await request.json()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get shop
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }
    
    // Start transaction-like operations
    const results = {}
    
    // 1. Create user account
    const tempPassword = `Temp${Math.random().toString(36).substring(2, 10)}!`
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: tempPassword,
      options: {
        data: {
          full_name: data.fullName,
          role: 'BARBER',
          phone: data.phone
        }
      }
    })
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Failed to create account',
        details: authError.message 
      }, { status: 400 })
    }
    
    const barberId = authData.user?.id
    
    // 2. Add to barbershop_staff with financial details
    const { error: staffError } = await supabase
      .from('barbershop_staff')
      .insert({
        barbershop_id: shop.id,
        user_id: barberId,
        role: 'BARBER',
        is_active: true,
        hire_date: new Date().toISOString().split('T')[0],
        commission_rate: data.commissionRate,
        booth_rent_amount: data.boothRentAmount,
        financial_model: data.financialModel,
        can_manage_schedule: data.canManageOwnSchedule,
        can_view_reports: data.canViewOwnReports,
        can_manage_clients: data.canManageOwnClients,
        can_sell_products: data.canSellProducts,
        emergency_contact_name: data.emergencyContactName,
        emergency_contact_phone: data.emergencyContactPhone,
        permissions: {
          schedule: data.canManageOwnSchedule,
          reports: data.canViewOwnReports,
          clients: data.canManageOwnClients,
          products: data.canSellProducts
        }
      })
    
    if (staffError) {
      console.error('Staff error:', staffError)
      // Attempt to clean up created user
      await supabase.auth.admin.deleteUser(barberId)
      return NextResponse.json({ 
        error: 'Failed to add barber to staff',
        details: staffError.message 
      }, { status: 500 })
    }
    
    // 3. Create financial arrangement
    const { error: financialError } = await supabase
      .from('financial_arrangements')
      .insert({
        barbershop_id: shop.id,
        barber_id: barberId,
        type: data.financialModel,
        commission_percentage: data.financialModel === 'commission' ? data.commissionRate : null,
        booth_rent_amount: data.financialModel === 'booth_rent' ? data.boothRentAmount : null,
        booth_rent_frequency: data.financialModel === 'booth_rent' ? 'weekly' : null,
        product_commission_percentage: data.productCommission,
        payment_method: data.paymentMethod || 'bank_transfer',
        payment_frequency: data.paymentFrequency || 'weekly',
        is_active: true,
        start_date: new Date().toISOString().split('T')[0]
      })
    
    if (financialError) {
      console.error('Financial error:', financialError)
    }
    
    // 4. Create barber customization
    const { error: customError } = await supabase
      .from('barber_customizations')
      .insert({
        user_id: barberId,
        barbershop_id: shop.id,
        display_name: data.fullName,
        bio: data.bio,
        years_experience: data.yearsExperience,
        specialties: data.specialties ? data.specialties.split(',').map(s => s.trim()) : [],
        profile_image_url: data.profilePhotoUrl,
        custom_url: data.customPageSlug || data.fullName.toLowerCase().replace(/\s+/g, '-'),
        contact_phone: data.phone,
        contact_email: data.email,
        booking_enabled: true,
        online_booking: true,
        walk_ins_accepted: data.acceptsWalkIns || false,
        is_active: true
      })
    
    if (customError) {
      console.error('Customization error:', customError)
    }
    
    // 5. Set up availability
    if (data.defaultSchedule) {
      const availabilityPromises = Object.entries(data.defaultSchedule)
        .filter(([_, schedule]) => schedule.enabled)
        .map(([day, schedule]) => {
          return supabase
            .from('barber_availability')
            .insert({
              user_id: barberId,
              barbershop_id: shop.id,
              day_of_week: day,
              start_time: schedule.start,
              end_time: schedule.end,
              is_available: true
            })
        })
      
      await Promise.all(availabilityPromises)
    }
    
    // 6. Create onboarding record
    const { error: onboardingError } = await supabase
      .from('barber_onboarding')
      .insert({
        barber_id: barberId,
        barbershop_id: shop.id,
        profile_completed: true,
        profile_completed_at: new Date().toISOString(),
        chair_assigned: data.chairNumber ? true : false,
        chair_number: data.chairNumber,
        onboarding_progress: 20, // Initial progress
        notes: data.notes
      })
    
    if (onboardingError) {
      console.error('Onboarding error:', onboardingError)
    }
    
    // 7. Set up notification preferences
    const { error: notifError } = await supabase
      .from('barber_notification_preferences')
      .insert({
        barber_id: barberId,
        new_booking_email: true,
        new_booking_sms: true,
        new_booking_push: true,
        cancellation_email: true,
        daily_summary_email: true,
        weekly_report_email: true
      })
    
    if (notifError) {
      console.error('Notification error:', notifError)
    }
    
    // 8. Send welcome email (would integrate with email service)
    // await sendWelcomeEmail({
    //   email: data.email,
    //   name: data.fullName,
    //   shopName: shop.name,
    //   tempPassword
    // })
    
    return NextResponse.json({ 
      success: true,
      barberId,
      message: `Barber ${data.fullName} added successfully!`,
      onboardingUrl: `/shop/barbers/${barberId}/onboarding`
    })
    
  } catch (error) {
    console.error('Error creating barber:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update barber details
export async function PATCH(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const data = await request.json()
    const { barberId, updates } = data
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Update different aspects based on what's provided
    const updatePromises = []
    
    // Update staff details
    if (updates.staff) {
      updatePromises.push(
        supabase
          .from('barbershop_staff')
          .update(updates.staff)
          .eq('user_id', barberId)
          .eq('barbershop_id', shop.id)
      )
    }
    
    // Update financial arrangement
    if (updates.financial) {
      updatePromises.push(
        supabase
          .from('financial_arrangements')
          .update(updates.financial)
          .eq('barber_id', barberId)
          .eq('barbershop_id', shop.id)
          .eq('is_active', true)
      )
    }
    
    // Update customization
    if (updates.customization) {
      updatePromises.push(
        supabase
          .from('barber_customizations')
          .update(updates.customization)
          .eq('user_id', barberId)
          .eq('barbershop_id', shop.id)
      )
    }
    
    // Update availability
    if (updates.availability) {
      // Delete existing and insert new
      await supabase
        .from('barber_availability')
        .delete()
        .eq('user_id', barberId)
        .eq('barbershop_id', shop.id)
      
      const availabilityInserts = updates.availability.map(schedule => ({
        user_id: barberId,
        barbershop_id: shop.id,
        ...schedule
      }))
      
      updatePromises.push(
        supabase
          .from('barber_availability')
          .insert(availabilityInserts)
      )
    }
    
    await Promise.all(updatePromises)
    
    return NextResponse.json({ 
      success: true,
      message: 'Barber updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating barber:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Deactivate barber
export async function DELETE(request) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const barberId = searchParams.get('barberId')
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Verify ownership
    const { data: shop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!shop) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // Soft delete - just deactivate
    const { error } = await supabase
      .from('barbershop_staff')
      .update({ 
        is_active: false,
        termination_date: new Date().toISOString().split('T')[0]
      })
      .eq('user_id', barberId)
      .eq('barbershop_id', shop.id)
    
    if (error) {
      return NextResponse.json({ error: 'Failed to deactivate barber' }, { status: 500 })
    }
    
    // Also deactivate financial arrangements
    await supabase
      .from('financial_arrangements')
      .update({ 
        is_active: false,
        end_date: new Date().toISOString().split('T')[0]
      })
      .eq('barber_id', barberId)
      .eq('barbershop_id', shop.id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Barber deactivated successfully'
    })
    
  } catch (error) {
    console.error('Error deactivating barber:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}