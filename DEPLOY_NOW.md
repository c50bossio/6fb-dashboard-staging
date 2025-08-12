# 🚀 Deploy to BookedBarber.com - Quick Guide

## 5-Minute Deployment Steps

### Step 1: Prepare (1 minute)
```bash
cd "/Users/bossio/6FB AI Agent System"
npm run build  # Verify build works
```

### Step 2: Deploy (2 minutes)
```bash
# Option A: Use deployment script
./deploy-to-vercel.sh

# Option B: Manual Vercel deploy
npx vercel --prod
```

### Step 3: Configure Domain (1 minute)
In Vercel Dashboard:
1. Go to Settings → Domains
2. Add `bookedbarber.com`
3. Add `www.bookedbarber.com`
4. Follow DNS instructions

### Step 4: Add Environment Variables (1 minute)
In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://dfhqjdoydihajmjxniee.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Dashboard]
```

### Step 5: Test Live Site
1. Visit https://bookedbarber.com
2. Click "Sign In" 
3. Login with: `test@bookedbarber.com` / `Test1234`
4. Verify dashboard loads
5. Test logout

## ✅ That's It!
Your site is now live at bookedbarber.com

## 🔧 Quick Fixes

### If login doesn't work:
- Check environment variables in Vercel
- Verify Supabase keys are correct
- Check browser console for errors

### If site doesn't load:
- Check DNS propagation (can take 5-60 minutes)
- Verify domain configuration in Vercel
- Try www.bookedbarber.com

### If build fails:
```bash
rm -rf .next node_modules
npm install
npm run build
```

## 📞 Test Credentials
- **Email**: test@bookedbarber.com
- **Password**: Test1234

## 🎉 Success!
Your authentication system is live and ready for users!

---
Deploy Time: ~5 minutes
Status: READY TO DEPLOY