// 🔍 Check Recent SendGrid Activity in Detail
const https = require('https')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY

console.log('🔍 Recent SendGrid Activity Check')
console.log('=================================')
console.log('')

// Check recent email activity with more details
function checkRecentActivity() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com', 
      port: 443,
      path: '/v3/messages?limit=20', // Get last 20 messages
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
        } else if (res.statusCode === 401) {
          console.log('⚠️  API key might not have sufficient permissions for activity logs')
          console.log('💡 This is normal - the key works for sending but not for reading logs')
          resolve({ messages: [] })
        } else {
          reject(new Error(`Activity check failed ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Alternative: Check delivery stats for today
function checkTodayStats() {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().split('T')[0]
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: `/v3/stats?start_date=${today}&end_date=${today}&aggregated_by=day`,
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

async function checkRecentSendGridActivity() {
  try {
    console.log('🔍 Checking recent activity...')
    
    try {
      const activity = await checkRecentActivity()
      if (activity.messages && activity.messages.length > 0) {
        console.log(`📧 Found ${activity.messages.length} recent messages:`)
        console.log('')
        
        activity.messages.slice(0, 5).forEach((msg, i) => {
          console.log(`${i + 1}. To: ${msg.to_email || 'N/A'}`)
          console.log(`   From: ${msg.from_email || 'N/A'}`)
          console.log(`   Status: ${msg.status || 'N/A'}`)
          console.log(`   Subject: ${msg.subject || 'Verification email'}`)
          console.log(`   Time: ${msg.last_event_time || 'N/A'}`)
          if (msg.events && msg.events.length > 0) {
            console.log(`   Events: ${msg.events.map(e => e.event_name).join(', ')}`)
          }
          console.log('')
        })
      } else {
        console.log('📧 No recent message details available (API key permissions)')
      }
    } catch (activityError) {
      console.log('⚠️  Activity logs not accessible:', activityError.message)
    }

    console.log('📊 Checking today\'s delivery stats...')
    
    try {
      const stats = await checkTodayStats()
      if (stats && stats.length > 0) {
        const todayStats = stats[0]
        if (todayStats.stats && todayStats.stats.length > 0) {
          const metrics = todayStats.stats[0].metrics
          console.log('')
          console.log('📊 Today\'s Email Stats:')
          console.log(`   Requests: ${metrics.requests || 0}`)
          console.log(`   Delivered: ${metrics.delivered || 0}`)
          console.log(`   Bounces: ${metrics.bounces || 0}`)
          console.log(`   Blocks: ${metrics.blocks || 0}`)
          console.log(`   Spam Reports: ${metrics.spam_reports || 0}`)
          console.log(`   Drops: ${metrics.drops || 0}`)
          console.log('')
          
          // Calculate percentages
          const total = metrics.requests || 1
          const deliveryRate = ((metrics.delivered || 0) / total * 100).toFixed(1)
          const bounceRate = ((metrics.bounces || 0) / total * 100).toFixed(1)
          
          console.log(`📈 Delivery Rate: ${deliveryRate}%`)
          console.log(`📉 Bounce Rate: ${bounceRate}%`)
          
          if (metrics.bounces > 0) {
            console.log('')
            console.log('🎯 HIGH BOUNCE RATE CAUSES:')
            console.log('1. Invalid email addresses (test@gmail.com doesn\'t exist)')
            console.log('2. Emails going to spam folder')
            console.log('3. Recipient email provider blocking automated emails')
            console.log('4. Domain authentication issues')
          }
          
          if (metrics.delivered > 0) {
            console.log('')
            console.log('✅ SOME EMAILS DELIVERED! Check:')
            console.log('1. Inbox (primary tab)')
            console.log('2. Spam/junk folder')
            console.log('3. Promotions tab (Gmail)')
            console.log('4. All folders in email client')
          }
        }
      }
    } catch (statsError) {
      console.log('⚠️  Could not fetch delivery stats:', statsError.message)
    }
    
  } catch (error) {
    console.error('❌ Error checking SendGrid activity:', error.message)
  }
}

checkRecentSendGridActivity()