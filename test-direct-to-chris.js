// 🧪 Direct test to Chris's Gmail
const sgMail = require('@sendgrid/mail')
require('dotenv').config({ path: '.env.local' })

const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = 'noreply@6fbmentorship.com'

console.log('🧪 Direct Test to c50bossio@gmail.com')
console.log('====================================')
console.log('')

sgMail.setApiKey(apiKey)

async function testDirectToChris() {
  const msg = {
    to: 'c50bossio@gmail.com',
    from: fromEmail,
    subject: '🧪 6FB AI Agent System - Email Delivery Test',
    text: 'This is a direct test email to verify delivery to your Gmail account.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">🧪 Email Delivery Test</h2>
        <p>Hi Chris,</p>
        <p>This is a <strong>direct test email</strong> from the 6FB AI Agent System to verify that emails can be delivered to your Gmail account.</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Test Details:</h3>
          <ul>
            <li><strong>From:</strong> noreply@6fbmentorship.com</li>
            <li><strong>To:</strong> c50bossio@gmail.com</li>
            <li><strong>Service:</strong> SendGrid SMTP</li>
            <li><strong>Domain:</strong> 6fbmentorship.com (Verified ✅)</li>
          </ul>
        </div>
        
        <p><strong>If you receive this email:</strong></p>
        <ul>
          <li>✅ SendGrid delivery is working</li>
          <li>✅ Domain authentication is correct</li>
          <li>✅ Your Gmail is receiving emails from this sender</li>
        </ul>
        
        <p><strong>If this email goes to spam:</strong></p>
        <ul>
          <li>Mark it as "Not Spam" to improve future delivery</li>
          <li>Add noreply@6fbmentorship.com to your contacts</li>
        </ul>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          <em>6FB AI Agent System - Email Verification Test</em><br>
          This email was sent to test the email verification system.
        </p>
      </div>
    `,
  }

  try {
    console.log('📧 Sending direct test email to c50bossio@gmail.com...')
    console.log('⏳ Please wait...')
    
    const response = await sgMail.send(msg)
    
    console.log('✅ Email sent successfully!')
    console.log('Response Status:', response[0].statusCode)
    console.log('Message ID:', response[0].headers['x-message-id'])
    console.log('')
    console.log('🎯 NEXT STEPS:')
    console.log('1. Check your Gmail inbox (c50bossio@gmail.com)')
    console.log('2. Check spam/junk folder')
    console.log('3. Check Promotions tab')
    console.log('4. Check on mobile Gmail app')
    console.log('')
    console.log('📱 If you receive this email, the verification system should work!')
    
  } catch (error) {
    console.error('❌ Error sending email:', error.message)
    if (error.response) {
      console.error('Response body:', error.response.body)
    }
  }
}

testDirectToChris()