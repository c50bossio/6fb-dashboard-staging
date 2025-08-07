// 🔍 Check which SendGrid account we're using
const https = require('https')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY

console.log('🔍 SendGrid Account Verification')
console.log('===============================')
console.log('')
console.log('API Key (partial):', apiKey ? apiKey.substring(0, 15) + '...' : 'Not found')
console.log('')

function checkSendGridAccount() {
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
          console.log('✅ SendGrid Account Details:')
          console.log('   Username:', profile.username || 'N/A')
          console.log('   Email:', profile.email || 'N/A') 
          console.log('   First Name:', profile.first_name || 'N/A')
          console.log('   Last Name:', profile.last_name || 'N/A')
          console.log('   Company:', profile.company || 'N/A')
          console.log('')
          console.log('🎯 QUESTION: Is this the SendGrid account you\'re expecting?')
          console.log('   If not, we might be using the wrong API key!')
          resolve(profile)
        } else {
          console.error('❌ API Key Error:', res.statusCode, data)
          reject(new Error(`Account check failed ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (err) => {
      console.error('❌ Request Error:', err.message)
      reject(err)
    })
    req.end()
  })
}

checkSendGridAccount()