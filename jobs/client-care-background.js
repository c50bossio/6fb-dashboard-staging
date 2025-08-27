#!/usr/bin/env node

/**
 * Background Job: Client Care Flag Pre-calculation
 * 
 * This background job runs periodically to:
 * 1. Pre-calculate client care flags for all barbershops
 * 2. Update client risk scores and priority levels  
 * 3. Warm cache with fresh data
 * 4. Send proactive notifications to staff
 * 
 * Designed to run as a cron job or scheduled task every 30 minutes
 * 
 * Usage:
 *   node jobs/client-care-background.js [--barbershop-id=123] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { warmClientCareCache, scheduledCacheRefresh } from '../lib/cache-invalidation.js'
import { generateCacheKey } from '../lib/redis-client.js'

// Configuration
const BATCH_SIZE = 10 // Process shops in batches to avoid overwhelming the database
const MAX_RUNTIME_MINUTES = 25 // Safety limit - job should complete before next run
const CLIENT_CARE_THRESHOLDS = {
  INACTIVE_DAYS: 60,
  NO_SHOW_DAYS: 30,
  HIGH_VALUE_THRESHOLD: 500,
  HIGH_VISIT_THRESHOLD: 10
}

// Track job execution
let jobStats = {
  startTime: Date.now(),
  barbershopsProcessed: 0,
  clientsUpdated: 0,
  cacheWarmed: 0,
  errors: 0,
  warnings: 0
}

/**
 * Main job execution function
 */
async function executeClientCareJob() {
  console.log('🤖 Starting Client Care Background Job...')
  console.log(`   Started at: ${new Date().toISOString()}`)
  console.log(`   Batch size: ${BATCH_SIZE}`)
  console.log(`   Max runtime: ${MAX_RUNTIME_MINUTES} minutes\n`)

  // Initialize Supabase with service role for background operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Get command line arguments
    const args = process.argv.slice(2)
    const isDryRun = args.includes('--dry-run')
    const targetBarbershopId = args.find(arg => arg.startsWith('--barbershop-id='))?.split('=')[1]
    
    if (isDryRun) {
      console.log('🧪 DRY RUN MODE - No changes will be made\n')
    }

    // Get all active barbershops or target specific one
    let barbershopsQuery = supabase
      .from('barbershops')
      .select('id, name, created_at, owner_id')
      .eq('is_active', true)
    
    if (targetBarbershopId) {
      barbershopsQuery = barbershopsQuery.eq('id', targetBarbershopId)
      console.log(`🎯 Targeting specific barbershop: ${targetBarbershopId}\n`)
    }

    const { data: barbershops, error: barbershopsError } = await barbershopsQuery
    
    if (barbershopsError) {
      throw new Error(`Failed to fetch barbershops: ${barbershopsError.message}`)
    }

    if (!barbershops || barbershops.length === 0) {
      console.log('ℹ️ No active barbershops found to process')
      return jobStats
    }

    console.log(`📋 Found ${barbershops.length} barbershop(s) to process\n`)

    // Process barbershops in batches
    for (let i = 0; i < barbershops.length; i += BATCH_SIZE) {
      const batch = barbershops.slice(i, i + BATCH_SIZE)
      
      // Check runtime limit
      const runtimeMinutes = (Date.now() - jobStats.startTime) / (1000 * 60)
      if (runtimeMinutes > MAX_RUNTIME_MINUTES) {
        console.warn(`⏰ Approaching runtime limit (${runtimeMinutes.toFixed(1)}min), stopping early`)
        jobStats.warnings++
        break
      }

      console.log(`📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(barbershops.length/BATCH_SIZE)}`)
      
      // Process each barbershop in the batch
      const batchPromises = batch.map(barbershop => 
        processBarbershop(supabase, barbershop, isDryRun)
      )

      const batchResults = await Promise.allSettled(batchPromises)
      
      // Analyze batch results
      batchResults.forEach((result, index) => {
        jobStats.barbershopsProcessed++
        
        if (result.status === 'fulfilled') {
          jobStats.clientsUpdated += result.value.clientsUpdated || 0
          jobStats.cacheWarmed += result.value.cacheWarmed ? 1 : 0
        } else {
          console.error(`❌ Batch processing failed for ${batch[index].name}:`, result.reason?.message)
          jobStats.errors++
        }
      })

      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < barbershops.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

  } catch (error) {
    console.error('❌ Fatal error in client care job:', error.message)
    jobStats.errors++
    throw error
  }

  return jobStats
}

/**
 * Process a single barbershop
 */
async function processBarbershop(supabase, barbershop, isDryRun) {
  const barbershopId = barbershop.id
  const barbershopName = barbershop.name
  
  console.log(`  🏪 Processing: ${barbershopName} (ID: ${barbershopId})`)
  
  const processingStats = {
    clientsUpdated: 0,
    cacheWarmed: false,
    errors: []
  }

  try {
    // 1. Identify clients needing care
    const clientsNeedingCare = await identifyClientsNeedingCare(supabase, barbershopId)
    console.log(`    📊 Found ${clientsNeedingCare.length} clients needing care`)

    // 2. Update client care flags (if not dry run)
    if (!isDryRun && clientsNeedingCare.length > 0) {
      const updateResult = await updateClientCareFlags(supabase, barbershopId, clientsNeedingCare)
      processingStats.clientsUpdated = updateResult.updated
      
      if (updateResult.errors.length > 0) {
        processingStats.errors.push(...updateResult.errors)
      }
    }

    // 3. Refresh cache for this barbershop
    if (!isDryRun) {
      try {
        await scheduledCacheRefresh(barbershopId, 'background_job')
        
        // Warm cache with common priority levels
        await warmClientCareCache(barbershopId, ['high', 'medium'])
        processingStats.cacheWarmed = true
        
        console.log(`    🔥 Cache warmed for ${barbershopName}`)
      } catch (cacheError) {
        console.warn(`    ⚠️ Cache warming failed for ${barbershopName}:`, cacheError.message)
        processingStats.errors.push(`Cache warming failed: ${cacheError.message}`)
      }
    }

    // 4. Check if proactive notifications needed (Phase 3 feature)
    if (clientsNeedingCare.length > 5) {
      console.log(`    📧 ${barbershopName} has ${clientsNeedingCare.length} clients needing care - consider staff notification`)
    }

    const duration = Date.now() - jobStats.startTime
    console.log(`    ✅ ${barbershopName} processed (${duration}ms)\n`)

  } catch (error) {
    console.error(`    ❌ Error processing ${barbershopName}:`, error.message)
    processingStats.errors.push(error.message)
    throw error
  }

  return processingStats
}

/**
 * Identify clients that need care using the same logic as the API
 */
async function identifyClientsNeedingCare(supabase, barbershopId) {
  const now = new Date()
  const noShowThreshold = new Date(now - (CLIENT_CARE_THRESHOLDS.NO_SHOW_DAYS * 24 * 60 * 60 * 1000))
  const inactiveThreshold = new Date(now - (CLIENT_CARE_THRESHOLDS.INACTIVE_DAYS * 24 * 60 * 60 * 1000))
  
  const clientsNeedingCare = []

  try {
    // Find clients with recent no-shows
    const { data: noShowClients } = await supabase
      .from('appointments')
      .select('customer_id, customers!inner(id, name, total_spent, total_visits)')
      .eq('barbershop_id', barbershopId)
      .eq('status', 'no_show')
      .gte('appointment_date', noShowThreshold.toISOString())

    if (noShowClients) {
      noShowClients.forEach(apt => {
        clientsNeedingCare.push({
          id: apt.customers.id,
          name: apt.customers.name,
          reason: 'recent_no_show',
          priority: 'high',
          care_score: calculateCareScore(apt.customers, 'no_show')
        })
      })
    }

    // Find inactive clients
    const { data: inactiveClients } = await supabase
      .from('customers')
      .select('id, name, total_spent, total_visits, last_visit_at')
      .eq('barbershop_id', barbershopId)
      .or(`last_visit_at.lt.${inactiveThreshold.toISOString()},last_visit_at.is.null`)
      .gt('total_visits', 0)
      .limit(50)

    if (inactiveClients) {
      inactiveClients
        .filter(client => !clientsNeedingCare.find(c => c.id === client.id))
        .forEach(client => {
          clientsNeedingCare.push({
            id: client.id,
            name: client.name,
            reason: 'inactive',
            priority: client.total_spent > CLIENT_CARE_THRESHOLDS.HIGH_VALUE_THRESHOLD ? 'high' : 'medium',
            care_score: calculateCareScore(client, 'inactive')
          })
        })
    }

  } catch (error) {
    console.error('Error identifying clients needing care:', error.message)
    throw error
  }

  return clientsNeedingCare
}

/**
 * Update client care flags in database
 */
async function updateClientCareFlags(supabase, barbershopId, clientsNeedingCare) {
  const result = {
    updated: 0,
    errors: []
  }

  for (const client of clientsNeedingCare) {
    try {
      // Update or create client care record
      const { error } = await supabase
        .from('client_care_flags')
        .upsert({
          barbershop_id: barbershopId,
          client_id: client.id,
          needs_care: true,
          care_reason: client.reason,
          care_priority: client.priority,
          care_score: client.care_score,
          last_updated: new Date().toISOString(),
          updated_by: 'background_job'
        }, {
          onConflict: 'barbershop_id,client_id'
        })

      if (error) {
        result.errors.push(`Client ${client.id}: ${error.message}`)
      } else {
        result.updated++
      }

    } catch (error) {
      result.errors.push(`Client ${client.id}: ${error.message}`)
    }
  }

  return result
}

/**
 * Simple care score calculation (matches API logic)
 */
function calculateCareScore(client, reason) {
  let score = 0
  
  // Value scoring
  const totalSpent = client.total_spent || 0
  if (totalSpent > 1000) score += 40
  else if (totalSpent > 500) score += 30  
  else if (totalSpent > 200) score += 20
  else if (totalSpent > 50) score += 10
  
  // Loyalty scoring
  const totalVisits = client.total_visits || 0
  if (totalVisits > 20) score += 30
  else if (totalVisits > 10) score += 20
  else if (totalVisits > 5) score += 15
  else if (totalVisits > 1) score += 10
  
  // Reason-based scoring
  switch (reason) {
    case 'no_show': score += 30; break
    case 'cancelled': score += 20; break  
    case 'inactive': score += 15; break
  }
  
  return Math.min(score, 100)
}

/**
 * Generate job completion report
 */
function generateJobReport(stats) {
  const duration = Date.now() - stats.startTime
  const durationMinutes = Math.round(duration / 60000)
  
  console.log('\n📋 Client Care Background Job Report:')
  console.log('=====================================')
  console.log(`   Duration: ${durationMinutes} minutes`)
  console.log(`   Barbershops processed: ${stats.barbershopsProcessed}`)
  console.log(`   Clients updated: ${stats.clientsUpdated}`)
  console.log(`   Caches warmed: ${stats.cacheWarmed}`)
  console.log(`   Errors: ${stats.errors}`)
  console.log(`   Warnings: ${stats.warnings}`)
  console.log(`   Success rate: ${stats.barbershopsProcessed > 0 ? Math.round(((stats.barbershopsProcessed - stats.errors) / stats.barbershopsProcessed) * 100) : 0}%`)
  console.log('=====================================')
  
  return {
    ...stats,
    duration_ms: duration,
    duration_minutes: durationMinutes,
    success_rate: stats.barbershopsProcessed > 0 ? Math.round(((stats.barbershopsProcessed - stats.errors) / stats.barbershopsProcessed) * 100) : 0
  }
}

/**
 * Main execution with error handling
 */
async function main() {
  try {
    const finalStats = await executeClientCareJob()
    const report = generateJobReport(finalStats)
    
    // Log to file or monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      console.log('📊 Job completed successfully:', JSON.stringify(report))
    }
    
    process.exit(0)
    
  } catch (error) {
    console.error('\n💥 Client Care Background Job FAILED:')
    console.error('======================================')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.error('======================================')
    
    const report = generateJobReport(jobStats)
    console.error('📊 Partial execution stats:', JSON.stringify(report))
    
    process.exit(1)
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\n\n⏹️ Background job interrupted')
  const report = generateJobReport(jobStats)
  console.log('📊 Partial execution stats:', JSON.stringify(report))
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run the job
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export default executeClientCareJob