# 🚀 Vercel Production Setup Guide (August 2025)

## Current Status
✅ **Staging**: Successfully deployed at https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app/
⏳ **Production**: Ready to configure

---

## 📍 Finding Your Project

Since the direct URL isn't working, let's navigate manually:

### Option 1: From Dashboard Home
1. **Go to**: https://vercel.com/dashboard
2. **Look for**: "6fb-ai-dashboard" project
3. **Click** on the project name

### Option 2: Search
1. **Go to**: https://vercel.com/dashboard
2. **Use search bar** at the top
3. **Type**: "6fb"
4. **Click** on your project

---

## 🎯 Step 1: Change Production Branch

Once you're in your project:

1. **Click** "Settings" tab (top of page)
2. **In left sidebar**, click "Git" 
3. **Find** "Production Branch" section
4. **Change from**: `staging`
5. **Change to**: `production`
6. **Click** "Save"

### Alternative Path:
1. **Click** "Settings" tab
2. **Click** "Environments" in sidebar
3. **Find** "Production" section
4. **Look for** "Branch Tracking"
5. **Change** the branch to `production`

---

## 🌐 Step 2: Add Production Domains

### In Settings:
1. **Click** "Domains" in left sidebar
2. **Click** "Add" button
3. **Enter**: `bookedbarber.com`
4. **Select Branch**: `production`
5. **Click** "Add"

### Repeat for WWW:
6. **Click** "Add" again
7. **Enter**: `www.bookedbarber.com`
8. **Select Branch**: `production`
9. **Click** "Add"

---

## 🔑 Step 3: Production Environment Variables

### In Settings:
1. **Click** "Environment Variables" in sidebar
2. For each variable below, **click Edit** (pencil icon)
3. **Ensure** "Production" checkbox is checked
4. **Update** values as needed:

### Critical Production Variables:
```
STRIPE_SECRET_KEY → Use your live key (sk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY → Use your live key (pk_live_...)
```

### Verify These Are Set for Production:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY  
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- ANTHROPIC_API_KEY

---

## 🚦 Step 4: Deploy to Production

Once settings are saved:

### Manual Deploy (Immediate):
1. **Go to** main project page
2. **Click** "..." menu next to latest deployment
3. **Select** "Promote to Production"

### Automatic Deploy (Next Push):
```bash
# In your terminal:
git checkout production
git pull origin production
echo "# Production Live" >> README.md
git add .
git commit -m "chore: trigger production deployment"
git push origin production
```

---

## ✅ Step 5: Verify Production

### After deployment (2-3 minutes):
```bash
# Test API health
curl https://bookedbarber.com/api/health

# Or visit in browser
open https://bookedbarber.com
```

---

## 🔧 Troubleshooting

### Can't Find Project?
- Your account: c50bossio@gmail.com
- Project should be under "c50bossios-projects" team
- Try: https://vercel.com/c50bossios-projects

### Settings Not Saving?
- Make sure you're clicking "Save" after each change
- Refresh the page to confirm changes persisted

### Domain Shows "Invalid Configuration"?
- This is normal! DNS is already set in Cloudflare
- Wait 5-10 minutes for validation

### 404 on Production?
- Production branch needs to deploy first
- Check "Deployments" tab for build status
- First deployment takes 2-3 minutes

---

## 📊 Success Indicators

You'll know it's working when:
1. ✅ Production branch shows `production` (not `staging`)
2. ✅ Domains show "Valid Configuration" 
3. ✅ Latest deployment says "Production"
4. ✅ https://bookedbarber.com loads your app

---

## 🆘 Still Having Issues?

If the settings page won't load:
1. **Try logging out** and back in: https://vercel.com/logout
2. **Clear browser cache** and cookies for vercel.com
3. **Try incognito/private mode**
4. **Try different browser** (Chrome recommended)

The key navigation path is:
**Dashboard → Your Project → Settings → Git/Domains/Environment Variables**