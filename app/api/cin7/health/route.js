/**
 * CIN7 Health Check API
 * Monitors connection status and sync health
 */

import { NextResponse } from 'next/server'
import { Cin7Client, decrypt } from '@/lib/cin7-client.js'
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ 
        status: 'disconnected',
        message: 'Not authenticated',
        health: 'offline'
      })
    }

    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!barbershop) {
      return NextResponse.json({ 
        status: 'disconnected',
        message: 'No barbershop found',
        health: 'offline'
      })
    }

    // Get CIN7 credentials
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('*')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()

    if (!credentials) {
      return NextResponse.json({ 
        status: 'disconnected',
        message: 'CIN7 not configured',
        health: 'offline',
        requiresSetup: true
      })
    }

    // Calculate health metrics
    const now = new Date()
    const lastSync = credentials.last_sync ? new Date(credentials.last_sync) : null
    const minutesSinceSync = lastSync ? Math.floor((now - lastSync) / 1000 / 60) : null
    
    // Get sync interval from settings
    const syncInterval = credentials.sync_settings?.syncInterval || 15
    const isOverdue = minutesSinceSync && minutesSinceSync > syncInterval * 2

    // Get recent sync logs
    const { data: recentSyncs } = await supabase
      .from('sale_syncs')
      .select('sync_status, timestamp')
      .eq('barbershop_id', barbershop.id)
      .order('timestamp', { ascending: false })
      .limit(10)

    // Calculate success rate
    const successCount = recentSyncs?.filter(s => s.sync_status === 'success').length || 0
    const totalCount = recentSyncs?.length || 0
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 100

    // Get inventory alerts
    const { data: activeAlerts } = await supabase
      .from('inventory_alerts')
      .select('alert_type, severity')
      .eq('barbershop_id', barbershop.id)
      .eq('resolved', false)

    // Determine health status
    let health = 'healthy'
    const issues = []

    if (isOverdue) {
      health = 'degraded'
      issues.push({
        type: 'sync_overdue',
        message: `Last sync was ${minutesSinceSync} minutes ago (expected every ${syncInterval} minutes)`,
        severity: 'warning'
      })
    }

    if (successRate < 50) {
      health = 'degraded'
      issues.push({
        type: 'high_failure_rate',
        message: `Recent sync success rate is only ${successRate.toFixed(0)}%`,
        severity: 'warning'
      })
    }

    if (credentials.last_sync_status === 'failed') {
      health = 'degraded'
      issues.push({
        type: 'last_sync_failed',
        message: 'The last sync attempt failed',
        severity: 'error'
      })
    }

    if (activeAlerts?.some(a => a.severity === 'critical')) {
      issues.push({
        type: 'critical_alerts',
        message: `${activeAlerts.filter(a => a.severity === 'critical').length} critical inventory alerts`,
        severity: 'error'
      })
    }

    // Test live connection if health is degraded or it's been a while
    let liveConnectionOk = true
    if (health === 'degraded' || minutesSinceSync > 60) {
      try {
        const accountId = decrypt(JSON.parse(credentials.encrypted_account_id))
        const apiKey = decrypt(JSON.parse(credentials.encrypted_api_key))
        const cin7 = new Cin7Client(accountId, apiKey)
        
        const testResult = await cin7.testConnection()
        liveConnectionOk = testResult.success
        
        if (!liveConnectionOk) {
          health = 'offline'
          issues.push({
            type: 'connection_failed',
            message: 'Cannot connect to CIN7 API',
            severity: 'critical'
          })
        }
      } catch (error) {
        liveConnectionOk = false
        health = 'offline'
        issues.push({
          type: 'connection_error',
          message: error.message,
          severity: 'critical'
        })
      }
    }

    // Get product metrics
    const { data: products } = await supabase
      .from('products')
      .select('current_stock, min_stock_level')
      .eq('barbershop_id', barbershop.id)
      .eq('cin7_sync_enabled', true)

    const metrics = products ? {
      totalProducts: products.length,
      lowStock: products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_level).length,
      outOfStock: products.filter(p => p.current_stock === 0).length,
      totalValue: products.reduce((sum, p) => sum + (p.current_stock * (p.retail_price || 0)), 0)
    } : null

    // Calculate next sync time
    const nextSyncTime = lastSync 
      ? new Date(lastSync.getTime() + syncInterval * 60 * 1000)
      : new Date(now.getTime() + syncInterval * 60 * 1000)
    
    const minutesUntilSync = Math.max(0, Math.floor((nextSyncTime - now) / 1000 / 60))

    return NextResponse.json({
      status: liveConnectionOk ? 'connected' : 'error',
      health,
      lastSync: credentials.last_sync,
      lastSyncStatus: credentials.last_sync_status,
      nextSync: minutesUntilSync > 0 ? `in ${minutesUntilSync} minutes` : 'overdue',
      syncInterval: `${syncInterval} minutes`,
      successRate: `${successRate.toFixed(0)}%`,
      accountName: credentials.account_name,
      webhookStatus: credentials.webhook_status || 'unknown',
      metrics,
      issues: issues.length > 0 ? issues : undefined,
      alerts: {
        total: activeAlerts?.length || 0,
        critical: activeAlerts?.filter(a => a.severity === 'critical').length || 0,
        warning: activeAlerts?.filter(a => a.severity === 'high' || a.severity === 'medium').length || 0
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      health: 'offline',
      message: 'Health check failed',
      error: error.message,
      issues: [{
        type: 'health_check_error',
        message: error.message,
        severity: 'critical'
      }]
    }, { status: 500 })
  }
}