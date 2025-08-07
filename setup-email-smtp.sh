#!/bin/bash

# 🚀 Email SMTP Setup Script for 6FB AI Agent System
# This script helps configure SendGrid SMTP to restore email functionality

echo "🚀 6FB AI Agent System - Email SMTP Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📧 ISSUE IDENTIFIED:${NC}"
echo "Supabase has restricted email sending due to bounce backs from test emails."
echo "We need to configure custom SMTP to restore email functionality."
echo ""

echo -e "${BLUE}🎯 WHAT WE'LL DO:${NC}"
echo "1. Create SendGrid account (you'll need to do this manually)"
echo "2. Generate SendGrid API key"
echo "3. Configure Supabase SMTP settings"
echo "4. Test email functionality"
echo ""

echo -e "${GREEN}Step 1: Create SendGrid Account${NC}"
echo "----------------------------------------"
echo "1. Go to: https://sendgrid.com/pricing/"
echo "2. Click 'Start for free' (100 emails/day free)"
echo "3. Sign up with your email address"
echo "4. Verify your email address"
echo "5. Complete the account setup"
echo ""
echo "⏳ Complete this step, then press ENTER to continue..."
read -p ""

echo -e "${GREEN}Step 2: Create SendGrid API Key${NC}"
echo "----------------------------------------"
echo "1. Log into SendGrid Dashboard"
echo "2. Go to Settings → API Keys"
echo "3. Click 'Create API Key'"
echo "4. Choose 'Restricted Access'"
echo "5. Enable 'Mail Send' permissions"
echo "6. Copy the API key (starts with 'SG.')"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Copy the API key now - you won't see it again!${NC}"
echo ""
echo -n "📋 Paste your SendGrid API Key here: "
read SENDGRID_API_KEY

if [[ ! $SENDGRID_API_KEY =~ ^SG\. ]]; then
    echo -e "${RED}❌ Invalid API key format. API keys should start with 'SG.'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Valid API key format detected!${NC}"
echo ""

echo -e "${GREEN}Step 3: Configure Environment Variables${NC}"
echo "----------------------------------------"

# Add SendGrid API key to .env.local
if [ -f ".env.local" ]; then
    # Remove any existing SendGrid keys
    sed -i '' '/SENDGRID_API_KEY/d' .env.local
    # Add new key
    echo "SENDGRID_API_KEY=$SENDGRID_API_KEY" >> .env.local
    echo -e "${GREEN}✅ Added SendGrid API key to .env.local${NC}"
else
    echo "SENDGRID_API_KEY=$SENDGRID_API_KEY" > .env.local
    echo -e "${GREEN}✅ Created .env.local with SendGrid API key${NC}"
fi

echo ""
echo -e "${GREEN}Step 4: Supabase SMTP Configuration${NC}"
echo "----------------------------------------"
echo "Now we need to configure SMTP settings in your Supabase dashboard:"
echo ""
echo -e "${BLUE}🔗 Supabase Auth Settings URL:${NC}"
echo "https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings"
echo ""
echo -e "${YELLOW}📋 SMTP Settings to Enter:${NC}"
echo "Host: smtp.sendgrid.net"
echo "Port: 587"
echo "Username: apikey"
echo "Password: $SENDGRID_API_KEY"
echo "Sender Name: 6FB Barbershop System"
echo "Sender Email: noreply@yourdomain.com (or use your verified email)"
echo ""
echo "⏳ Configure these settings in Supabase, then press ENTER to continue..."
read -p ""

echo -e "${GREEN}Step 5: Test Email Configuration${NC}"
echo "----------------------------------------"

# Create a test script
cat > test-email-setup.js << 'EOF'
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailSetup() {
  console.log('🧪 Testing email configuration...')
  
  try {
    // Test with a real email address
    const testEmail = process.argv[2] || 'your-email@gmail.com'
    
    console.log(`📧 Testing with email: ${testEmail}`)
    
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail
    })
    
    if (error) {
      console.error('❌ Email test failed:', error.message)
    } else {
      console.log('✅ Email test successful!')
      console.log('📬 Check your inbox for a verification email')
    }
  } catch (err) {
    console.error('❌ Test error:', err.message)
  }
}

testEmailSetup()
EOF

# Install required dependencies if not present
if ! npm list @supabase/supabase-js > /dev/null 2>&1; then
    echo "📦 Installing required dependencies..."
    npm install @supabase/supabase-js dotenv
fi

echo ""
echo -e "${BLUE}🧪 Ready to test email setup!${NC}"
echo ""
echo -n "📧 Enter your email address for testing: "
read TEST_EMAIL

echo ""
echo "🚀 Running email test..."
node test-email-setup.js "$TEST_EMAIL"

echo ""
echo -e "${GREEN}Step 6: Verification Complete${NC}"
echo "----------------------------------------"
echo "If you received a test email, your SMTP setup is working!"
echo ""
echo -e "${BLUE}🎯 Next Steps:${NC}"
echo "1. Test registration at: http://localhost:9999/register"
echo "2. Use real email addresses (gmail.com, outlook.com, etc.)"
echo "3. Check your inbox for verification emails"
echo ""
echo -e "${GREEN}✅ Email SMTP setup complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Configuration Summary:${NC}"
echo "- SendGrid API Key: Added to .env.local"
echo "- Supabase SMTP: Configured (verify in dashboard)"
echo "- Email Testing: Script created (test-email-setup.js)"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "- SendGrid Dashboard: https://app.sendgrid.com/"
echo "- Supabase Auth Settings: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings"
echo "- Test Registration: http://localhost:9999/register"

# Clean up test files
rm -f test-email-setup.js

echo ""
echo "🎉 Setup complete! Your email verification should now work."