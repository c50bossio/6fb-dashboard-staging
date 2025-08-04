// 🔍 Check SendGrid Domain and Settings
const https = require('https')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL

console.log('🔍 SendGrid Domain and Authentication Check')
console.log('==========================================')
console.log('')

if (!apiKey) {
  console.error('❌ SendGrid API key not found')
  process.exit(1)
}

console.log('📋 Configuration:')
console.log('From Email:', fromEmail)
console.log('Domain:', fromEmail.split('@')[1])
console.log('')

// Check SendGrid API key validity
function checkSendGridAPI() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/user/profile',
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
          const profile = JSON.parse(data)
          resolve(profile)
        } else {
          reject(new Error(`API returned ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

// Check domain authentication
function checkDomainAuth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/whitelabel/domains',
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
          reject(new Error(`Domain check failed ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

async function runChecks() {
  try {
    console.log('🔍 Checking SendGrid API key validity...')
    const profile = await checkSendGridAPI()
    console.log('✅ API Key Valid!')
    console.log('   Account:', profile.username)
    console.log('   Email:', profile.email)
    console.log('')

    console.log('🔍 Checking domain authentication...')
    const domains = await checkDomainAuth()
    console.log(`📧 Found ${domains.length} authenticated domains:`)
    
    const targetDomain = fromEmail.split('@')[1]
    let domainFound = false
    
    domains.forEach(domain => {
      const status = domain.valid ? '✅ Verified' : '❌ Not Verified'
      console.log(`   ${domain.domain}: ${status}`)
      if (domain.domain === targetDomain) {
        domainFound = true
        if (!domain.valid) {
          console.log('   ⚠️  This is the domain you\'re trying to send from!')
        }
      }
    })
    
    if (!domainFound) {
      console.log(`❌ Domain "${targetDomain}" not found in authenticated domains!`)
      console.log('💡 This might be why emails aren\'t being sent.')
    }
    
    console.log('')
    console.log('🎯 DIAGNOSIS:')
    console.log('=============')
    
    if (!domainFound) {
      console.log('❌ ISSUE: Sender domain not authenticated in SendGrid')
      console.log('🔧 SOLUTION: Either:')
      console.log('   1. Authenticate the domain "em3014.6fbmentorship.com" in SendGrid')
      console.log('   2. Use a verified sender email instead')
      console.log('   3. Use SendGrid\'s default sending domain')
      console.log('')
      console.log('🔗 SendGrid Domain Authentication:')
      console.log('   https://app.sendgrid.com/settings/sender_auth/domain')
    } else {
      const targetDomainObj = domains.find(d => d.domain === targetDomain)
      if (targetDomainObj && !targetDomainObj.valid) {
        console.log('❌ ISSUE: Domain exists but not verified')
        console.log('🔧 SOLUTION: Complete domain verification in SendGrid')
      } else {
        console.log('✅ Domain is properly authenticated')
        console.log('❌ Issue might be elsewhere (Supabase SMTP config)')
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking SendGrid:', error.message)
    
    if (error.message.includes('401')) {
      console.log('🔧 ISSUE: Invalid SendGrid API key')
    } else if (error.message.includes('403')) {
      console.log('🔧 ISSUE: API key lacks required permissions')
    }
  }
}

runChecks()