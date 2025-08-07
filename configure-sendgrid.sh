#!/bin/bash

# 🚀 Quick SendGrid Configuration Script
echo "🚀 Configuring SendGrid for 6FB AI Agent System"
echo "================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}Since you already have a SendGrid account, let's configure it quickly!${NC}"
echo ""

# Get SendGrid API Key
echo -e "${BLUE}📋 Enter your SendGrid API Key:${NC}"
echo "(Find it at: https://app.sendgrid.com/settings/api_keys)"
echo -n "API Key (starts with SG.): "
read SENDGRID_API_KEY

if [[ ! $SENDGRID_API_KEY =~ ^SG\. ]]; then
    echo "❌ Invalid API key format. Should start with 'SG.'"
    exit 1
fi

# Get verified sender email
echo ""
echo -e "${BLUE}📧 Enter your verified sender email:${NC}"
echo "(This should be verified in your SendGrid account)"
echo -n "From Email: "
read SENDGRID_FROM_EMAIL

# Update .env.local
echo ""
echo -e "${GREEN}📝 Updating .env.local with SendGrid configuration...${NC}"

# Replace SendGrid values in .env.local
sed -i '' "s|SENDGRID_API_KEY=.*|SENDGRID_API_KEY=$SENDGRID_API_KEY|" .env.local
sed -i '' "s|SENDGRID_FROM_EMAIL=.*|SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL|" .env.local

echo "✅ Updated .env.local with your SendGrid credentials"
echo ""

# Display Supabase SMTP configuration
echo -e "${YELLOW}📋 Now configure SMTP in Supabase Dashboard:${NC}"
echo ""
echo -e "${BLUE}🔗 Go to: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/auth/settings${NC}"
echo ""
echo "Scroll down to 'SMTP Settings' and enter:"
echo "----------------------------------------"
echo "Host: smtp.sendgrid.net"
echo "Port: 587"
echo "Username: apikey"
echo "Password: $SENDGRID_API_KEY"
echo "Sender Name: 6FB Barbershop System"
echo "Sender Email: $SENDGRID_FROM_EMAIL"
echo ""

echo -e "${GREEN}Press ENTER after you've configured SMTP in Supabase...${NC}"
read

# Test the configuration
echo -e "${BLUE}🧪 Testing SendGrid configuration...${NC}"

# Create a quick test
cat > test-sendgrid.js << 'EOF'
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmail() {
  const testEmail = process.argv[2]
  console.log(`📧 Testing email to: ${testEmail}`)
  
  try {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail
    })
    
    if (error) {
      console.log('❌ Error:', error.message)
    } else {
      console.log('✅ Test email sent successfully!')
      console.log('📬 Check your inbox')
    }
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

testEmail()
EOF

echo -n "📧 Enter your email for testing: "
read TEST_EMAIL

node test-sendgrid.js "$TEST_EMAIL"

# Clean up
rm test-sendgrid.js

echo ""
echo -e "${GREEN}🎉 SendGrid configuration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Check your email inbox for the test message"
echo "2. Try registering at: http://localhost:9999/register"
echo "3. Verification emails should now work!"