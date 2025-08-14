// 🧪 Test with verified domain directly
const sgMail = require('@sendgrid/mail')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = 'noreply@6fbmentorship.com' // Use verified domain

console.log('🧪 Testing with Verified Domain')
console.log('==============================')
console.log('')
console.log('From Email:', fromEmail)
console.log('Domain: 6fbmentorship.com (✅ Verified)')
console.log('')

sgMail.setApiKey(apiKey)

async function testVerifiedDomain() {
  const testEmail = process.argv[2] || 'test@gmail.com'
  
  const msg = {
    to: testEmail,
    from: fromEmail,
    subject: '✅ Verified Domain Test - 6FB AI System',
    text: 'This email is sent from a verified domain!',
    html: `
      <h2>✅ Verified Domain Test Success!</h2>
      <p>This email was sent from: <strong>${fromEmail}</strong></p>
      <p>Domain: <strong>6fbmentorship.com</strong> (Verified ✅)</p>
      <p>If you receive this, the domain authentication is working!</p>
    `,
  }

  try {
    console.log(`📧 Sending test email to: ${testEmail}`)
    console.log('⏳ Please wait...')
    
    const response = await sgMail.send(msg)
    
    console.log('✅ SUCCESS! Email sent from verified domain!')
    console.log('Response Status:', response[0].statusCode)
    console.log('')
    console.log('🎉 RESULT: Verified domain is working!')
    console.log('📬 Check your inbox for the test email')
    console.log('')
    console.log('🔧 NEXT STEP: Update Supabase SMTP sender email to:')
    console.log('   noreply@6fbmentorship.com')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testVerifiedDomain()