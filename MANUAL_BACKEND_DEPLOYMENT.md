# Manual Backend Deployment Guide - Reliable Platforms

Since Railway and Render have issues, here are **proven working alternatives**:

## 🥇 Option 1: Heroku (Most Reliable)

### Step 1: Web Deployment
1. Go to https://heroku.com and sign up/login
2. Click "New" → "Create new app"
3. App name: `6fb-ai-backend-staging`
4. Region: United States
5. Click "Create app"

### Step 2: Connect GitHub
1. In the "Deploy" tab, select "GitHub"
2. Connect to your GitHub account
3. Search for: `6fb-dashboard-staging`
4. Click "Connect"
5. Select branch: `staging`
6. Enable "Automatic deploys" ✅

### Step 3: Deploy
1. Click "Deploy Branch"
2. Wait 2-3 minutes for build
3. You'll get a URL like: `https://6fb-ai-backend-staging.herokuapp.com`

**That's it!** Heroku will automatically use our `Procfile` and `requirements.txt`.

## 🥈 Option 2: PythonAnywhere (Python-Specific)

### Step 1: Sign Up
1. Go to https://www.pythonanywhere.com
2. Create free account
3. Go to "Tasks" → "Web"

### Step 2: Create Web App
1. Click "Add a new web app"
2. Choose "Manual configuration"
3. Python version: 3.11
4. Click "Next"

### Step 3: Configure
1. In the "Code" section:
   - Source code: `/home/yourusername/6fb-backend`
   - Working directory: `/home/yourusername/6fb-backend`
2. Upload your files or clone from GitHub
3. Install requirements: `pip3.11 install --user -r requirements.txt`
4. Set WSGI file to point to your `main.py`

## 🥉 Option 3: Glitch (Simple & Fast)

### Step 1: Import Project  
1. Go to https://glitch.com
2. Click "New Project" → "Import from GitHub"
3. Paste: `https://github.com/c50bossio/6fb-dashboard-staging`
4. Branch: `staging`

### Step 2: Configure
1. It will auto-detect Python
2. Modify `requirements.txt` if needed
3. Your app will be live at: `https://your-project-name.glitch.me`

## 🎯 Recommended: Use Heroku

**Why Heroku is best:**
- ✅ **Proven FastAPI support** - millions of Python apps
- ✅ **Zero config needed** - uses our existing files
- ✅ **Reliable uptime** - enterprise infrastructure  
- ✅ **Free tier** - no credit card required
- ✅ **Auto-deploy from GitHub** - push code, get updates
- ✅ **Professional URLs** - herokuapp.com domain

## 🚀 Expected Result

Once deployed to any platform, you'll get:
- **Permanent URL**: `https://your-app-name.platform.com`
- **Health endpoint**: `https://your-app-name.platform.com/health`
- **API root**: `https://your-app-name.platform.com/`

## 🔗 Frontend Integration

Once you have the permanent backend URL:
1. Go to Vercel dashboard: https://vercel.com/dashboard
2. Find your frontend project: `6fb-ai-staging`
3. Go to Settings → Environment Variables
4. Update: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
5. Redeploy frontend

## ⚡ Quick Start: Heroku (5 minutes)

**Just do this:**
1. Go to https://heroku.com
2. Create app: `6fb-ai-backend-staging`  
3. Connect GitHub repo: `c50bossio/6fb-dashboard-staging`
4. Branch: `staging`
5. Deploy

**You'll have a working backend in 5 minutes!**