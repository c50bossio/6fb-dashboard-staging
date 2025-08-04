import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    // For now, return demo tenant data since we're using SQLite
    // In production, this would integrate with Supabase and the Python tenant service
    
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenant_id')
    const slug = searchParams.get('slug')

    if (action === 'list') {
      // Return list of tenants (for platform admin)
      return NextResponse.json({
        success: true,
        data: {
          tenants: [
            {
              id: '00000000-0000-0000-0000-000000000001',
              name: 'Demo Barbershop',
              slug: 'demo-barbershop', 
              email: 'demo@6fb.ai',
              plan_tier: 'professional',
              status: 'active',
              onboarding_completed: true,
              created_at: new Date().toISOString(),
              user_count: 3,
              analytics_enabled: true
            },
            {
              id: '00000000-0000-0000-0000-000000000002',
              name: 'Elite Cuts Barbershop',
              slug: 'elite-cuts',
              email: 'owner@elitecuts.com',
              plan_tier: 'starter',
              status: 'active',
              onboarding_completed: true,
              created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
              user_count: 2,
              analytics_enabled: true
            },
            {
              id: '00000000-0000-0000-0000-000000000003',
              name: 'Downtown Barber Co',
              slug: 'downtown-barber-co',
              email: 'info@downtownbarber.com', 
              plan_tier: 'enterprise',
              status: 'active',
              onboarding_completed: false,
              created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              user_count: 1,
              analytics_enabled: false
            }
          ],
          total_count: 3,
          active_count: 3,
          trial_count: 1
        },
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'get' && (tenantId || slug)) {
      // Return specific tenant details
      const tenant = {
        id: tenantId || '00000000-0000-0000-0000-000000000001',
        name: 'Demo Barbershop',
        slug: slug || 'demo-barbershop',
        domain: null,
        business_type: 'barbershop',
        address: {
          street: '123 Main Street',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US'
        },
        phone: '+1 (555) 123-4567',
        email: 'demo@6fb.ai',
        timezone: 'America/New_York',
        plan_tier: 'professional',
        billing_status: 'active',
        subscription_started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        settings: {
          currency: 'USD',
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '19:00' },
            saturday: { open: '08:00', close: '17:00' },
            sunday: { closed: true }
          }
        },
        features: {
          analytics: true,
          advanced_forecasting: true,
          real_time_alerts: true,
          business_recommendations: true,
          customer_limit: 500,
          data_retention_days: 365,
          api_calls_per_month: 5000
        },
        branding: {
          primary_color: '#3B82F6',
          logo_url: null,
          custom_domain: null
        },
        status: 'active',
        onboarding_completed: true,
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: tenant,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'statistics') {
      // Return platform statistics
      return NextResponse.json({
        success: true,
        data: {
          total_tenants: 12,
          active_tenants: 11,
          suspended_tenants: 1,
          plan_distribution: {
            starter: 5,
            professional: 4,
            enterprise: 3
          },
          trials_expiring_soon: 2,
          monthly_growth_rate: 0.15,
          churn_rate: 0.03,
          generated_at: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Tenant API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const { action, data } = await request.json()

    if (action === 'create') {
      // Create new tenant
      const tenantData = data

      // Validate required fields
      const requiredFields = ['name', 'email']
      for (const field of requiredFields) {
        if (!tenantData[field]) {
          return NextResponse.json({
            success: false,
            error: `Missing required field: ${field}`
          }, { status: 400 })
        }
      }

      // Generate tenant ID and slug
      const tenantId = generateUUID()
      const slug = generateSlug(tenantData.name)

      // For demo, return success with generated data
      const newTenant = {
        id: tenantId,
        name: tenantData.name,
        slug: slug,
        email: tenantData.email,
        phone: tenantData.phone || null,
        business_type: tenantData.business_type || 'barbershop',
        address: tenantData.address || {},
        timezone: tenantData.timezone || 'America/New_York',
        plan_tier: tenantData.plan_tier || 'starter',
        billing_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        settings: tenantData.settings || {},
        features: getPlanFeatures(tenantData.plan_tier || 'starter'),
        branding: tenantData.branding || {},
        status: 'active',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        onboarding_url: `/onboarding?tenant=${slug}`,
        dashboard_url: `/dashboard?tenant=${slug}`
      }

      return NextResponse.json({
        success: true,
        data: newTenant,
        message: 'Tenant created successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'update') {
      // Update existing tenant
      const { tenant_id, updates } = data

      if (!tenant_id) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID required for update'
        }, { status: 400 })
      }

      // For demo, return success
      return NextResponse.json({
        success: true,
        data: {
          tenant_id: tenant_id,
          updated_fields: Object.keys(updates),
          updated_at: new Date().toISOString()
        },
        message: 'Tenant updated successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'delete') {
      // Soft delete tenant
      const { tenant_id } = data

      if (!tenant_id) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID required for deletion'
        }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: {
          tenant_id: tenant_id,
          status: 'pending_deletion',
          marked_for_deletion_at: new Date().toISOString()
        },
        message: 'Tenant marked for deletion',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'invite_user') {
      // Invite user to tenant
      const { tenant_id, email, role, message } = data

      if (!tenant_id || !email || !role) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID, email, and role are required'
        }, { status: 400 })
      }

      const invitationToken = generateInvitationToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      return NextResponse.json({
        success: true,
        data: {
          invitation_id: generateUUID(),
          tenant_id: tenant_id,
          email: email,
          role: role,
          invitation_token: invitationToken,
          invitation_url: `/accept-invitation?token=${invitationToken}`,
          expires_at: expiresAt.toISOString(),
          message: message || null
        },
        message: 'User invitation created successfully',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Utility functions
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-') // Remove leading/trailing hyphens
}

function generateInvitationToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function getPlanFeatures(planTier) {
  const planConfigs = {
    starter: {
      analytics: true,
      basic_forecasting: true,
      email_alerts: true,
      customer_limit: 100,
      data_retention_days: 90,
      api_calls_per_month: 1000
    },
    professional: {
      analytics: true,
      advanced_forecasting: true,
      real_time_alerts: true,
      business_recommendations: true,
      customer_limit: 500,
      data_retention_days: 365,
      api_calls_per_month: 5000
    },
    enterprise: {
      analytics: true,
      advanced_forecasting: true,
      predictive_intelligence: true,
      real_time_alerts: true,
      business_recommendations: true,
      custom_ai_models: true,
      customer_limit: -1,
      data_retention_days: -1,
      api_calls_per_month: -1
    }
  }

  return planConfigs[planTier] || planConfigs.starter
}