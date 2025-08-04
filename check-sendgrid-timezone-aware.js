// 🔍 Timezone-Aware SendGrid Stats Check
const https = require('https')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY

console.log('🔍 Timezone-Aware SendGrid Stats Check')
console.log('====================================')
console.log('')

// Get dates in different timezones
function getDatesForTimezones() {
  const now = new Date()
  
  // UTC date
  const utcDate = now.toISOString().split('T')[0]
  
  // EST (UTC-5) date
  const estDate = new Date(now.getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0]
  
  // CST (UTC-6) - SendGrid account timezone
  const cstDate = new Date(now.getTime() - (6 * 60 * 60 * 1000)).toISOString().split('T')[0]
  
  // Yesterday in each timezone (in case it's past midnight)
  const yesterdayUtc = new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0]
  const yesterdayEst = new Date(now.getTime() - (29 * 60 * 60 * 1000)).toISOString().split('T')[0]
  const yesterdayCst = new Date(now.getTime() - (30 * 60 * 60 * 1000)).toISOString().split('T')[0]
  
  return {
    utc: { today: utcDate, yesterday: yesterdayUtc },
    est: { today: estDate, yesterday: yesterdayEst },
    cst: { today: cstDate, yesterday: yesterdayCst }
  }
}

// Check stats for a specific date range
function checkStatsForDateRange(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: `/v3/stats?start_date=${startDate}&end_date=${endDate}&aggregated_by=day`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`Stats check failed ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function checkTimezoneAwareStats() {
  const dates = getDatesForTimezones()
  
  console.log('📅 Date Analysis:')
  console.log(`   UTC Today: ${dates.utc.today}`)
  console.log(`   EST Today: ${dates.est.today}`)
  console.log(`   CST Today: ${dates.cst.today} (SendGrid account timezone)`)
  console.log('')
  
  try {
    // Check last 3 days to cover all timezone possibilities
    const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    
    console.log(`📊 Checking stats from ${threeDaysAgo} to ${today}...`)
    
    const stats = await checkStatsForDateRange(threeDaysAgo, today)
    
    if (stats && stats.length > 0) {
      console.log('')
      console.log('📈 Email Stats by Date:')
      console.log('======================')
      
      let totalRequests = 0
      let totalDelivered = 0
      
      stats.forEach(dayStat => {
        if (dayStat.stats && dayStat.stats.length > 0) {
          const metrics = dayStat.stats[0].metrics
          const requests = metrics.requests || 0
          const delivered = metrics.delivered || 0
          const bounces = metrics.bounces || 0
          
          totalRequests += requests
          totalDelivered += delivered
          
          if (requests > 0) {
            console.log(`📅 ${dayStat.date}:`)
            console.log(`   Requests: ${requests}`)
            console.log(`   Delivered: ${delivered}`)
            console.log(`   Bounces: ${bounces}`)
            console.log(`   Delivery Rate: ${((delivered / requests) * 100).toFixed(1)}%`)
            console.log('')
          }
        }
      })
      
      console.log(`🎯 TOTALS: ${totalRequests} requests, ${totalDelivered} delivered`)
      
      if (totalRequests > 0) {
        console.log('')
        console.log('✅ CONFIRMED: Emails are being sent to SendGrid!')
        if (totalDelivered > 0) {
          console.log('✅ SOME EMAILS DELIVERED: Check all email folders')
        } else {
          console.log('❌ HIGH BOUNCE RATE: Check email addresses and spam folders')
        }
      } else {
        console.log('')
        console.log('❌ NO REQUESTS: Supabase might not be connecting to SendGrid')
      }
    } else {
      console.log('📊 No stats found for the date range')
    }
    
  } catch (error) {
    console.error('❌ Error checking stats:', error.message)
  }
}

checkTimezoneAwareStats()