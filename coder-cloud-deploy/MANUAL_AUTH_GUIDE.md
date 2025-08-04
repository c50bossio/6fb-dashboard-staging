# Railway Authentication Guide

Since automated login isn't working in this environment, please follow these manual steps:

## Step 1: Authenticate with Railway

**Option A: New Terminal Window**
1. Open a **new terminal window** (⌘+T on Mac)
2. Run: `railway login`
3. This will open your browser for authentication
4. Sign in with GitHub/Google/Email
5. Return to this terminal and continue

**Option B: Web Authentication**
1. Visit: https://railway.app/login
2. Sign in with your preferred method
3. Go to: https://railway.app/account/tokens
4. Create a new token
5. Run: `export RAILWAY_TOKEN=your_token_here`

## Step 2: Verify Authentication
```bash
railway whoami
```
Should show your Railway username.

## Step 3: Deploy
Once authenticated, run the deployment:
```bash
cd "/Users/bossio/6FB AI Agent System/coder-cloud-deploy"
./deploy-now.sh
```

## Alternative: Manual Railway Steps

If the script still doesn't work, run these commands manually:

```bash
# 1. Create project
railway init --name "coder-6fb-$(date +%s)"

# 2. Set environment variables
railway variables set CODER_TELEMETRY=false
railway variables set PORT=7080
railway variables set CODER_HTTP_ADDRESS="0.0.0.0:7080"

# 3. Deploy
railway up --detach

# 4. Get URL
railway status
```

The deployment URL will be shown in the output!