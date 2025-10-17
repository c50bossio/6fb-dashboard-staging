import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { appointment_id, customer_id, barbershop_id, service_price } = body

    if (!appointment_id || !barbershop_id) {
      return NextResponse.json({
        success: false,
        error: 'Appointment ID and Barbershop ID are required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Service configuration error'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = []

    // 1. Update customer loyalty points and visit tracking
    if (customer_id) {
      try {
        const loyaltyPoints = Math.floor((service_price || 0) / 10) // 1 point per $10
        const { data: updatedCustomer, error: customerError } = await supabase
          .from('customers')
          .update({
            loyalty_points: supabase.raw(`COALESCE(loyalty_points, 0) + ${loyaltyPoints}`),
            total_visits: supabase.raw(`COALESCE(total_visits, 0) + 1`),
            last_visit: new Date().toISOString(),
            total_spent: supabase.raw(`COALESCE(total_spent, 0) + ${service_price || 0}`)
          })
          .eq('id', customer_id)
          .select('name, phone, email, loyalty_points, total_visits')
          .single()

        if (customerError) {
          console.error('Failed to update customer loyalty:', customerError)
          results.push({ step: 'loyalty_update', status: 'failed', error: customerError.message })
        } else {
          results.push({ 
            step: 'loyalty_update', 
            status: 'success', 
            points_added: loyaltyPoints,
            total_points: updatedCustomer?.loyalty_points,
            total_visits: updatedCustomer?.total_visits
          })

          // Check for loyalty milestones and trigger rewards
          const totalPoints = updatedCustomer?.loyalty_points || 0
          const totalVisits = updatedCustomer?.total_visits || 0
          
          if (totalVisits === 5 || totalVisits === 10 || totalVisits % 25 === 0) {
            // Milestone reached - could trigger special offers
            await triggerMilestoneReward(supabase, customer_id, barbershop_id, totalVisits, updatedCustomer)
            results.push({ step: 'milestone_reward', status: 'triggered', visits: totalVisits })
          }
        }
      } catch (error) {
        console.error('Customer update failed:', error)
        results.push({ step: 'loyalty_update', status: 'failed', error: error.message })
      }
    }

    // 2. Schedule follow-up review request (delayed by 2 hours)
    if (customer_id) {
      try {
        const reviewRequestTime = new Date()
        reviewRequestTime.setHours(reviewRequestTime.getHours() + 2)

        await supabase
          .from('scheduled_notifications')
          .insert({
            barbershop_id,
            customer_id,
            appointment_id,
            type: 'review_request',
            scheduled_for: reviewRequestTime.toISOString(),
            status: 'pending',
            created_at: new Date().toISOString()
          })

        results.push({ step: 'review_request_scheduled', status: 'success', scheduled_for: reviewRequestTime })
      } catch (error) {
        console.error('Failed to schedule review request:', error)
        results.push({ step: 'review_request_scheduled', status: 'failed', error: error.message })
      }
    }

    // 3. Update daily revenue metrics
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Insert or update daily metrics
      const { error: metricsError } = await supabase
        .from('daily_metrics')
        .upsert({
          barbershop_id,
          date: today,
          completed_appointments: supabase.raw(`COALESCE(completed_appointments, 0) + 1`),
          total_revenue: supabase.raw(`COALESCE(total_revenue, 0) + ${service_price || 0}`),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'barbershop_id,date',
          ignoreDuplicates: false
        })

      if (metricsError) {
        console.error('Failed to update daily metrics:', metricsError)
        results.push({ step: 'daily_metrics', status: 'failed', error: metricsError.message })
      } else {
        results.push({ step: 'daily_metrics', status: 'success', revenue_added: service_price })
      }
    } catch (error) {
      console.error('Daily metrics update failed:', error)
      results.push({ step: 'daily_metrics', status: 'failed', error: error.message })
    }

    // 4. Check for rebooking opportunities
    if (customer_id) {
      try {
        // Get customer's service history to suggest next appointment
        const { data: serviceHistory } = await supabase
          .from('appointments')
          .select('service_id, services(name, typical_frequency_days)')
          .eq('customer_id', customer_id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(3)

        if (serviceHistory && serviceHistory.length > 0) {
          const lastService = serviceHistory[0]
          const frequencyDays = lastService.services?.typical_frequency_days || 28 // Default 4 weeks

          // Schedule rebooking reminder
          const rebookingDate = new Date()
          rebookingDate.setDate(rebookingDate.getDate() + Math.floor(frequencyDays * 0.8)) // 80% of typical frequency

          await supabase
            .from('scheduled_notifications')
            .insert({
              barbershop_id,
              customer_id,
              type: 'rebooking_reminder',
              scheduled_for: rebookingDate.toISOString(),
              status: 'pending',
              metadata: {
                suggested_service: lastService.services?.name,
                typical_frequency: frequencyDays
              },
              created_at: new Date().toISOString()
            })

          results.push({ 
            step: 'rebooking_scheduled', 
            status: 'success', 
            scheduled_for: rebookingDate,
            service: lastService.services?.name 
          })
        }
      } catch (error) {
        console.error('Failed to schedule rebooking reminder:', error)
        results.push({ step: 'rebooking_scheduled', status: 'failed', error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Post-appointment workflows completed'
    })

  } catch (error) {
    console.error('Appointment completion workflow error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function triggerMilestoneReward(supabase, customer_id, barbershop_id, visits, customer) {
  try {
    let rewardMessage = ''
    let rewardType = 'loyalty_milestone'

    if (visits === 5) {
      rewardMessage = `🎉 Congratulations ${customer.name}! You've completed 5 visits. Here's 10% off your next service!`
      rewardType = 'first_milestone'
    } else if (visits === 10) {
      rewardMessage = `🌟 Amazing ${customer.name}! 10 visits completed. Enjoy 15% off your next appointment!`
      rewardType = 'ten_visits'
    } else if (visits % 25 === 0) {
      rewardMessage = `💎 Incredible ${customer.name}! ${visits} visits! You're our VIP - 25% off your next service!`
      rewardType = 'vip_milestone'
    }

    // Create a reward/coupon entry
    await supabase
      .from('customer_rewards')
      .insert({
        customer_id,
        barbershop_id,
        type: rewardType,
        title: `${visits} Visits Milestone`,
        description: rewardMessage,
        discount_percent: visits === 5 ? 10 : visits === 10 ? 15 : 25,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        is_active: true,
        created_at: new Date().toISOString()
      })

    // Send immediate notification about the reward
    if (customer.phone) {
      await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom_message',
          message: rewardMessage,
          phone: customer.phone,
          barbershop_id
        })
      })
    }

  } catch (error) {
    console.error('Failed to trigger milestone reward:', error)
  }
}