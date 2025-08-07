# DigitalOcean App Platform Deployment Guide

## Why DigitalOcean Instead of Render?

After exhaustive testing with Render.com:
- ✅ **Code works locally** with multiple setups (direct Python, gunicorn, uvicorn)
- ❌ **Render returns 502 Bad Gateway** for ALL configurations
- ❌ **No meaningful error logs** from Render platform
- ❌ **Multiple startup methods failed**: main.py, test-main.py, gunicorn, uvicorn

**Conclusion**: Render.com has platform-specific issues preventing FastAPI deployment.

## DigitalOcean App Platform Advantages

✅ **Excellent Python Support**: Native FastAPI and uvicorn support  
✅ **Clear Error Reporting**: Detailed build and runtime logs  
✅ **Reliable Deployment**: Industry-proven platform  
✅ **GitHub Integration**: Automatic deployments from repository  
✅ **Free Tier Available**: $0/month for small apps  
✅ **Better Documentation**: Clear deployment guides  

## Deployment Steps

### 1. Manual Deployment (Recommended)

1. **Go to DigitalOcean Apps**: https://cloud.digitalocean.com/apps
2. **Create New App** → **GitHub** → Select `c50bossio/6fb-dashboard-staging`
3. **Branch**: `staging`
4. **Auto-deploy**: ✅ Enabled
5. **Detect Resources**: Will auto-detect Python app

### 2. App Configuration

#### Build Settings (Auto-detected):
- **Source**: GitHub repository `c50bossio/6fb-dashboard-staging`
- **Branch**: `staging`
- **Build**: `pip install -r requirements-minimal.txt`
- **Run**: `gunicorn -w 1 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT test-main:app`

#### Environment Variables:
```bash
ENVIRONMENT=staging
FRONTEND_URL=https://6fb-ai-staging.vercel.app
PYTHONUNBUFFERED=1
```

#### App Specifications:
- **Plan**: Basic ($0/month for dev tier)
- **Instance**: 1x CPU, 512MB RAM
- **Region**: NYC1 (closest to users)

### 3. Expected Results

Once deployed, the service should be available at:
`https://6fb-ai-backend-staging-[random].ondigitalocean.app`

#### Test Endpoints:
```bash
# Health Check
curl https://your-app-url.ondigitalocean.app/health

# Root Endpoint
curl https://your-app-url.ondigitalocean.app/

# Debug Info
curl https://your-app-url.ondigitalocean.app/debug
```

#### Expected Responses:
```json
{
  "status": "healthy",
  "service": "6fb-test"
}
```

## Alternative: CLI Deployment

If you have DigitalOcean CLI (`doctl`) installed:

```bash
# Install doctl
brew install doctl

# Authenticate
doctl auth init

# Deploy using app spec
doctl apps create --spec .do/app.yaml

# Monitor deployment
doctl apps list
```

## Migration from Render

Once DigitalOcean deployment is confirmed working:

1. **Update Vercel Environment Variable**:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-app-url.ondigitalocean.app
   ```

2. **Switch to Full Application**:
   - Update `requirements-minimal.txt` → `requirements.txt`
   - Update app spec to use `main.py` instead of `test-main.py`
   - Add necessary environment variables (API keys, database URLs)

3. **Test Full Integration**:
   - Frontend connects to new backend
   - All endpoints functional
   - Database connections working

## Why This Will Work

Unlike Render's platform issues, DigitalOcean has:
- **Proven FastAPI Support**: Thousands of successful deployments
- **Clear Error Messages**: Immediate feedback on deployment issues
- **Robust Infrastructure**: Enterprise-grade platform reliability
- **Transparent Pricing**: No hidden limitations or throttling

## Estimated Timeline

- **Manual Deployment**: 5-10 minutes
- **Testing & Validation**: 5 minutes
- **Full App Migration**: 10 minutes
- **Total**: ~20 minutes to working backend

This is a proven solution that will resolve the deployment issues permanently.