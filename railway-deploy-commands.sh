#!/bin/bash

echo "🚀 Railway Backend Deployment - Step by Step"
echo "============================================="
echo ""
echo "📂 Current directory: $(pwd)"
echo "🔗 GitHub repo: https://github.com/c50bossio/6fb-dashboard-staging.git"
echo "🌿 Branch: staging"
echo ""

# Step 1: Login
echo "Step 1: Login to Railway"
echo "------------------------"
echo "Running: railway login"
echo ""
railway login
echo ""

# Step 2: Initialize project
echo "Step 2: Initialize Railway project"
echo "-----------------------------------"
echo "This will connect to your GitHub staging repo..."
echo ""
railway init --name 6fb-ai-backend-staging
echo ""

# Step 3: Add services
echo "Step 3: Add database services"
echo "------------------------------"
echo "Adding PostgreSQL database..."
railway add --database postgresql
echo ""
echo "Adding Redis cache..."
railway add --database redis
echo ""

# Step 4: Set environment variables
echo "Step 4: Setting environment variables"
echo "------------------------------------"
echo "Setting production environment variables..."

# Core environment
railway variables set NODE_ENV=production
railway variables set ENVIRONMENT=staging
railway variables set FRONTEND_URL=https://6fb-ai-staging-e4khuvrut-6fb.vercel.app

# AI API Keys (you'll need to provide these)
echo ""
echo "🔑 Please set your AI API keys:"
echo "railway variables set ANTHROPIC_API_KEY=your_anthropic_key_here"
echo "railway variables set OPENAI_API_KEY=your_openai_key_here"
echo "railway variables set GOOGLE_AI_API_KEY=your_google_ai_key_here"
echo ""

# Google OAuth
echo "🔑 Please set your Google OAuth credentials:"
echo "railway variables set GOOGLE_CLIENT_ID=your_google_client_id"
echo "railway variables set GOOGLE_CLIENT_SECRET=your_google_client_secret"
echo ""

# Stripe
echo "🔑 Please set your Stripe keys:"
echo "railway variables set STRIPE_PUBLIC_KEY=your_stripe_public_key"
echo "railway variables set STRIPE_SECRET_KEY=your_stripe_secret_key"
echo ""

# Security
echo "🔑 Please set your security keys:"
echo "railway variables set JWT_SECRET_KEY=your_jwt_secret_key"
echo "railway variables set SESSION_SECRET=your_session_secret"
echo "railway variables set ENCRYPTION_KEY=your_32_char_encryption_key"
echo ""

# CORS
railway variables set ALLOWED_ORIGINS=https://6fb-ai-staging-e4khuvrut-6fb.vercel.app,https://6fb-ai-backend-staging.railway.app

echo "Step 5: Deploy to Railway"
echo "-------------------------"
echo "Deploying backend to Railway..."
railway up
echo ""

echo "Step 6: Get deployment URL"
echo "---------------------------"
railway status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your backend should be available at:"
echo "https://6fb-ai-backend-staging.railway.app"
echo ""
echo "📚 API Documentation:"
echo "https://6fb-ai-backend-staging.railway.app/docs"
echo ""
echo "🔍 Health Check:"
echo "https://6fb-ai-backend-staging.railway.app/health"
echo ""
echo "📊 Railway Dashboard:"
echo "https://railway.app/project/[your-project-id]"