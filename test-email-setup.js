// 🧪 Email Setup Test Script
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure .env.local contains:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailSetup() {
  const testEmail = process.argv[2]
  
  if (!testEmail) {
    console.error('❌ Please provide an email address for testing')
    console.log('Usage: node test-email-setup.js your-email@gmail.com')
    process.exit(1)
  }
  
  console.log('🧪 Testing email configuration...')
  console.log(`📧 Testing with email: ${testEmail}`)
  console.log('')
  
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/dashboard`
      }
    })
    
    if (error) {
      console.error('❌ Email test failed:', error.message)
      
      if (error.message.includes('rate limit')) {
        console.log('⏰ Rate limited. Wait 60 seconds and try again.')
      } else if (error.message.includes('SMTP')) {
        console.log('🔧 SMTP not configured yet. Please set up SMTP in Supabase dashboard.')
        console.log('Run: node setup-supabase-smtp.js')
      } else {
        console.log('💡 Make sure SMTP is properly configured in Supabase dashboard.')
      }
    } else {
      console.log('✅ Email test successful!')
      console.log('📬 Check your inbox for a verification email')
      console.log('')
      console.log('📋 If you don\'t see the email:')
      console.log('1. Check spam/junk folders')
      console.log('2. Wait 1-2 minutes for delivery')
      console.log('3. Verify SMTP settings in Supabase dashboard')
    }
  } catch (err) {
    console.error('❌ Test error:', err.message)
  }
}

testEmailSetup()