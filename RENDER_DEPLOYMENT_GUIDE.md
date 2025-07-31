# Render.com Deployment Guide

## Quick Setup Instructions

### 1. Create Render Account
- Go to [render.com](https://render.com)
- Sign up with GitHub account
- Connect your GitHub repository: `c50bossio/6fb-dashboard-staging`

### 2. Deploy from Dashboard
1. Click **"New +"** → **"Web Service"**
2. Connect repository: `c50bossio/6fb-dashboard-staging`
3. Branch: `staging`
4. **Render will auto-detect render.yaml** ✅

### 3. Alternative: Deploy with Render CLI
```bash
# Install Render CLI (optional)
npm install -g @render/cli

# Deploy (if CLI installed)
render deploy --service-type=web
```

### 4. Environment Variables (Add in Render Dashboard)
**Required API Keys** (add via Render Dashboard > Environment):
```
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
STRIPE_PUBLIC_KEY=your_stripe_public_key
STRIPE_SECRET_KEY=your_stripe_secret_key
JWT_SECRET_KEY=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key
```

**Auto-configured** (from render.yaml):
```
ENVIRONMENT=staging
FRONTEND_URL=https://6fb-ai-staging.vercel.app
NODE_ENV=production
```

## Configuration Files

### ✅ render.yaml (Auto-detected)
```yaml
services:
  - type: web
    name: 6fb-ai-backend-staging
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: python start-render.py
    envVars:
      - key: ENVIRONMENT
        value: staging
      - key: FRONTEND_URL
        value: https://6fb-ai-staging.vercel.app
      - key: NODE_ENV
        value: production
    autoDeploy: true
```

### ✅ start-render.py (Start Script)
```python
#!/usr/bin/env python3
import os
import sys
import subprocess

def main():
    port = os.getenv('PORT', '8000')
    print(f"Starting 6FB AI Agent System Backend on port {port}")
    
    cmd = [
        sys.executable, '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', port
    ]
    
    subprocess.run(cmd)

if __name__ == "__main__":
    main()
```

## Expected Deployment URLs

After successful deployment:
- **Backend API**: `https://6fb-ai-backend-staging.onrender.com`
- **Health Check**: `https://6fb-ai-backend-staging.onrender.com/health`
- **API Docs**: `https://6fb-ai-backend-staging.onrender.com/docs`

## Database Setup (Render Dashboard)

Render will auto-create:
1. **PostgreSQL Database**: `6fb-ai-postgres-staging`
2. **Redis Cache**: `6fb-ai-redis-staging` (if needed)

Database connection will be auto-injected as `DATABASE_URL` environment variable.

## Advantages Over Railway

✅ **More Reliable**: Better Python application support  
✅ **Better Logs**: Clearer build and runtime logs  
✅ **Faster Builds**: Usually builds in 2-3 minutes  
✅ **Auto-Detection**: Properly detects Python applications  
✅ **Free Tier**: 750 hours/month free (same as Railway)  

## Monitoring Deployment

1. **Build Logs**: Available in Render Dashboard
2. **Runtime Logs**: Real-time application logs
3. **Metrics**: Built-in performance monitoring

## Troubleshooting

### Build Fails
- Check `requirements.txt` for invalid dependencies
- Verify Python version compatibility (3.11)

### App Won't Start
- Check `start-render.py` syntax
- Verify `main.py` imports correctly
- Check environment variables

### Database Connection Issues
- Verify `DATABASE_URL` is auto-injected
- Check database service is running

## Next Steps After Deployment

1. **Test Endpoints**: Verify `/health` and `/docs` work
2. **Update Vercel**: Update `NEXT_PUBLIC_API_URL` to Render URL
3. **Add SSL**: Render provides free SSL automatically
4. **Monitor**: Set up alerts for downtime

## Rollback Plan

If Render deployment fails:
- Railway deployment remains active at `https://6fb-ai-backend-staging.railway.app`
- Can switch frontend back to Railway URL in Vercel environment variables
- No data loss (using external PostgreSQL)