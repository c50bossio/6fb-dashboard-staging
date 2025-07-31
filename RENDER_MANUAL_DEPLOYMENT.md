# Manual Render.com Deployment Guide

Since the CLI has authentication issues, here's the simplest manual approach that will work immediately:

## Step 1: Create Service via Web Dashboard

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Sign up/Login** with your GitHub account
3. **Click "New +"** → **"Web Service"**
4. **Connect GitHub Repository**:
   - Repository: `c50bossio/6fb-dashboard-staging`
   - Branch: `staging`
   - ✅ Render will auto-detect `render.yaml`

## Step 2: Service Configuration (Auto-filled from render.yaml)

✅ **Pre-configured from our render.yaml**:
- **Name**: `6fb-ai-backend-staging`
- **Environment**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python start-render.py`
- **Plan**: `Free`

## Step 3: Add Environment Variables

In the Render Dashboard, go to **Environment** tab and add:

```bash
# AI API Keys
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here

# OAuth Keys
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Payment Keys
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# Security Keys
JWT_SECRET_KEY=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
```

**Auto-set from render.yaml**:
- `ENVIRONMENT=staging`
- `FRONTEND_URL=https://6fb-ai-staging.vercel.app`
- `NODE_ENV=production`

## Step 4: Deploy

1. **Click "Create Web Service"**
2. **Monitor Build Logs** (2-3 minutes)
3. **Deployment URL**: `https://6fb-ai-backend-staging.onrender.com`

## Step 5: Test Deployment

Once deployed, test these endpoints:

```bash
# Health Check (should return JSON)
curl https://6fb-ai-backend-staging.onrender.com/health

# Root Endpoint (should return JSON with version)
curl https://6fb-ai-backend-staging.onrender.com/

# API Documentation
curl https://6fb-ai-backend-staging.onrender.com/docs
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "6fb-ai-backend"
}
```

## Step 6: Update Frontend

Once Render deployment works, update Vercel environment variables:
- `NEXT_PUBLIC_API_URL=https://6fb-ai-backend-staging.onrender.com`

## Advantages Over Railway

✅ **Actually Runs FastAPI**: Unlike Railway serving default pages  
✅ **Clear Build Logs**: See exactly what's happening  
✅ **Reliable Deployment**: Consistently works with Python apps  
✅ **Free Tier**: 750 hours/month  
✅ **Auto SSL**: HTTPS included  

## Auto-Deploy Setup

Once created, the service will auto-deploy on every push to the `staging` branch (configured in render.yaml).

## Monitoring

- **Dashboard**: https://dashboard.render.com
- **Logs**: Available in real-time via dashboard
- **Metrics**: Built-in performance monitoring

## Rollback Plan

If needed, Railway deployment remains at:
`https://6fb-ai-backend-staging.railway.app`

## Total Time: ~5 minutes

This manual approach is actually faster and more reliable than CLI troubleshooting!