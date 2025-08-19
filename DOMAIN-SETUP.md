# Setting Up bookbarber.com

## Your Deployment URLs
- **Temporary URL**: https://6fb-ai-dashboard-g563fppbe-6fb.vercel.app
- **Target Domain**: bookbarber.com

## Step 1: Add Domain to Vercel

Run this command:
```bash
vercel domains add bookbarber.com
```

Or via dashboard:
1. Go to: https://vercel.com/6fb/6fb-ai-dashboard/settings/domains
2. Click "Add Domain"
3. Enter: bookbarber.com
4. Click "Add"

## Step 2: Configure DNS Settings

### Option A: If Using Vercel DNS (Easiest)
Vercel will prompt you to transfer your domain. Follow their instructions.

### Option B: If Using External DNS (GoDaddy, Namecheap, etc.)

Add these DNS records to your domain provider:

#### For bookbarber.com (root domain):
| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 |
| AAAA | @ | 2606:4700::6810:84e5 |

#### For www.bookbarber.com:
| Type | Name | Value |
|------|------|-------|
| CNAME | www | cname.vercel-dns.com |

### Option C: Using Cloudflare (Recommended for Performance)
1. Add your domain to Cloudflare
2. Point Cloudflare to Vercel:
   - Type: CNAME
   - Name: @
   - Target: cname.vercel-dns.com
   - Proxy: ON (orange cloud)

## Step 3: Update Environment Variables

Add these to your Vercel project settings:

```bash
# Go to: https://vercel.com/6fb/6fb-ai-dashboard/settings/environment-variables

NEXT_PUBLIC_FRONTEND_URL=https://bookbarber.com
NEXT_PUBLIC_API_URL=https://bookbarber.com
```

## Step 4: Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these URLs:
   - Site URL: `https://bookbarber.com`
   - Redirect URLs:
     - `https://bookbarber.com/auth/callback`
     - `https://www.bookbarber.com/auth/callback`

## Step 5: Update Google OAuth

1. Go to: https://console.cloud.google.com/apis/credentials
2. Edit your OAuth 2.0 Client
3. Add Authorized redirect URIs:
   - `https://bookbarber.com/auth/callback`
   - `https://www.bookbarber.com/auth/callback`

## DNS Propagation Time

- **Vercel DNS**: Instant
- **External DNS**: 5 minutes - 48 hours (usually 1-2 hours)
- **Cloudflare**: 5 minutes

## Verify Setup

Once DNS propagates, test:
1. Visit https://bookbarber.com
2. Check SSL certificate (should be automatic)
3. Test login functionality
4. Verify OAuth works

## Troubleshooting

### "Invalid Host Header" Error
Add to next.config.js:
```javascript
module.exports = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Host',
            value: 'bookbarber.com',
          },
        ],
      },
    ]
  },
}
```

### SSL Certificate Issues
- Vercel provides automatic SSL
- If issues, go to: https://vercel.com/6fb/6fb-ai-dashboard/settings/domains
- Click "Refresh" next to your domain

### OAuth Redirect Issues
Make sure ALL these match exactly:
- Supabase redirect URLs
- Google OAuth redirect URIs
- Your actual domain (with/without www)

## Success Checklist

- [ ] Domain added to Vercel
- [ ] DNS records configured
- [ ] Environment variables updated
- [ ] Supabase URLs updated
- [ ] Google OAuth updated
- [ ] SSL certificate active
- [ ] Site loads at bookbarber.com
- [ ] Login/OAuth works