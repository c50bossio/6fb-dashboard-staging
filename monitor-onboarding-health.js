/**
 * Onboarding Health Monitoring Script
 * Run this periodically to ensure onboarding system is functioning correctly
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🏥 ONBOARDING HEALTH MONITOR')
console.log('='.repeat(60))
console.log('Timestamp:', new Date().toISOString())
console.log('-'.repeat(60))

/**
 * Check 1: Database Table Health
 */
async function checkDatabaseHealth() {
  console.log('\n📊 Database Health Check')
  console.log('-'.repeat(40))
  
  const tables = [
    'profiles',
    'barbershops',
    'onboarding_progress',
    'services',
    'barbers',
    'barbershop_staff'
  ]
  
  const health = {
    healthy: true,
    issues: []
  }
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        console.error(`❌ ${table}: ERROR - ${error.message}`)
        health.healthy = false
        health.issues.push(`${table}: ${error.message}`)
      } else {
        console.log(`✅ ${table}: OK (${count || 0} records)`)
      }
    } catch (error) {
      console.error(`❌ ${table}: CRITICAL ERROR - ${error.message}`)
      health.healthy = false
      health.issues.push(`${table}: CRITICAL - ${error.message}`)
    }
  }
  
  return health
}

/**
 * Check 2: Recent Onboarding Activity
 */
async function checkRecentActivity() {
  console.log('\n📈 Recent Onboarding Activity (Last 24 Hours)')
  console.log('-'.repeat(40))
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  try {
    // Check new onboarding starts
    const { data: recentProgress, count: progressCount } = await supabase
      .from('onboarding_progress')
      .select('*', { count: 'exact' })
      .gte('completed_at', yesterday)
    
    console.log(`📝 New onboarding steps saved: ${progressCount || 0}`)
    
    // Check completed onboardings
    const { data: completedOnboardings, count: completedCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('onboarding_completed', true)
      .gte('onboarding_completed_at', yesterday)
    
    console.log(`✅ Onboardings completed: ${completedCount || 0}`)
    
    // Check new barbershops created
    const { data: newBarbershops, count: barbershopCount } = await supabase
      .from('barbershops')
      .select('*', { count: 'exact' })
      .gte('created_at', yesterday)
    
    console.log(`🏪 New barbershops created: ${barbershopCount || 0}`)
    
    // Get unique users in onboarding
    if (recentProgress && recentProgress.length > 0) {
      const uniqueUsers = new Set(recentProgress.map(p => p.user_id))
      console.log(`👥 Unique users in onboarding: ${uniqueUsers.size}`)
      
      // Check their progress distribution
      const stepCounts = {}
      recentProgress.forEach(p => {
        stepCounts[p.step_name] = (stepCounts[p.step_name] || 0) + 1
      })
      
      console.log('\n📊 Step Distribution:')
      Object.entries(stepCounts).forEach(([step, count]) => {
        console.log(`  - ${step}: ${count}`)
      })
    }
    
    return {
      progressCount: progressCount || 0,
      completedCount: completedCount || 0,
      barbershopCount: barbershopCount || 0
    }
    
  } catch (error) {
    console.error('❌ Error checking activity:', error.message)
    return null
  }
}

/**
 * Check 3: Stuck/Abandoned Onboardings
 */
async function checkAbandonedOnboardings() {
  console.log('\n⚠️  Abandoned Onboarding Detection')
  console.log('-'.repeat(40))
  
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  try {
    // Find users who started but didn't complete onboarding
    const { data: incompleteProfiles } = await supabase
      .from('profiles')
      .select('id, email, created_at, onboarding_step')
      .eq('onboarding_completed', false)
      .lte('created_at', oneDayAgo)
      .limit(10)
    
    if (incompleteProfiles && incompleteProfiles.length > 0) {
      console.log(`Found ${incompleteProfiles.length} incomplete onboardings:`)
      
      for (const profile of incompleteProfiles) {
        // Get their last progress
        const { data: lastProgress } = await supabase
          .from('onboarding_progress')
          .select('step_name, completed_at')
          .eq('user_id', profile.id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()
        
        const daysSinceCreated = Math.floor(
          (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        
        if (lastProgress) {
          const daysSinceLastStep = Math.floor(
            (Date.now() - new Date(lastProgress.completed_at).getTime()) / (1000 * 60 * 60 * 24)
          )
          console.log(`  📍 ${profile.email || profile.id}`)
          console.log(`     Created: ${daysSinceCreated} days ago`)
          console.log(`     Last step: ${lastProgress.step_name} (${daysSinceLastStep} days ago)`)
        } else {
          console.log(`  📍 ${profile.email || profile.id}`)
          console.log(`     Created: ${daysSinceCreated} days ago`)
          console.log(`     No progress saved`)
        }
      }
      
      return { abandonedCount: incompleteProfiles.length }
    } else {
      console.log('✅ No abandoned onboardings detected')
      return { abandonedCount: 0 }
    }
    
  } catch (error) {
    console.error('❌ Error checking abandoned onboardings:', error.message)
    return null
  }
}

/**
 * Check 4: Data Integrity Verification
 */
async function checkDataIntegrity() {
  console.log('\n🔍 Data Integrity Check')
  console.log('-'.repeat(40))
  
  const issues = []
  
  try {
    // Check for profiles without barbershops (shop owners)
    const { data: shopOwners } = await supabase
      .from('profiles')
      .select('id, email, shop_id, barbershop_id')
      .eq('role', 'SHOP_OWNER')
      .eq('onboarding_completed', true)
    
    if (shopOwners) {
      const missingShops = shopOwners.filter(p => !p.shop_id && !p.barbershop_id)
      if (missingShops.length > 0) {
        issues.push(`${missingShops.length} shop owners without barbershop associations`)
        console.log(`⚠️  Found ${missingShops.length} shop owners without barbershops`)
        missingShops.slice(0, 3).forEach(p => {
          console.log(`   - ${p.email || p.id}`)
        })
      } else {
        console.log('✅ All shop owners have barbershop associations')
      }
    }
    
    // Check for barbershops without owners
    const { data: orphanedShops } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .is('owner_id', null)
    
    if (orphanedShops && orphanedShops.length > 0) {
      issues.push(`${orphanedShops.length} barbershops without owners`)
      console.log(`⚠️  Found ${orphanedShops.length} barbershops without owners`)
    } else {
      console.log('✅ All barbershops have owners')
    }
    
    // Check for duplicate barbershops per owner
    const { data: allShops } = await supabase
      .from('barbershops')
      .select('owner_id')
      .not('owner_id', 'is', null)
    
    if (allShops) {
      const ownerCounts = {}
      allShops.forEach(shop => {
        ownerCounts[shop.owner_id] = (ownerCounts[shop.owner_id] || 0) + 1
      })
      
      const duplicates = Object.entries(ownerCounts).filter(([_, count]) => count > 1)
      if (duplicates.length > 0) {
        issues.push(`${duplicates.length} users with multiple barbershops`)
        console.log(`⚠️  Found ${duplicates.length} users with multiple barbershops`)
      } else {
        console.log('✅ No duplicate barbershops per owner')
      }
    }
    
    return { healthy: issues.length === 0, issues }
    
  } catch (error) {
    console.error('❌ Error checking data integrity:', error.message)
    return { healthy: false, issues: ['Failed to check integrity'] }
  }
}

/**
 * Check 5: API Endpoint Health
 */
async function checkAPIEndpoints() {
  console.log('\n🌐 API Endpoint Health Check')
  console.log('-'.repeat(40))
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'
  const endpoints = [
    { path: '/api/onboarding/save-progress', method: 'GET' },
    { path: '/api/profile', method: 'GET' },
    { path: '/api/barbershop', method: 'GET' }
  ]
  
  console.log('Note: This check requires the Next.js server to be running')
  console.log('Checking endpoints at:', baseUrl)
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // We expect 401 (unauthorized) for authenticated endpoints when not logged in
      // This still indicates the endpoint is working
      if (response.status === 401 || response.status === 200) {
        console.log(`✅ ${endpoint.path}: OK (${response.status})`)
      } else {
        console.log(`⚠️  ${endpoint.path}: Status ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint.path}: Not responding (server may be down)`)
    }
  }
}

/**
 * Generate Health Report
 */
async function generateHealthReport() {
  const report = {
    timestamp: new Date().toISOString(),
    checks: {}
  }
  
  // Run all checks
  console.log('\n🏃 Running all health checks...\n')
  
  report.checks.database = await checkDatabaseHealth()
  report.checks.activity = await checkRecentActivity()
  report.checks.abandoned = await checkAbandonedOnboardings()
  report.checks.integrity = await checkDataIntegrity()
  
  // Only check API if not in CI/test environment
  if (!process.env.CI) {
    await checkAPIEndpoints()
  }
  
  // Overall health status
  const overallHealth = 
    report.checks.database.healthy &&
    report.checks.integrity.healthy &&
    (report.checks.abandoned?.abandonedCount || 0) < 10
  
  console.log('\n' + '='.repeat(60))
  console.log('📋 HEALTH REPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Overall Status: ${overallHealth ? '✅ HEALTHY' : '⚠️  ISSUES DETECTED'}`)
  console.log(`Database: ${report.checks.database.healthy ? '✅' : '❌'}`)
  console.log(`Data Integrity: ${report.checks.integrity.healthy ? '✅' : '❌'}`)
  console.log(`Abandoned Onboardings: ${report.checks.abandoned?.abandonedCount || 0}`)
  
  if (report.checks.activity) {
    console.log('\nLast 24 Hours:')
    console.log(`  - Onboardings Started: ${report.checks.activity.progressCount}`)
    console.log(`  - Onboardings Completed: ${report.checks.activity.completedCount}`)
    console.log(`  - Barbershops Created: ${report.checks.activity.barbershopCount}`)
  }
  
  if (!overallHealth) {
    console.log('\n⚠️  Issues Found:')
    if (report.checks.database.issues.length > 0) {
      report.checks.database.issues.forEach(issue => {
        console.log(`  - ${issue}`)
      })
    }
    if (report.checks.integrity.issues.length > 0) {
      report.checks.integrity.issues.forEach(issue => {
        console.log(`  - ${issue}`)
      })
    }
  }
  
  console.log('\n' + '-'.repeat(60))
  console.log('Report generated at:', new Date().toLocaleString())
  
  return report
}

// Run if executed directly
if (require.main === module) {
  generateHealthReport().then(report => {
    const isHealthy = report.checks.database.healthy && report.checks.integrity.healthy
    process.exit(isHealthy ? 0 : 1)
  })
}

module.exports = { 
  checkDatabaseHealth, 
  checkRecentActivity, 
  checkAbandonedOnboardings,
  checkDataIntegrity,
  checkAPIEndpoints,
  generateHealthReport 
}