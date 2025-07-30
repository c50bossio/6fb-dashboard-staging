# Vercel Frontend Deployment Guide

## Quick Vercel Setup

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to staging**:
   ```bash
   # From project root
   vercel --prod --yes
   # Choose: Link to existing project? No
   # Project name: 6fb-ai-staging
   # Directory: ./
   # Override settings? No
   ```

4. **Set environment variables**:
   ```bash
   vercel env add NEXT_PUBLIC_API_URL production
   # Value: https://6fb-ai-backend-staging.railway.app
   
   vercel env add NEXT_PUBLIC_GOOGLE_CLIENT_ID production
   # Value: your_google_client_id
   
   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production  
   # Value: your_stripe_publishable_key
   ```

5. **Redeploy with environment variables**:
   ```bash
   vercel --prod
   ```

## Expected URLs

- **Frontend**: `https://6fb-ai-staging.vercel.app`
- **API Proxy**: `https://6fb-ai-staging.vercel.app/api/*` → `https://6fb-ai-backend-staging.railway.app/*`

## Configuration

- `vercel.json`: Deployment configuration with API rewrites
- `next.config.mjs`: Next.js configuration 
- Environment variables managed through Vercel dashboard

## Development Commands

```bash
# Local development
npm run dev

# Build and test locally
npm run build
npm run start

# Deploy to staging
vercel --prod

# View deployment logs
vercel logs
```

## API Integration

The frontend automatically proxies API calls:
- Frontend calls: `/api/bookings` 
- Proxied to: `https://6fb-ai-backend-staging.railway.app/bookings`

This avoids CORS issues and provides seamless integration.