# Railway Deployment Guide

## Quick Railway Setup

1. **Login to Railway** (manual step required):
   ```bash
   railway login
   ```

2. **Initialize Railway project**:
   ```bash
   railway init
   # Select: "Deploy from GitHub repo"
   # Choose: c50bossio/6fb-dashboard-staging
   # Branch: staging
   ```

3. **Add PostgreSQL database**:
   ```bash
   railway add --database postgresql
   ```

4. **Add Redis cache**:
   ```bash
   railway add --database redis
   ```

5. **Set environment variables**:
   ```bash
   railway variables set ANTHROPIC_API_KEY=your_key_here
   railway variables set OPENAI_API_KEY=your_key_here  
   railway variables set GOOGLE_AI_API_KEY=your_key_here
   railway variables set GOOGLE_CLIENT_ID=your_client_id
   railway variables set GOOGLE_CLIENT_SECRET=your_client_secret
   railway variables set STRIPE_PUBLIC_KEY=your_stripe_key
   railway variables set STRIPE_SECRET_KEY=your_stripe_secret
   railway variables set JWT_SECRET_KEY=your_jwt_secret
   railway variables set SESSION_SECRET=your_session_secret
   railway variables set ENCRYPTION_KEY=your_32_char_key
   railway variables set FRONTEND_URL=https://6fb-ai-staging.vercel.app
   railway variables set NODE_ENV=production
   railway variables set ENVIRONMENT=staging
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

## Auto-Generated Environment Variables

Railway will automatically provide:
- `DATABASE_URL` (PostgreSQL connection string)
- `REDIS_URL` (Redis connection string) 
- `PORT` (assigned port for the service)

## Health Check Endpoint

The backend includes a health check at `/health` for Railway monitoring.

## Deployment Commands

```bash
# Deploy current code
railway up

# View live logs  
railway logs --follow

# Connect to database
railway connect postgresql

# Check service status
railway status

# Open deployed URL
railway open
```

## Configuration Files

- `Procfile`: Defines the start command
- `nixpacks.toml`: Build configuration for Railway
- `railway.json`: Service configuration and environment setup
- `requirements.txt`: Python dependencies

## Expected URLs

- **Backend API**: `https://6fb-ai-backend-staging.railway.app`
- **Health Check**: `https://6fb-ai-backend-staging.railway.app/health`
- **API Docs**: `https://6fb-ai-backend-staging.railway.app/docs`