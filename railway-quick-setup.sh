#!/bin/bash

echo "🚀 Railway Quick Setup - Copy/Paste Commands"
echo "============================================="
echo ""
echo "📂 Run these commands one by one:"
echo ""

cat << 'EOF'
# 1. Login to Railway (opens browser)
railway login

# 2. Initialize project
railway init --name 6fb-ai-backend-staging

# 3. Add services
railway add --database postgresql
railway add --database redis

# 4. Set basic environment variables
railway variables set NODE_ENV=production
railway variables set ENVIRONMENT=staging
railway variables set FRONTEND_URL=https://6fb-ai-staging-e4khuvrut-6fb.vercel.app
railway variables set ALLOWED_ORIGINS=https://6fb-ai-staging-e4khuvrut-6fb.vercel.app

# 5. Deploy
railway up

# 6. Check status
railway status
EOF

echo ""
echo "🔑 After deployment, add your API keys:"
echo ""

cat << 'EOF'
# AI API Keys
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set OPENAI_API_KEY=your_key
railway variables set GOOGLE_AI_API_KEY=your_key

# Google OAuth
railway variables set GOOGLE_CLIENT_ID=your_client_id
railway variables set GOOGLE_CLIENT_SECRET=your_client_secret

# Stripe
railway variables set STRIPE_PUBLIC_KEY=your_stripe_public_key  
railway variables set STRIPE_SECRET_KEY=your_stripe_secret_key

# Security
railway variables set JWT_SECRET_KEY=your_jwt_secret
railway variables set SESSION_SECRET=your_session_secret
railway variables set ENCRYPTION_KEY=your_32_char_key
EOF

echo ""
echo "✅ That's it! Your backend will be live at:"
echo "https://6fb-ai-backend-staging.railway.app"