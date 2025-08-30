import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/booking-rules/automation-settings
 * Load automation settings for booking rules
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get automation settings from business_settings (stored in booking_rules JSONB)
    const { data: settings, error: settingsError } = await supabase
      .from('business_settings')
      .select('booking_rules')
      .eq('user_id', user.id)
      .single()
    
    if (settingsError && settingsError.code !== 'PGRST116') { // PGRST116 = no rows
      throw settingsError
    }

    // Return settings or default values
    const automationSettings = settings?.booking_rules?.automation || {
      automaticFeeCollection: {
        enabled: false,
        retryAttempts: 3,
        retryDelay: 24,
        fallbackToManual: true,
        notifyOnFailure: true,
        requireConfirmation: false
      },
      smartReminderEscalation: {
        enabled: false,
        riskThreshold: 0.7,
        escalationSteps: [
          { hours: 48, method: 'email' },
          { hours: 24, method: 'sms' },
          { hours: 2, method: 'phone' }
        ],
        personalizedMessages: true,
        trackResponse: true
      },
      predictiveDetection: {
        enabled: false,
        confidenceThreshold: 0.8,
        dataPoints: ['weather', 'traffic', 'client_history', 'time_of_day', 'service_type'],
        actionThreshold: 0.85,
        preventiveActions: ['extra_reminder', 'deposit_request', 'waitlist_alert'],
        learningMode: true
      },
      automatedDepositRequirements: {
        enabled: false,
        triggerConditions: {
          noShowStrikes: 1,
          riskScore: 0.6,
          highValueServices: true,
          newClient: false
        },
        depositAmount: 20,
        exemptions: ['loyalty_clients', 'corporate_accounts'],
        gracePeriod: 7
      },
      recoveryFlowAutomation: {
        enabled: false,
        autoStart: true,
        sequenceDelay: 2,
        communicationChannels: ['email', 'sms'],
        managerEscalation: {
          enabled: true,
          threshold: 3
        },
        successTracking: true
      },
      managerNotifications: {
        enabled: false,
        triggers: {
          highRiskBooking: true,
          repeatedNoShows: true,
          paymentFailures: true,
          recoveryDenials: true
        },
        channels: ['email', 'dashboard'],
        frequency: 'immediate',
        customThresholds: {
          riskScore: 0.9,
          strikeCount: 2,
          paymentFailures: 2
        }
      },
      dynamicPricing: {
        enabled: false,
        adjustmentType: 'fee_increase',
        maxAdjustment: 25,
        triggers: {
          noShowStrikes: 2,
          riskScore: 0.8
        },
        duration: 90,
        reviewPeriod: 30
      }
    }

    return NextResponse.json(automationSettings)
    
  } catch (error) {
    console.error('Error loading automation settings:', error)
    return NextResponse.json(
      { error: 'Failed to load automation settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/booking-rules/automation-settings
 * Save automation settings for booking rules
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const automationSettings = await request.json()
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Check authorization
    const authorizedRoles = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN']
    if (!authorizedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if settings exist
    const { data: existing, error: checkError } = await supabase
      .from('business_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (existing) {
      // Update existing settings - merge with existing booking_rules
      const { data: currentSettings } = await supabase
        .from('business_settings')
        .select('booking_rules')
        .eq('user_id', user.id)
        .single()
      
      const updatedBookingRules = {
        ...(currentSettings?.booking_rules || {}),
        automation: automationSettings
      }
      
      const { error: updateError } = await supabase
        .from('business_settings')
        .update({
          booking_rules: updatedBookingRules,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
      
      if (updateError) throw updateError
    } else {
      // Create new settings
      const { error: insertError } = await supabase
        .from('business_settings')
        .insert({
          user_id: user.id,
          booking_rules: { automation: automationSettings },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (insertError) throw insertError
    }

    // Log the configuration change
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'update_automation_settings',
        details: {
          barberbarbershop_id: profile.barbershop_id,
          settings_updated: Object.keys(automationSettings).filter(key => 
            automationSettings[key]?.enabled
          )
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      message: 'Automation settings saved successfully' 
    })
    
  } catch (error) {
    console.error('Error saving automation settings:', error)
    return NextResponse.json(
      { error: 'Failed to save automation settings' },
      { status: 500 }
    )
  }
}