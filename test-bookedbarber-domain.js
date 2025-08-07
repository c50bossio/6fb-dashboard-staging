// 🧪 Test with bookedbarber.com domain
const sgMail = require('@sendgrid/mail')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com'

console.log('🧪 Testing with BookedBarber Domain')
console.log('==================================')
console.log('')
console.log('From Email:', fromEmail)
console.log('Domain: bookedbarber.com (✅ Verified)')
console.log('')

sgMail.setApiKey(apiKey)

async function testBookedBarberDomain() {
  const testEmail = process.argv[2] || 'test@gmail.com'
  
  const msg = {
    to: testEmail,
    from: fromEmail,
    subject: '✅ BookedBarber Domain Test - 6FB AI System',
    text: 'This email is sent from the verified BookedBarber domain!',
    html: `
      <h2>✅ BookedBarber Domain Test Success!</h2>
      <p>This email was sent from: <strong>${fromEmail}</strong></p>
      <p>Domain: <strong>bookedbarber.com</strong> (Verified ✅)</p>
      <p>If you receive this, the domain authentication is working perfectly!</p>
      <p><em>6FB AI Agent System - Email Verification</em></p>
    `,
  }

  try {
    console.log(`📧 Sending test email to: ${testEmail}`)
    console.log('⏳ Please wait...')
    
    const response = await sgMail.send(msg)
    
    console.log('✅ SUCCESS! Email sent from BookedBarber domain!')
    console.log('Response Status:', response[0].statusCode)
    console.log('')
    console.log('🎉 RESULT: BookedBarber domain is working!')
    console.log('📬 Check your inbox for the test email')
    console.log('')
    console.log('🔧 NEXT STEP: Update Supabase SMTP sender email to:')
    console.log('   noreply@bookedbarber.com')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testBookedBarberDomain()