import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { feature, preferences } = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }


    // Create or update billing preferences
    const billingConfig = {
      user_id: user.id,
      feature_type: feature,
      spending_limit: preferences.spendingLimit === -1 ? null : preferences.spendingLimit,
      auto_charge: preferences.autoTopUp,
      monthly_reports: preferences.monthlyReports,
      low_balance_alert: preferences.lowBalanceAlert || 25,
      enabled_at: new Date().toISOString(),
      
      // Competitive rates
      sms_rate: 0.01,
      email_rate: 0.001, 
      ai_token_rate: 0.04,
      
      // Free tier allowances
      free_sms_monthly: 100,
      free_email_monthly: 500,
      
      status: 'active'
    }

    // Upsert billing configuration
    const { data, error } = await supabase
      .from('billing_configurations')
      .upsert(billingConfig, { 
        onConflict: 'user_id,feature_type',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('❌ Database error:', error.message)
      return NextResponse.json({ error: 'Failed to save billing configuration' }, { status: 500 })
    }

    // Update user profile to indicate billing is enabled
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        billing_enabled: true,
        usage_billing_setup_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.warn('⚠️ Failed to update profile billing status:', profileError.message)
    }


    return NextResponse.json({ 
      success: true,
      message: 'Billing setup completed successfully',
      config: data[0],
      rates: {
        sms: '$0.01/message',
        email: '$0.001/email', 
        aiTokens: '$0.04/1K tokens'
      }
    })

  } catch (error) {
    console.error('❌ Billing setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user's billing configurations
    const { data, error } = await supabase
      .from('billing_configurations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (error) {
      console.error('❌ Error fetching billing config:', error.message)
      return NextResponse.json({ error: 'Failed to fetch billing configuration' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      configurations: data,
      hasAnyBilling: data.length > 0,
      enabledFeatures: data.map(config => config.feature_type)
    })

  } catch (error) {
    console.error('❌ Error fetching billing setup:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}