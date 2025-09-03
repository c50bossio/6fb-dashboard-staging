/**
 * Onboarding Health Monitoring Script
 * Run this periodically to ensure onboarding system is functioning correctly
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

)
.toISOString())
)

/**
 * Check 1: Database Table Health
 */
async function checkDatabaseHealth() {
  
  )
  
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
        `)
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
  ')
  )
  
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  try {
    // Check new onboarding starts
    const { data: recentProgress, count: progressCount } = await supabase
      .from('onboarding_progress')
      .select('*', { count: 'exact' })
      .gte('completed_at', yesterday)

    // Check completed onboardings
    const { data: completedOnboardings, count: completedCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('onboarding_completed', true)
      .gte('onboarding_completed_at', yesterday)

    // Check new barbershops created
    const { data: newBarbershops, count: barbershopCount } = await supabase
      .from('barbershops')
      .select('*', { count: 'exact' })
      .gte('created_at', yesterday)

    // Get unique users in onboarding
    if (recentProgress && recentProgress.length > 0) {
      const uniqueUsers = new Set(recentProgress.map(p => p.user_id))

      // Check their progress distribution
      const stepCounts = {}
      recentProgress.forEach(p => {
        stepCounts[p.step_name] = (stepCounts[p.step_name] || 0) + 1
      })

      Object.entries(stepCounts).forEach(([step, count]) => {
        
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
  
  )
  
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

          `)
        } else {

        }
      }
      
      return { abandonedCount: incompleteProfiles.length }
    } else {
      
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
  
  )
  
  const issues = []
  
  try {
    // Check for profiles without barbershops (shop owners)
    const { data: shopOwners } = await supabase
      .from('profiles')
      .select('id, email, barbershop_id, barbershop_id')
      .eq('role', 'SHOP_OWNER')
      .eq('onboarding_completed', true)
    
    if (shopOwners) {
      const missingShops = shopOwners.filter(p => !p.barbershop_id && !p.barbershop_id)
      if (missingShops.length > 0) {
        issues.push(`${missingShops.length} shop owners without barbershop associations`)
        
        missingShops.slice(0, 3).forEach(p => {
          
        })
      } else {
        
      }
    }
    
    // Check for barbershops without owners
    const { data: orphanedShops } = await supabase
      .from('barbershops')
      .select('id, name, owner_id')
      .is('owner_id', null)
    
    if (orphanedShops && orphanedShops.length > 0) {
      issues.push(`${orphanedShops.length} barbershops without owners`)
      
    } else {
      
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
        
      } else {
        
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
  
  )
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'
  const endpoints = [
    { path: '/api/onboarding/save-progress', method: 'GET' },
    { path: '/api/profile', method: 'GET' },
    { path: '/api/barbershop', method: 'GET' }
  ]

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
        `)
      } else {
        
      }
    } catch (error) {
      `)
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
  
  )
  
  )

  if (report.checks.activity) {

  }
  
  if (!overallHealth) {
    
    if (report.checks.database.issues.length > 0) {
      report.checks.database.issues.forEach(issue => {
        
      })
    }
    if (report.checks.integrity.issues.length > 0) {
      report.checks.integrity.issues.forEach(issue => {
        
      })
    }
  }
  
  )
  .toLocaleString())
  
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