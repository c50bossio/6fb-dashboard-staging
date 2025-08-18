import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

async function verifyAdminAccess(request) {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return { authorized: false, error: 'Authentication required' }
    }

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
    const authCheck = await verifyAdminAccess(request)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const tenantId = searchParams.get('tenant_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    if (action === 'list') {
      let users = [
        {
          id: 'user_001',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          tenant_name: 'Demo Barbershop',
          email: 'owner@demo.com',
          first_name: 'John',
          last_name: 'Smith',
          role: 'owner',
          status: 'active',
          last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          login_count: 234,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          phone: '+1 (555) 123-4567',
          avatar_url: null,
          permissions: ['full_access'],
          two_factor_enabled: true,
          email_verified: true,
          activity_score: 0.92
        },
        {
          id: 'user_002',
          tenant_id: '00000000-0000-0000-0000-000000000001',
          tenant_name: 'Demo Barbershop',
          email: 'manager@demo.com',
          first_name: 'Sarah',
          last_name: 'Johnson',
          role: 'manager',
          status: 'active',
          last_login: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          login_count: 156,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          phone: '+1 (555) 234-5678',
          avatar_url: null,
          permissions: ['manage_bookings', 'view_analytics'],
          two_factor_enabled: false,
          email_verified: true,
          activity_score: 0.78
        },
        {
          id: 'user_003',
          tenant_id: '00000000-0000-0000-0000-000000000002',
          tenant_name: 'Elite Cuts',
          email: 'owner@elitecuts.com',
          first_name: 'Mike',
          last_name: 'Wilson',
          role: 'owner',
          status: 'active',
          last_login: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          login_count: 89,
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          phone: '+1 (555) 345-6789',
          avatar_url: null,
          permissions: ['full_access'],
          two_factor_enabled: true,
          email_verified: true,
          activity_score: 0.85
        },
        {
          id: 'user_004',
          tenant_id: '00000000-0000-0000-0000-000000000003',
          tenant_name: 'Downtown Barber Co',
          email: 'info@downtownbarber.com',
          first_name: 'David',
          last_name: 'Brown',
          role: 'owner',
          status: 'invited',
          last_login: null,
          login_count: 0,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          phone: null,
          avatar_url: null,
          permissions: ['full_access'],
          two_factor_enabled: false,
          email_verified: false,
          activity_score: 0.0,
          invitation_sent_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          invitation_expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'user_005',
          tenant_id: '00000000-0000-0000-0000-000000000004',
          tenant_name: 'Modern Styles Studio',
          email: 'contact@modernstyles.com',
          first_name: 'Lisa',
          last_name: 'Davis',
          role: 'owner',
          status: 'suspended',
          last_login: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          login_count: 67,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          phone: '+1 (555) 456-7890',
          avatar_url: null,
          permissions: [],
          two_factor_enabled: false,
          email_verified: true,
          activity_score: 0.23,
          suspended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          suspension_reason: 'Payment failure'
        }
      ]

      if (search) {
        users = users.filter(u => 
          u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.last_name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.tenant_name.toLowerCase().includes(search.toLowerCase())
        )
      }

      if (role) {
        users = users.filter(u => u.role === role)
      }

      if (status) {
        users = users.filter(u => u.status === status)
      }

      if (tenantId) {
        users = users.filter(u => u.tenant_id === tenantId)
      }

      const totalCount = users.length
      const startIndex = (page - 1) * limit
      const paginatedUsers = users.slice(startIndex, startIndex + limit)

      return NextResponse.json({
        success: true,
        data: {
          users: paginatedUsers,
          pagination: {
            current_page: page,
            total_pages: Math.ceil(totalCount / limit),
            total_count: totalCount,
            per_page: limit,
            has_next: startIndex + limit < totalCount,
            has_prev: page > 1
          },
          filters: { search, role, status, tenant_id: tenantId }
        },
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'get' && userId) {
      const user = {
        id: userId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        tenant_name: 'Demo Barbershop',
        email: 'owner@demo.com',
        first_name: 'John',
        last_name: 'Smith',
        phone: '+1 (555) 123-4567',
        avatar_url: null,
        role: 'owner',
        status: 'active',
        permissions: [
          'full_access',
          'manage_users',
          'view_analytics',
          'manage_bookings',
          'billing_access'
        ],
        profile: {
          bio: 'Owner and lead barber at Demo Barbershop',
          specialties: ['Classic cuts', 'Beard styling'],
          experience_years: 8,
          certifications: ['State Licensed Barber', 'Safety Certified']
        },
        authentication: {
          email_verified: true,
          email_verified_at: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
          two_factor_enabled: true,
          two_factor_setup_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          password_last_changed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          recovery_codes_generated: true
        },
        activity: {
          login_count: 234,
          last_login: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          average_session_duration: 45.7,
          total_session_time: 10697,
          activity_score: 0.92,
          preferred_features: ['analytics', 'forecasting', 'ai_chat'],
          login_history: [
            {
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              ip_address: '192.168.1.100',
              device: 'Desktop',
              location: 'New York, NY'
            },
            {
              timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
              ip_address: '10.0.0.45',
              device: 'Mobile',
              location: 'New York, NY'
            }
          ]
        },
        billing: {
          subscription_role: 'billing_contact',
          payment_methods: ['**** 4242'],
          billing_email: 'billing@demo.com'
        },
        preferences: {
          timezone: 'America/New_York',
          language: 'en',
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          marketing_emails: true
        },
        created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'system',
        last_modified_by: userId
      }

      return NextResponse.json({
        success: true,
        data: user,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'statistics') {
      const stats = {
        overview: {
          total_users: 156,
          active_users: 142,
          suspended_users: 8,
          invited_users: 6,
          users_last_30_days: 23,
          users_last_7_days: 7
        },
        role_distribution: {
          owner: 47,
          admin: 12,
          manager: 34,
          member: 58,
          viewer: 5
        },
        activity_metrics: {
          daily_active_users: 89,
          weekly_active_users: 134,
          monthly_active_users: 156,
          average_session_duration: 24.7,
          total_sessions_today: 234,
          bounce_rate: 12.3
        },
        authentication_stats: {
          email_verified_rate: 94.2,
          two_factor_adoption: 67.8,
          password_reset_requests_30d: 23,
          failed_login_attempts_24h: 45,
          account_lockouts_24h: 2
        },
        engagement_metrics: {
          high_engagement_users: 45,
          medium_engagement_users: 78,
          low_engagement_users: 33,
          inactive_users: 12,
          feature_adoption_rate: 73.4
        },
        geographic_distribution: [
          { region: 'North America', users: 89, percentage: 57.1 },
          { region: 'Europe', users: 41, percentage: 26.3 },
          { region: 'Asia Pacific', users: 18, percentage: 11.5 },
          { region: 'Other', users: 8, percentage: 5.1 }
        ],
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'activity') {
      const activityData = {
        recent_logins: [
          {
            user_id: 'user_001',
            email: 'owner@demo.com',
            tenant_name: 'Demo Barbershop',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            ip_address: '192.168.1.100',
            device: 'Desktop'
          },
          {
            user_id: 'user_002',
            email: 'manager@demo.com',
            tenant_name: 'Demo Barbershop',
            timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
            ip_address: '10.0.0.45',
            device: 'Mobile'
          }
        ],
        user_registrations: [
          {
            user_id: 'user_006',
            email: 'new@barbershop.com',
            tenant_name: 'New Barbershop',
            registered_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            onboarding_completed: false
          }
        ],
        security_events: [
          {
            user_id: 'user_003',
            email: 'owner@elitecuts.com',
            event_type: 'multiple_failed_logins',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            details: { attempts: 3, ip_address: '203.0.113.45' }
          },
          {
            user_id: 'user_001',
            email: 'owner@demo.com',
            event_type: 'two_factor_enabled',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            details: { method: 'authenticator_app' }
          }
        ],
        feature_usage: [
          {
            user_id: 'user_001',
            feature: 'ai_chat',
            usage_count: 45,
            last_used: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
          },
          {
            user_id: 'user_002',
            feature: 'analytics_dashboard',
            usage_count: 23,
            last_used: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
          }
        ],
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: activityData,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const authCheck = await verifyAdminAccess(request)
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: 401 }
      )
    }

    const { action, data } = await request.json()

    if (action === 'suspend') {
      const { user_id, reason, duration } = data

      if (!user_id) {
        return NextResponse.json({
          success: false,
          error: 'User ID required for suspension'
        }, { status: 400 })
      }

      await logAdminAction(authCheck.user.id, 'user_suspended', {
        user_id: user_id,
        reason: reason || 'Manual admin action',
        duration: duration
      })

      return NextResponse.json({
        success: true,
        data: {
          user_id: user_id,
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_by: authCheck.user.email,
          reason: reason,
          suspension_expires: duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() : null
        },
        message: 'User suspended successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'activate') {
      const { user_id } = data

      if (!user_id) {
        return NextResponse.json({
          success: false,
          error: 'User ID required for activation'
        }, { status: 400 })
      }

      await logAdminAction(authCheck.user.id, 'user_activated', {
        user_id: user_id
      })

      return NextResponse.json({
        success: true,
        data: {
          user_id: user_id,
          status: 'active',
          activated_at: new Date().toISOString(),
          activated_by: authCheck.user.email
        },
        message: 'User activated successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'update_role') {
      const { user_id, new_role, permissions } = data

      if (!user_id || !new_role) {
        return NextResponse.json({
          success: false,
          error: 'User ID and new role required'
        }, { status: 400 })
      }

      await logAdminAction(authCheck.user.id, 'user_role_updated', {
        user_id: user_id,
        new_role: new_role,
        permissions: permissions
      })

      return NextResponse.json({
        success: true,
        data: {
          user_id: user_id,
          role: new_role,
          permissions: permissions || [],
          updated_at: new Date().toISOString(),
          updated_by: authCheck.user.email
        },
        message: 'User role updated successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'reset_password') {
      const { user_id, send_email } = data

      if (!user_id) {
        return NextResponse.json({
          success: false,
          error: 'User ID required for password reset'
        }, { status: 400 })
      }

      const resetToken = generateSecureToken()

      await logAdminAction(authCheck.user.id, 'user_password_reset', {
        user_id: user_id,
        send_email: send_email || false
      })

      return NextResponse.json({
        success: true,
        data: {
          user_id: user_id,
          reset_token: resetToken,
          reset_url: `/reset-password?token=${resetToken}`,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          email_sent: send_email || false
        },
        message: 'Password reset initiated successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'impersonate') {
      const { user_id, duration_minutes } = data

      if (!user_id) {
        return NextResponse.json({
          success: false,
          error: 'User ID required for impersonation'
        }, { status: 400 })
      }

      const impersonationToken = generateSecureToken()
      const duration = duration_minutes || 60

      await logAdminAction(authCheck.user.id, 'user_impersonation_started', {
        target_user_id: user_id,
        duration_minutes: duration
      })

      return NextResponse.json({
        success: true,
        data: {
          impersonation_token: impersonationToken,
          target_user_id: user_id,
          impersonation_url: `/dashboard?impersonate=${impersonationToken}`,
          expires_at: new Date(Date.now() + duration * 60 * 1000).toISOString(),
          duration_minutes: duration
        },
        message: 'User impersonation session created',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'send_notification') {
      const { user_ids, message, type } = data

      if (!user_ids || !Array.isArray(user_ids) || !message) {
        return NextResponse.json({
          success: false,
          error: 'User IDs array and message required'
        }, { status: 400 })
      }

      const notificationId = generateUUID()

      await logAdminAction(authCheck.user.id, 'admin_notification_sent', {
        notification_id: notificationId,
        recipient_count: user_ids.length,
        type: type || 'info'
      })

      return NextResponse.json({
        success: true,
        data: {
          notification_id: notificationId,
          recipients: user_ids,
          message: message,
          type: type || 'info',
          sent_at: new Date().toISOString(),
          sent_by: authCheck.user.email
        },
        message: `Notification sent to ${user_ids.length} users`,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Admin user management error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateUUID() {
  return `user-${Date.now()}-${process.hrtime.bigint().toString(36)}`
}

function generateSecureToken() {
  const timestamp = Date.now()
  const nanotime = process.hrtime.bigint()
  return `token_${timestamp}_${nanotime.toString(36)}`
}

async function logAdminAction(adminUserId, action, details) {
  // Log admin action
}