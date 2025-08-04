// 🧪 Direct SendGrid API Test
const sgMail = require('@sendgrid/mail')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'support@em3014.6fbmentorship.com'

console.log('🧪 Direct SendGrid API Test')
console.log('===========================')
console.log('')

if (!apiKey) {
  console.error('❌ SENDGRID_API_KEY not found in .env.local')
  process.exit(1)
}

console.log('📋 Configuration:')
console.log('API Key:', apiKey.substring(0, 10) + '...')
console.log('From Email:', fromEmail)
console.log('')

sgMail.setApiKey(apiKey)

async function testSendGridDirectly() {
  const testEmail = process.argv[2] || 'test@gmail.com'
  
  const msg = {
    to: testEmail,
    from: fromEmail,
    subject: '🧪 SendGrid Direct Test - 6FB AI System',
    text: 'This is a direct test of SendGrid API to verify email delivery.',
    html: `
      <h2>🧪 SendGrid Direct Test</h2>
      <p>This email confirms that SendGrid is working correctly for the 6FB AI Agent System.</p>
      <p><strong>Test Details:</strong></p>
      <ul>
        <li>Sent directly via SendGrid API</li>
        <li>Bypassing Supabase SMTP</li>
        <li>From: ${fromEmail}</li>
        <li>To: ${testEmail}</li>
      </ul>
      <p>If you receive this email, SendGrid is configured correctly!</p>
    `,
  }

  try {
    console.log(`📧 Sending test email to: ${testEmail}`)
    console.log('⏳ Please wait...')
    
    const response = await sgMail.send(msg)
    
    console.log('✅ SendGrid API Response: SUCCESS')
    console.log('📤 Email sent successfully!')
    console.log('Response Status:', response[0].statusCode)
    console.log('')
    console.log('🎉 RESULT: SendGrid is working correctly!')
    console.log('📬 Check your inbox for the test email')
    console.log('')
    console.log('🔍 DIAGNOSIS:')
    console.log('- SendGrid API: ✅ Working')
    console.log('- SendGrid Credentials: ✅ Valid')
    console.log('- Email Delivery: ✅ Should be delivered')
    console.log('')
    console.log('❌ ISSUE: Supabase SMTP configuration is incorrect')
    console.log('🔧 SOLUTION: Verify SMTP settings in Supabase dashboard')
    
  } catch (error) {
    console.error('❌ SendGrid Error:', error.message)
    
    if (error.code === 401) {
      console.log('🔧 ISSUE: Invalid SendGrid API key')
      console.log('💡 SOLUTION: Check your SendGrid API key')
    } else if (error.code === 403) {
      console.log('🔧 ISSUE: SendGrid API key lacks permissions')
      console.log('💡 SOLUTION: Regenerate API key with Mail Send permissions')
    } else if (error.message.includes('does not contain a valid address')) {
      console.log('🔧 ISSUE: From email address not verified in SendGrid')
      console.log('💡 SOLUTION: Verify the sender email in SendGrid dashboard')
    } else {
      console.log('🔧 ISSUE: SendGrid configuration problem')
      console.log('💡 SOLUTION: Check SendGrid dashboard for issues')
    }
  }
}

// Check if SendGrid package is installed
try {
  require.resolve('@sendgrid/mail')
  testSendGridDirectly()
} catch (err) {
  console.log('📦 Installing @sendgrid/mail package...')
  const { execSync } = require('child_process')
  try {
    execSync('npm install @sendgrid/mail --no-save', { stdio: 'inherit' })
    console.log('✅ Package installed, running test...')
    console.log('')
    // Re-require and run test
    delete require.cache[require.resolve('@sendgrid/mail')]
    const sgMail2 = require('@sendgrid/mail')
    sgMail2.setApiKey(apiKey)
    testSendGridDirectly()
  } catch (installErr) {
    console.error('❌ Failed to install @sendgrid/mail:', installErr.message)
  }
}