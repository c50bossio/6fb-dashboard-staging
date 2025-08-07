import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const startTime = Date.now()
  const { searchParams } = new URL(request.url)
  const detailed = searchParams.get('detailed') === 'true'
  const testConnections = searchParams.get('connections') === 'true'

  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {},
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'localhost',
      region: process.env.VERCEL_REGION || 'local',
      git_commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    }
  }

  // Check Supabase
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    health.services.supabase = {
      status: error ? 'error' : 'healthy',
      message: error?.message,
    }
  } catch (error) {
    health.services.supabase = {
      status: 'error',
      message: error.message,
    }
  }

  // Check Stripe
  try {
    if (process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      if (testConnections) {
        // Import dynamically to avoid issues if Stripe isn't configured
        const { default: Stripe } = await import('stripe')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        const balance = await stripe.balance.retrieve()
        health.services.stripe = {
          status: 'healthy',
          currency: balance.available[0]?.currency,
          test_mode: process.env.STRIPE_SECRET_KEY.includes('_test_'),
        }
      } else {
        health.services.stripe = {
          status: 'configured',
          test_mode: process.env.STRIPE_SECRET_KEY.includes('_test_'),
        }
      }
    } else {
      health.services.stripe = {
        status: 'not_configured',
      }
    }
  } catch (error) {
    health.services.stripe = {
      status: 'error',
      message: error.message,
    }
  }

  // Clerk removed - using Supabase authentication only

  // Check OpenAI
  try {
    if (process.env.OPENAI_API_KEY) {
      const validKey = process.env.OPENAI_API_KEY.startsWith('sk-')
      health.services.openai = {
        status: validKey ? 'configured' : 'error',
        message: validKey ? undefined : 'Invalid API key format'
      }
    } else {
      health.services.openai = { status: 'not_configured' }
    }
  } catch (error) {
    health.services.openai = { status: 'error', message: error.message }
  }

  // Check Anthropic
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const validKey = process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')
      health.services.anthropic = {
        status: validKey ? 'configured' : 'error',
        message: validKey ? undefined : 'Invalid API key format'
      }
    } else {
      health.services.anthropic = { status: 'not_configured' }
    }
  } catch (error) {
    health.services.anthropic = { status: 'error', message: error.message }
  }

  // Check Pusher
  try {
    const hasConfig = process.env.PUSHER_APP_ID && 
                     process.env.NEXT_PUBLIC_PUSHER_KEY && 
                     process.env.PUSHER_SECRET && 
                     process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    
    health.services.pusher = {
      status: hasConfig ? 'configured' : 'not_configured',
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || undefined
    }
  } catch (error) {
    health.services.pusher = { status: 'error', message: error.message }
  }

  // Check PostHog
  try {
    health.services.posthog = {
      status: process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'configured' : 'not_configured',
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
    }
  } catch (error) {
    health.services.posthog = { status: 'error', message: error.message }
  }

  // Check Sentry
  try {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      const validDSN = process.env.NEXT_PUBLIC_SENTRY_DSN.includes('sentry.io')
      health.services.sentry = {
        status: validDSN ? 'configured' : 'error',
        message: validDSN ? undefined : 'Invalid DSN format'
      }
    } else {
      health.services.sentry = { status: 'not_configured' }
    }
  } catch (error) {
    health.services.sentry = { status: 'error', message: error.message }
  }

  // Check Novu
  try {
    const hasConfig = process.env.NOVU_API_KEY && process.env.NEXT_PUBLIC_NOVU_APP_IDENTIFIER
    health.services.novu = {
      status: hasConfig ? 'configured' : 'not_configured'
    }
  } catch (error) {
    health.services.novu = { status: 'error', message: error.message }
  }

  // Check Edge Config
  try {
    health.services.edgeConfig = {
      status: process.env.EDGE_CONFIG ? 'configured' : 'not_configured'
    }
  } catch (error) {
    health.services.edgeConfig = { status: 'error', message: error.message }
  }

  // Calculate overall health status
  const errors = Object.values(health.services).filter(s => s.status === 'error')
  const unconfigured = Object.values(health.services).filter(s => s.status === 'not_configured')
  const healthy = Object.values(health.services).filter(s => s.status === 'healthy' || s.status === 'configured')

  // Critical services that must be configured
  const criticalServices = ['supabase', 'stripe']
  const criticalErrors = criticalServices.filter(service => 
    health.services[service]?.status === 'error'
  )
  const criticalUnconfigured = criticalServices.filter(service => 
    health.services[service]?.status === 'not_configured'
  )

  if (criticalErrors.length > 0) {
    health.status = 'unhealthy'
    health.critical_issues = criticalErrors.map(service => `${service}: ${health.services[service].message || 'error'}`)
  } else if (errors.length > 0) {
    health.status = 'degraded'
  } else if (criticalUnconfigured.length > 0) {
    health.status = 'partial'
  } else if (unconfigured.length > 0) {
    health.status = 'partial'
  }

  // Add detailed statistics if requested
  if (detailed) {
    health.statistics = {
      total_services: Object.keys(health.services).length,
      healthy: healthy.length,
      errors: errors.length,
      unconfigured: unconfigured.length,
      critical_errors: criticalErrors.length,
      critical_unconfigured: criticalUnconfigured.length,
    }
  }

  // Add system info
  health.system = {
    node_version: process.version,
    platform: process.platform,
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
    response_time_ms: Date.now() - startTime,
  }

  // Determine HTTP status code
  let httpStatus = 200
  if (health.status === 'unhealthy') httpStatus = 503
  else if (health.status === 'degraded') httpStatus = 206
  else if (health.status === 'partial') httpStatus = 200

  return NextResponse.json(health, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}

// HEAD request for simple uptime checks (used by load balancers)
export async function HEAD() {
  try {
    // Quick check of critical environment variables
    const critical = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
    
    const missing = critical.filter(env => !process.env[env])
    const status = missing.length === 0 ? 200 : 503
    
    return new Response(null, { 
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  } catch (error) {
    return new Response(null, { status: 503 })
  }
}