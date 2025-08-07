#!/bin/bash

echo "🚀 Deploying 6FB AI Agent System to Staging..."
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo ""
echo "📋 Deployment Steps:"
echo "1. Backend: Deploy FastAPI to Railway"
echo "2. Frontend: Deploy Next.js to Vercel"
echo ""

# Backend deployment
echo "🔧 Step 1: Backend Deployment (Railway)"
echo "========================================"
echo "Please run these commands manually:"
echo ""
echo "railway login"
echo "railway init"
echo "railway add --database postgresql"
echo "railway add --database redis"
echo "railway up"
echo ""
echo "Set environment variables:"
echo "railway variables set ANTHROPIC_API_KEY=your_key"
echo "railway variables set OPENAI_API_KEY=your_key"
echo "railway variables set GOOGLE_AI_API_KEY=your_key"
echo "railway variables set GOOGLE_CLIENT_ID=your_client_id"
echo "railway variables set GOOGLE_CLIENT_SECRET=your_secret"
echo "railway variables set STRIPE_PUBLIC_KEY=your_stripe_key"
echo "railway variables set STRIPE_SECRET_KEY=your_stripe_secret"
echo "railway variables set JWT_SECRET_KEY=your_jwt_secret"
echo "railway variables set SESSION_SECRET=your_session_secret"
echo "railway variables set ENCRYPTION_KEY=your_32_char_encryption_key"
echo "railway variables set FRONTEND_URL=https://6fb-ai-staging.vercel.app"
echo "railway variables set NODE_ENV=production"
echo "railway variables set ENVIRONMENT=staging"
echo ""

# Frontend deployment
echo "🎨 Step 2: Frontend Deployment (Vercel)" 
echo "========================================"
echo "Please run these commands manually:"
echo ""
echo "vercel login"
echo "vercel --prod"
echo ""
echo "Set environment variables in Vercel dashboard:"
echo "- NEXT_PUBLIC_API_URL=https://6fb-ai-backend-staging.railway.app"
echo "- NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id"
echo "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key"
echo ""

echo "✅ Deployment configuration complete!"
echo ""
echo "📝 See detailed guides:"
echo "- Backend: railway-deploy.md"
echo "- Frontend: vercel-deploy.md"
echo ""
echo "🌐 Expected URLs:"
echo "- Frontend: https://6fb-ai-staging.vercel.app"
echo "- Backend API: https://6fb-ai-backend-staging.railway.app"
echo "- API Docs: https://6fb-ai-backend-staging.railway.app/docs"