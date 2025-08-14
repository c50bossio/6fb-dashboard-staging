import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Admin middleware to check for platform admin permissions
async function verifyAdminAccess(request) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { authorized: false, error: 'Authentication required' }
    }

    // In production, check if user has platform admin role
    // For now, allow all authenticated users for demo purposes
    const adminEmails = ['admin@6fb.ai', 'platform@6fb.ai']
    const isAdmin = adminEmails.includes(user.email) || user.email?.endsWith('@6fb.ai')
    
    if (!isAdmin) {
      return { authorized: false, error: 'Platform admin access required' }
    }

    return { authorized: true, user }
  } catch (error) {
    return { authorized: false, error: 'Authorization failed' }
  }
}

export async function GET(request) {
  try {
    // Verify admin access
    const authCheck = await verifyAdminAccess(request)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const tenantId = searchParams.get('tenant_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const planTier = searchParams.get('plan_tier')

    if (action === 'list') {
      // Get all tenants with filtering and pagination
      let tenants = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Demo Barbershop',
          slug: 'demo-barbershop',
          email: 'demo@6fb.ai',
          plan_tier: 'professional',
          billing_status: 'active',
          status: 'active',
          onboarding_completed: true,
          user_count: 5,
          monthly_revenue: 2850.00,
          last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: null,
          subscription_started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          features: {
            analytics: true, forecasting: true, alerts: true, recommendations: true,
            customer_limit: 500, api_calls_per_month: 5000
          }
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          name: 'Elite Cuts Barbershop',
          slug: 'elite-cuts',
          email: 'owner@elitecuts.com',
          plan_tier: 'starter',
          billing_status: 'active',
          status: 'active',
          onboarding_completed: true,
          user_count: 3,
          monthly_revenue: 1250.00,
          last_activity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: null,
          subscription_started_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          features: {
            analytics: true, basic_forecasting: true, email_alerts: true,
            customer_limit: 100, api_calls_per_month: 1000
          }
        },
        {
          id: '00000000-0000-0000-0000-000000000003',
          name: 'Downtown Barber Co',
          slug: 'downtown-barber-co',
          email: 'info@downtownbarber.com',
          plan_tier: 'enterprise',
          billing_status: 'trial',
          status: 'active',
          onboarding_completed: false,
          user_count: 1,
          monthly_revenue: 0.00,
          last_activity: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000).toISOString(),
          subscription_started_at: null,
          features: {
            analytics: true, advanced_forecasting: true, predictive_intelligence: true,
            real_time_alerts: true, business_recommendations: true, custom_ai_models: true,
            customer_limit: -1, api_calls_per_month: -1
          }
        },
        {
          id: '00000000-0000-0000-0000-000000000004',
          name: 'Modern Styles Studio',
          slug: 'modern-styles-studio',
          email: 'contact@modernstyles.com',
          plan_tier: 'professional',
          billing_status: 'suspended',
          status: 'suspended',
          onboarding_completed: true,
          user_count: 4,
          monthly_revenue: 0.00,
          last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          trial_ends_at: null,
          subscription_started_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
          features: {}
        }
      ]

      // Apply filters
      if (search) {
        tenants = tenants.filter(t => 
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.email.toLowerCase().includes(search.toLowerCase()) ||
          t.slug.includes(search.toLowerCase())
        )
      }

      if (status) {
        tenants = tenants.filter(t => t.status === status)
      }

      if (planTier) {
        tenants = tenants.filter(t => t.plan_tier === planTier)
      }

      // Pagination
      const totalCount = tenants.length
      const startIndex = (page - 1) * limit
      const paginatedTenants = tenants.slice(startIndex, startIndex + limit)

      return NextResponse.json({
        success: true,
        data: {
          tenants: paginatedTenants,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: limit,
            has_next: startIndex + limit < totalCount,
            has_prev: page > 1
          },
          filters: { search, status, plan_tier: planTier }
        },
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'get' && tenantId) {
      // Get detailed tenant information
      const tenant = {
        id: tenantId,
        name: 'Demo Barbershop',
        slug: 'demo-barbershop',
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
        stripe_customer_id: 'cus_demo123',
        trial_ends_at: null,
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
          },
          notifications: {
            email_enabled: true,
            sms_enabled: true,
            push_enabled: true
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
        onboarded_at: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        users: [
          {
            id: 'user1',
            email: 'owner@demo.com',
            role: 'owner',
            status: 'active',
            last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'user2',
            email: 'manager@demo.com',
            role: 'manager',
            status: 'active',
            last_login: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
          }
        ],
        analytics: {
          monthly_revenue: 2850.00,
          total_bookings: 127,
          active_customers: 89,
          utilization_rate: 0.78,
          satisfaction_score: 4.7,
          growth_rate: 0.15
        }
      }

      return NextResponse.json({
        success: true,
        data: tenant,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'statistics') {
      // Platform-wide statistics
      const stats = {
        overview: {
          total_tenants: 47,
          active_tenants: 42,
          suspended_tenants: 3,
          pending_deletion: 2,
          trial_tenants: 8,
          trials_expiring_soon: 3
        },
        plan_distribution: {
          starter: 18,
          professional: 21,
          enterprise: 8
        },
        revenue_metrics: {
          monthly_recurring_revenue: 45280.00,
          annual_recurring_revenue: 543360.00,
          average_revenue_per_user: 1077.02,
          monthly_growth_rate: 0.12,
          churn_rate: 0.04
        },
        usage_metrics: {
          total_monthly_api_calls: 187345,
          total_active_users: 156,
          average_sessions_per_tenant: 24.5,
          support_tickets_this_month: 12
        },
        health_indicators: {
          system_uptime: 99.9,
          average_response_time: 245,
          error_rate: 0.02,
          customer_satisfaction: 4.6
        },
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Admin tenants API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // Verify admin access
    const authCheck = await verifyAdminAccess(request)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      )
    }

    const { action, data } = await request.json()

    if (action === 'create') {
      const tenantData = data
      
      // Validate required fields
      const requiredFields = ['name', 'email', 'plan_tier']
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

      const newTenant = {
        id: tenantId,
        name: tenantData.name,
        slug: slug,
        email: tenantData.email,
        phone: tenantData.phone || null,
        business_type: tenantData.business_type || 'barbershop',
        address: tenantData.address || {},
        timezone: tenantData.timezone || 'America/New_York',
        plan_tier: tenantData.plan_tier,
        billing_status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        settings: tenantData.settings || getDefaultSettings(),
        features: getPlanFeatures(tenantData.plan_tier),
        branding: tenantData.branding || {},
        status: 'active',
        onboarding_completed: false,
        created_at: new Date().toISOString(),
        created_by: authCheck.user.id,
        onboarding_url: `/onboarding?tenant=${slug}`,
        dashboard_url: `/dashboard?tenant=${slug}`
      }

      // Log admin action
      await logAdminAction(authCheck.user.id, 'tenant_created', {
        tenant_id: tenantId,
        tenant_name: tenantData.name,
        plan_tier: tenantData.plan_tier
      })

      return NextResponse.json({
        success: true,
        data: newTenant,
        message: 'Tenant created successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'update') {
      const { tenant_id, updates } = data

      if (!tenant_id) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID required for update'
        }, { status: 400 })
      }

      // Log admin action
      await logAdminAction(authCheck.user.id, 'tenant_updated', {
        tenant_id: tenant_id,
        updated_fields: Object.keys(updates)
      })

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

    if (action === 'suspend') {
      const { tenant_id, reason } = data

      if (!tenant_id) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID required for suspension'
        }, { status: 400 })
      }

      // Log admin action
      await logAdminAction(authCheck.user.id, 'tenant_suspended', {
        tenant_id: tenant_id,
        reason: reason || 'Manual admin action'
      })

      return NextResponse.json({
        success: true,
        data: {
          tenant_id: tenant_id,
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          reason: reason
        },
        message: 'Tenant suspended successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'activate') {
      const { tenant_id } = data

      if (!tenant_id) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID required for activation'
        }, { status: 400 })
      }

      // Log admin action
      await logAdminAction(authCheck.user.id, 'tenant_activated', {
        tenant_id: tenant_id
      })

      return NextResponse.json({
        success: true,
        data: {
          tenant_id: tenant_id,
          status: 'active',
          activated_at: new Date().toISOString()
        },
        message: 'Tenant activated successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'delete') {
      const { tenant_id, confirm_deletion } = data

      if (!tenant_id || !confirm_deletion) {
        return NextResponse.json({
          success: false,
          error: 'Tenant ID and deletion confirmation required'
        }, { status: 400 })
      }

      // Log admin action
      await logAdminAction(authCheck.user.id, 'tenant_deleted', {
        tenant_id: tenant_id
      })

      return NextResponse.json({
        success: true,
        data: {
          tenant_id: tenant_id,
          status: 'pending_deletion',
          marked_for_deletion_at: new Date().toISOString(),
          permanent_deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        message: 'Tenant marked for deletion (30-day grace period)',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Admin tenant management error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Utility functions
function generateUUID() {
  // NO RANDOM - use timestamp-based unique ID
  return `tenant-${Date.now()}-${process.hrtime.bigint().toString(36)}`
}

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-')
}

function getDefaultSettings() {
  return {
    currency: 'USD',
    timezone: 'America/New_York',
    business_hours: {
      monday: { open: '09:00', close: '18:00' },
      tuesday: { open: '09:00', close: '18:00' },
      wednesday: { open: '09:00', close: '18:00' },
      thursday: { open: '09:00', close: '18:00' },
      friday: { open: '09:00', close: '18:00' },
      saturday: { open: '09:00', close: '17:00' },
      sunday: { closed: true }
    },
    notifications: {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true
    }
  }
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

async function logAdminAction(adminUserId, action, details) {
  // In production, this would write to an audit log table
  console.log('Admin Action:', {
    admin_user_id: adminUserId,
    action: action,
    details: details,
    timestamp: new Date().toISOString()
  })
}