// 🔍 Check SendGrid Activity/Delivery Logs
const https = require('https')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY

console.log('🔍 SendGrid Activity & Delivery Logs Check')
console.log('=========================================')
console.log('')

if (!apiKey) {
  console.error('❌ SendGrid API key not found')
  process.exit(1)
}

// Check recent email activity
function checkEmailActivity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/messages?limit=10', // Get last 10 messages
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
          reject(new Error(`Activity check failed ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Check delivery stats
function checkDeliveryStats() {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().split('T')[0]
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: `/v3/stats?start_date=${today}&end_date=${today}`,
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

async function checkSendGridLogs() {
  try {
    console.log('🔍 Checking recent email activity...')
    
    try {
      const activity = await checkEmailActivity()
      console.log(`📧 Found ${activity.messages ? activity.messages.length : 0} recent messages`)
      
      if (activity.messages && activity.messages.length > 0) {
        console.log('')
        console.log('📋 Recent Messages:')
        activity.messages.forEach((msg, i) => {
          console.log(`${i + 1}. To: ${msg.to_email || 'N/A'}`)
          console.log(`   Status: ${msg.status || 'N/A'}`)
          console.log(`   Subject: ${msg.subject || 'N/A'}`)
          console.log(`   Timestamp: ${msg.last_event_time || 'N/A'}`)
          console.log('')
        })
      } else {
        console.log('❌ No recent messages found in SendGrid activity')
        console.log('💡 This suggests emails are NOT being sent to SendGrid at all')
      }
    } catch (activityError) {
      console.log('⚠️  Could not fetch activity logs:', activityError.message)
    }

    console.log('🔍 Checking delivery stats for today...')
    
    try {
      const stats = await checkDeliveryStats()
      if (stats && stats.length > 0) {
        console.log('📊 Today\'s Email Stats:')
        stats.forEach(stat => {
          if (stat.stats && stat.stats.length > 0) {
            const todayStats = stat.stats[0].metrics
            console.log(`   Requests: ${todayStats.requests || 0}`)
            console.log(`   Delivered: ${todayStats.delivered || 0}`)
            console.log(`   Bounces: ${todayStats.bounces || 0}`)
            console.log(`   Spam Reports: ${todayStats.spam_reports || 0}`)
          }
        })
      } else {
        console.log('📊 No email stats for today')
        console.log('💡 This confirms no emails have been sent through SendGrid')
      }
    } catch (statsError) {
      console.log('⚠️  Could not fetch delivery stats:', statsError.message)
    }

    console.log('')
    console.log('🎯 ROOT CAUSE ANALYSIS:')
    console.log('======================')
    console.log('If SendGrid shows no recent activity or stats, it means:')
    console.log('❌ Supabase is NOT actually sending emails to SendGrid')
    console.log('❌ The SMTP connection between Supabase and SendGrid is failing')
    console.log('❌ Despite API showing "success", actual email delivery is not happening')
    console.log('')
    console.log('🔧 SOLUTIONS:')
    console.log('1. Wait 10-15 minutes for SMTP settings to fully propagate in Supabase')
    console.log('2. Check Supabase Auth Logs for SMTP connection errors')
    console.log('3. Try disabling and re-enabling custom SMTP in Supabase')
    console.log('4. Verify the SendGrid API key has "Mail Send" permissions')
    
  } catch (error) {
    console.error('❌ Error checking SendGrid logs:', error.message)
  }
}

checkSendGridLogs()