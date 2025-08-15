#!/usr/bin/env node

const https = require('https')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function checkEmailDeliveryIssues() {
  console.log('📧 Email Delivery Issue Analysis')
  console.log('═'.repeat(60))
  
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  
  console.log('Project Reference:', projectRef)
  console.log('Project URL:', supabaseUrl)
  
  console.log('\n🔗 STEP 1: URL Configuration Check')
  console.log('─'.repeat(40))
  
  const currentUrl = 'http://localhost:9999'
  const dashboardUrl = `${currentUrl}/dashboard`
  
  console.log('Current app URL:', currentUrl)
  console.log('Dashboard redirect URL:', dashboardUrl)
  console.log('Expected redirect in emails:', dashboardUrl)
  
  console.log('\n⚙️ STEP 2: Common Supabase Email Issues')
  console.log('─'.repeat(40))
  
  console.log('Issue #1: Using default Supabase SMTP')
  console.log('  - Supabase uses limited default SMTP service')
  console.log('  - Emails may be rejected by Gmail, Outlook, etc.')
  console.log('  - Solution: Configure custom SMTP provider')
  
  console.log('\nIssue #2: Rate limiting too aggressive')
  console.log('  - 60-second rate limit on resend attempts')
  console.log('  - May block legitimate resend requests')
  console.log('  - Solution: Wait full 60 seconds between attempts')
  
  console.log('\nIssue #3: Site URL mismatch')
  console.log('  - Site URL in Supabase must match your domain')
  console.log('  - Emails contain links to confirmation endpoint')
  console.log('  - Solution: Update Site URL in Authentication settings')
  
  console.log('\nIssue #4: Email template configuration')
  console.log('  - Default templates may not work for all providers')
  console.log('  - Missing proper sender information')
  console.log('  - Solution: Customize email templates')
  
  console.log('\n📮 STEP 3: Email Provider Compatibility')
  console.log('─'.repeat(40))
  
  const emailProviders = [
    { name: 'Gmail', domain: '@gmail.com', reliability: 'High', notes: 'Generally reliable for Supabase emails' },
    { name: 'Outlook/Hotmail', domain: '@outlook.com', reliability: 'Medium', notes: 'May filter automated emails' },
    { name: 'Yahoo', domain: '@yahoo.com', reliability: 'Medium', notes: 'Aggressive spam filtering' },
    { name: 'Apple iCloud', domain: '@icloud.com', reliability: 'Low', notes: 'Very strict spam filtering' },
    { name: 'ProtonMail', domain: '@protonmail.com', reliability: 'Medium', notes: 'Privacy-focused, may block tracking' }
  ]
  
  console.log('Email Provider Compatibility:')
  emailProviders.forEach(provider => {
    console.log(`  ${provider.name} ${provider.domain}:`)
    console.log(`    Reliability: ${provider.reliability}`)
    console.log(`    Notes: ${provider.notes}`)
  })
  
  console.log('\n🚨 STEP 4: Immediate Action Items')
  console.log('─'.repeat(40))
  
  console.log('1. CHECK SUPABASE DASHBOARD:')
  console.log('   → Go to: https://supabase.com/dashboard/project/' + projectRef + '/auth/settings')
  console.log('   → Verify "Enable email confirmations" is ON')
  console.log('   → Check Site URL matches: http://localhost:9999')
  console.log('   → Add redirect URL: http://localhost:9999/dashboard')
  
  console.log('\n2. TEST WITH GMAIL ACCOUNT:')
  console.log('   → Use a Gmail account for testing')
  console.log('   → Check both inbox AND spam folder')
  console.log('   → Look for emails from "noreply@mail.supabase.io"')
  
  console.log('\n3. CONFIGURE CUSTOM SMTP (Recommended):')
  console.log('   → Use SendGrid, Mailgun, or similar service')
  console.log('   → Add SMTP settings in Supabase Dashboard')
  console.log('   → This will significantly improve delivery rates')
  
  console.log('   → Check Authentication → Email Templates')
  console.log('   → Ensure confirmation template is enabled')
  console.log('   → Verify template contains proper confirmation link')
  
  console.log('\n🔧 STEP 5: Manual Testing URLs')
  console.log('─'.repeat(40))
  
  console.log('Supabase Auth URLs to test manually:')
  console.log('Authentication Settings:', `https://supabase.com/dashboard/project/${projectRef}/auth/settings`)
  console.log('Email Templates:', `https://supabase.com/dashboard/project/${projectRef}/auth/templates`)
  console.log('User Management:', `https://supabase.com/dashboard/project/${projectRef}/auth/users`)
  
  console.log('\n🔄 STEP 6: Alternative Testing Method')
  console.log('─'.repeat(40))
  
  console.log('Test with a real email you control:')
  console.log('1. Use your personal Gmail/Outlook email')
  console.log('2. Register through the frontend: http://localhost:9999/register')
  console.log('3. Check email within 5 minutes')
  console.log('4. Check spam folder if not in inbox')
  console.log('5. Look for sender: noreply@mail.supabase.io')
  
  console.log('\n✅ Next Steps Summary:')
  console.log('1. Visit Supabase Dashboard and verify settings')
  console.log('2. Test with your personal email')
  console.log('3. Check spam folders thoroughly')
  console.log('4. Consider setting up custom SMTP')
  console.log('5. If still failing, enable email logging in Supabase')
}

checkEmailDeliveryIssues().catch(console.error)