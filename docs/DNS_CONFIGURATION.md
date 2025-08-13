# DNS Configuration for staging.bookedbarber.com

## Required DNS Records

To point staging.bookedbarber.com to the Vercel deployment, add these DNS records to your domain provider:

### Option 1: CNAME Record (Recommended)
```
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
TTL: 3600 (or Auto)
```

### Option 2: A Records (If CNAME not supported)
```
Type: A
Name: staging
Value: 76.76.21.21
TTL: 3600 (or Auto)
```

## Vercel Configuration

1. Go to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/domains
2. Click "Add Domain"
3. Enter: `staging.bookedbarber.com`
4. Select the staging branch as the Git branch
5. Vercel will verify the DNS records

## Current Deployment URLs

- **Staging (Vercel Auto-generated)**: https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app/
- **Staging (Custom Domain)**: https://staging.bookedbarber.com/ (pending DNS)
- **Production (Future)**: https://bookedbarber.com/

## DNS Propagation

After adding DNS records:
- DNS changes typically propagate within 5-30 minutes
- Full global propagation can take up to 48 hours
- Use https://dnschecker.org to verify propagation

## SSL Certificate

Vercel automatically provisions SSL certificates once DNS is configured correctly.

## Troubleshooting

If domain doesn't work after DNS propagation:
1. Verify DNS records with: `nslookup staging.bookedbarber.com`
2. Check Vercel domain settings for any errors
3. Ensure no conflicting DNS records exist
4. Try removing and re-adding the domain in Vercel

## Status
- ✅ Vercel deployment working
- ✅ Auto-generated URL accessible
- ⏳ Custom domain DNS configuration pending
- ⏳ SSL certificate pending (auto-provisions after DNS)