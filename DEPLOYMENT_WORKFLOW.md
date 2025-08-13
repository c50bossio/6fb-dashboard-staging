# 6FB AI Agent System - Deployment Workflow

## 🚀 Current Deployment Setup

Your project uses **Vercel** with automatic deployments:
- **Production:** bookedbarber.com (main branch)
- **Preview:** Auto-generated URLs for feature branches
- **Development:** localhost:9999

## 📋 Recommended Workflow

### Option 1: Simple Direct Deploy (Current Method)
**Best for:** Small changes, bug fixes, quick updates

```bash
# 1. Make changes locally
# 2. Test on localhost:9999
# 3. Commit and push to main
git add .
git commit -m "feat: description of changes"
git push

# ✅ Automatically deploys to bookedbarber.com
```

### Option 2: Preview-First Deploy (Recommended for Major Changes)
**Best for:** New features, major updates, experimental changes

```bash
# 1. Create feature branch
git checkout -b feature/new-dashboard-feature

# 2. Make changes and test locally
# 3. Push feature branch
git push origin feature/new-dashboard-feature

# 4. Vercel automatically creates preview URL
# Preview URL: https://6fb-ai-dashboard-abc123.vercel.app

# 5. Test on preview URL
# 6. If good, merge to main
git checkout main
git merge feature/new-dashboard-feature
git push

# ✅ Deploys to production (bookedbarber.com)
```

## 🎯 Prompts to Use with Claude

### For Small Updates:
```
"Update the [specific feature] and deploy directly to production. 
Test locally first, then commit and push to main."
```

### For Major Features:
```
"Create a new feature branch for [feature name]. 
Implement [description], test on preview URL, 
then merge to production when ready."
```

### For Experimental Changes:
```
"Create a feature branch to experiment with [idea]. 
Deploy to Vercel preview for testing before 
deciding whether to merge to production."
```

## 🛠️ Deployment Commands

### Quick Deploy (Direct to Production)
```bash
# Standard workflow you've been using
git add .
git commit -m "feat: your changes here"
git push
```

### Preview Deploy (Safer for Major Changes)
```bash
# Create and push feature branch
git checkout -b feature/feature-name
# ... make changes ...
git add .
git commit -m "feat: new feature"
git push origin feature/feature-name

# Get preview URL from Vercel dashboard or CLI
npx vercel --prod=false
```

### Emergency Rollback
```bash
# If something breaks in production
git revert HEAD
git push
# Or rollback in Vercel dashboard
```

## 🌐 Environment URLs

### Development:
- **URL:** http://localhost:9999
- **Database:** Supabase (same as production)
- **Environment:** Development (.env.local)

### Preview (Feature Branches):
- **URL:** https://6fb-ai-dashboard-[hash].vercel.app
- **Database:** Supabase production (be careful!)
- **Environment:** Preview environment variables

### Production:
- **URL:** https://bookedbarber.com
- **Database:** Supabase production
- **Environment:** Production environment variables

## ⚠️ Important Considerations

### Database Sharing:
All environments use the **same Supabase database**. This means:
- ✅ Real data testing
- ⚠️ Be careful with destructive operations
- ⚠️ Test data changes affect production

### Environment Variables:
- **Production:** Set in Vercel dashboard
- **Preview:** Inherits from production settings
- **Development:** Stored in .env.local

## 🎯 Recommended Workflow by Change Type

### 🐛 Bug Fixes:
```
1. Fix locally
2. Test on localhost:9999
3. Direct push to main
4. Auto-deploy to bookedbarber.com
```

### ✨ New Features:
```
1. Create feature branch
2. Develop and test locally
3. Push to feature branch
4. Test on Vercel preview URL
5. Merge to main when ready
6. Auto-deploy to production
```

### 🧪 Experiments:
```
1. Create experimental branch
2. Implement changes
3. Deploy to preview URL
4. Share with stakeholders
5. Decide: merge or abandon
```

### 🚨 Hotfixes:
```
1. Create hotfix branch from main
2. Make minimal fix
3. Test quickly
4. Direct merge to main
5. Immediate production deployment
```

## 🔧 Vercel CLI Commands

```bash
# Deploy to preview
npx vercel

# Deploy to production
npx vercel --prod

# Check deployment status
npx vercel ls

# Get deployment logs
npx vercel logs [deployment-url]
```

## 📊 Monitoring Deployments

### Vercel Dashboard:
- Real-time deployment status
- Build logs and errors
- Performance metrics
- Rollback options

### Health Checks:
- **Production:** https://bookedbarber.com/api/health
- **Preview:** https://preview-url.vercel.app/api/health

## 🎯 Best Practices

1. **Always test locally first**
2. **Use preview URLs for major features**
3. **Keep commits small and focused**
4. **Write descriptive commit messages**
5. **Monitor deployment success**
6. **Have rollback plan ready**

---

**Summary:** For most updates, your current direct-push workflow works great. For major features or experiments, use feature branches and preview URLs first.