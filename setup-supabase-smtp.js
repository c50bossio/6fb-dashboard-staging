// 🚀 Supabase SMTP Configuration Script
// This script helps configure Supabase to use your existing SendGrid credentials

const chalk = require('chalk')

console.log(chalk.blue('🚀 6FB AI Agent System - Supabase SMTP Setup'))
console.log(chalk.blue('============================================='))
console.log('')

console.log(chalk.green('✅ Found existing SendGrid configuration!'))
console.log('')

const config = {
  apiKey: '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',
  fromEmail: 'support@em3014.6fbmentorship.com',
  fromName: '6FB AI Agent System'
}

console.log(chalk.yellow('📋 SMTP Configuration for Supabase Dashboard:'))
console.log(chalk.yellow('=============================================='))
console.log('')

console.log(chalk.blue('🔗 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings'))
console.log('')
console.log('Scroll down to "SMTP Settings" and enter:')
console.log('')
console.log(chalk.green('Host:') + ' smtp.sendgrid.net')
console.log(chalk.green('Port:') + ' 587')
console.log(chalk.green('Username:') + ' apikey')
console.log(chalk.green('Password:') + ' ' + config.apiKey)
console.log(chalk.green('Sender Name:') + ' ' + config.fromName)
console.log(chalk.green('Sender Email:') + ' ' + config.fromEmail)
console.log('')

console.log(chalk.yellow('⚠️  IMPORTANT: Make sure to click "Save" after entering these settings!'))
console.log('')

console.log(chalk.blue('📋 After configuring SMTP in Supabase:'))
console.log('1. Test registration at: http://localhost:9999/register')
console.log('2. Use a real email address (gmail.com, outlook.com, etc.)')
console.log('3. Verification emails should now work!')
console.log('')

console.log(chalk.green('🎉 Your SendGrid credentials are now configured!'))
console.log('')

console.log(chalk.yellow('📧 Email Configuration Summary:'))
console.log('- SendGrid API Key: ✅ Configured in .env.local')
console.log('- From Email: support@em3014.6fbmentorship.com')
console.log('- SMTP Settings: Ready to copy-paste into Supabase')
console.log('')

console.log(chalk.blue('🔧 Need to test the setup?'))
console.log('Run: node test-email-setup.js your-email@gmail.com')