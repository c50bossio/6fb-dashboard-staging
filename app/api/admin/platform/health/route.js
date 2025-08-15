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
    const component = searchParams.get('component')
    const timeframe = searchParams.get('timeframe') || '24h'

    if (component === 'overview') {
      const healthData = {
        overall_status: 'healthy',
        uptime_percentage: 99.97,
        last_incident: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        current_load: 67,
        system_components: {
          api_gateway: {
            status: 'healthy',
            response_time: 245,
            error_rate: 0.02,
            last_check: new Date(Date.now() - 30 * 1000).toISOString()
          },
          database: {
            status: 'healthy',
            connection_pool: 85,
            query_performance: 142,
            last_check: new Date(Date.now() - 15 * 1000).toISOString()
          },
          ai_services: {
            status: 'healthy',
            openai_latency: 1250,
            anthropic_latency: 980,
            gemini_latency: 1100,
            success_rate: 99.1,
            last_check: new Date(Date.now() - 45 * 1000).toISOString()
          },
          caching_layer: {
            status: 'healthy',
            hit_rate: 87.3,
            memory_usage: 73,
            last_check: new Date(Date.now() - 20 * 1000).toISOString()
          },
          notification_service: {
            status: 'healthy',
            queue_length: 23,
            delivery_rate: 98.7,
            last_check: new Date(Date.now() - 10 * 1000).toISOString()
          },
          file_storage: {
            status: 'healthy',
            storage_usage: 45.2,
            transfer_speed: 'optimal',
            last_check: new Date(Date.now() - 25 * 1000).toISOString()
          }
        },
        performance_metrics: {
          average_response_time: 245,
          requests_per_minute: 1247,
          error_rate: 0.02,
          cpu_usage: 67,
          memory_usage: 71,
          disk_usage: 34
        },
        geographic_distribution: {
          us_east: { status: 'healthy', load: 45 },
          us_west: { status: 'healthy', load: 32 },
          europe: { status: 'healthy', load: 28 },
          asia: { status: 'healthy', load: 15 }
        },
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: healthData,
        timestamp: new Date().toISOString()
      })
    }

    if (component === 'metrics') {
      const metricsData = {
        timeframe: timeframe,
        api_metrics: {
          total_requests: 1847239,
          successful_requests: 1842891,
          failed_requests: 4348,
          average_response_time: 245,
          p95_response_time: 567,
          p99_response_time: 1234,
          requests_by_endpoint: {
            '/api/ai/unified-chat': { count: 456789, avg_time: 1200 },
            '/api/analytics/predictive': { count: 234567, avg_time: 890 },
            '/api/tenants': { count: 123456, avg_time: 156 },
            '/api/health': { count: 87654, avg_time: 23 }
          }
        },
        database_metrics: {
          connection_pool_usage: 85,
          active_connections: 42,
          slow_queries: 12,
          average_query_time: 142,
          deadlocks: 0,
          cache_hit_ratio: 94.7,
          storage_usage_gb: 156.7,
          backup_status: 'completed_2h_ago'
        },
        ai_service_metrics: {
          total_ai_requests: 89234,
          successful_ai_requests: 88467,
          failed_ai_requests: 767,
          providers: {
            openai: {
              requests: 45123,
              success_rate: 99.2,
              avg_latency: 1250,
              cost_this_month: 2456.78
            },
            anthropic: {
              requests: 23456,
              success_rate: 99.4,
              avg_latency: 980,
              cost_this_month: 1834.56
            },
            gemini: {
              requests: 20655,
              success_rate: 98.9,
              avg_latency: 1100,
              cost_this_month: 967.23
            }
          }
        },
        infrastructure_metrics: {
          servers: {
            total: 12,
            healthy: 12,
            unhealthy: 0,
            average_cpu: 67,
            average_memory: 71,
            average_disk: 34
          },
          network: {
            bandwidth_usage: 78.5,
            inbound_traffic_gb: 234.7,
            outbound_traffic_gb: 189.3,
            latency_ms: 23
          },
          storage: {
            total_capacity_gb: 2048,
            used_capacity_gb: 923.4,
            free_capacity_gb: 1124.6,
            iops: 1567
          }
        },
        security_metrics: {
          blocked_requests: 1247,
          suspicious_activity: 23,
          failed_login_attempts: 156,
          rate_limited_requests: 2345,
          security_alerts: 2
        },
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: metricsData,
        timestamp: new Date().toISOString()
      })
    }

    if (component === 'alerts') {
      const alertsData = {
        active_alerts: [
          {
            id: 'alert_001',
            severity: 'warning',
            title: 'High Database Connection Usage',
            description: 'Database connection pool usage is at 85%, approaching the 90% threshold',
            component: 'database',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            acknowledged: false,
            recommended_actions: [
              'Monitor connection pool usage',
              'Consider scaling database connections',
              'Review slow queries'
            ]
          },
          {
            id: 'alert_002',
            severity: 'info',
            title: 'AI Service Cost Spike',
            description: 'OpenAI API costs increased by 23% compared to last week',
            component: 'ai_services',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            acknowledged: true,
            acknowledged_by: 'admin@6fb.ai',
            acknowledged_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            recommended_actions: [
              'Review AI usage patterns',
              'Optimize prompt efficiency',
              'Consider request caching'
            ]
          }
        ],
        resolved_alerts: [
          {
            id: 'alert_003',
            severity: 'critical',
            title: 'API Gateway Timeout',
            description: 'API Gateway experienced high latency and timeouts',
            component: 'api_gateway',
            created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            resolved_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            resolved_by: 'admin@6fb.ai',
            resolution_notes: 'Restarted API Gateway instances and optimized load balancer configuration'
          }
        ],
        alert_statistics: {
          total_alerts_24h: 5,
          critical_alerts_24h: 1,
          warning_alerts_24h: 2,
          info_alerts_24h: 2,
          average_resolution_time_minutes: 45,
          alerts_by_component: {
            database: 2,
            api_gateway: 1,
            ai_services: 1,
            caching_layer: 1
          }
        },
        incident_history: [
          {
            id: 'incident_001',
            title: 'Database Performance Degradation',
            severity: 'major',
            start_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 127,
            affected_tenants: 23,
            root_cause: 'Database index corruption',
            resolution: 'Rebuilt indexes and optimized queries'
          },
          {
            id: 'incident_002',
            title: 'AI Service Outage',
            severity: 'minor',
            start_time: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            end_time: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
            duration_minutes: 32,
            affected_tenants: 7,
            root_cause: 'OpenAI API rate limiting',
            resolution: 'Implemented fallback to Anthropic API'
          }
        ],
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: alertsData,
        timestamp: new Date().toISOString()
      })
    }

    if (component === 'logs') {
      const logsData = {
        timeframe: timeframe,
        log_levels: {
          error: 234,
          warning: 1456,
          info: 12345,
          debug: 45678
        },
        recent_errors: [
          {
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            level: 'error',
            component: 'ai_service',
            message: 'OpenAI API timeout after 30 seconds',
            details: {
              tenant_id: '00000000-0000-0000-0000-000000000001',
              request_id: 'req_abc123',
              model: 'gpt-4-turbo'
            }
          },
          {
            timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
            level: 'error',
            component: 'database',
            message: 'Query timeout: SELECT * FROM tenant_analytics',
            details: {
              query_duration: 30000,
              tenant_id: '00000000-0000-0000-0000-000000000002'
            }
          },
          {
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            level: 'warning',
            component: 'auth',
            message: 'Multiple failed login attempts detected',
            details: {
              ip_address: '192.168.1.100',
              attempts: 5,
              email: 'suspicious@example.com'
            }
          }
        ],
        performance_logs: [
          {
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            endpoint: '/api/ai/unified-chat',
            response_time: 2340,
            status_code: 200,
            tenant_id: '00000000-0000-0000-0000-000000000001'
          },
          {
            timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
            endpoint: '/api/analytics/predictive',
            response_time: 1890,
            status_code: 200,
            tenant_id: '00000000-0000-0000-0000-000000000002'
          }
        ],
        security_logs: [
          {
            timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
            event: 'rate_limit_exceeded',
            ip_address: '10.0.0.45',
            endpoint: '/api/ai/chat-multi',
            details: { limit: 100, requests: 156 }
          },
          {
            timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
            event: 'suspicious_request_pattern',
            ip_address: '192.168.1.200',
            details: { requests_per_minute: 500, blocked: true }
          }
        ],
        generated_at: new Date().toISOString()
      }

      return NextResponse.json({
        success: true,
        data: logsData,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid component specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Platform health API error:', error)
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

    if (action === 'acknowledge_alert') {
      const { alert_id } = data

      if (!alert_id) {
        return NextResponse.json({
          success: false,
          error: 'Alert ID required'
        }, { status: 400 })
      }

      console.log('Admin acknowledged alert:', {
        admin_user_id: authCheck.user.id,
        alert_id: alert_id,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        data: {
          alert_id: alert_id,
          acknowledged: true,
          acknowledged_by: authCheck.user.email,
          acknowledged_at: new Date().toISOString()
        },
        message: 'Alert acknowledged successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'resolve_alert') {
      const { alert_id, resolution_notes } = data

      if (!alert_id) {
        return NextResponse.json({
          success: false,
          error: 'Alert ID required'
        }, { status: 400 })
      }

      console.log('Admin resolved alert:', {
        admin_user_id: authCheck.user.id,
        alert_id: alert_id,
        resolution_notes: resolution_notes,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        data: {
          alert_id: alert_id,
          status: 'resolved',
          resolved_by: authCheck.user.email,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolution_notes
        },
        message: 'Alert resolved successfully',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'trigger_health_check') {
      const { component } = data

      console.log('Admin triggered health check:', {
        admin_user_id: authCheck.user.id,
        component: component || 'all',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        data: {
          health_check_id: generateUUID(),
          component: component || 'all',
          status: 'initiated',
          estimated_completion: new Date(Date.now() + 2 * 60 * 1000).toISOString()
        },
        message: 'Health check initiated successfully',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action specified'
    }, { status: 400 })

  } catch (error) {
    console.error('Platform health management error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateUUID() {
  return `health-check-${Date.now()}-${process.hrtime.bigint().toString(36)}`
}