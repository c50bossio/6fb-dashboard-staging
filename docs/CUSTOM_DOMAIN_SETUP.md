# Custom Domain Setup Guide for staging.bookedbarber.com

## Step-by-Step Instructions

### 1. Configure DNS at Your Domain Provider

#### For GoDaddy:
1. Log into GoDaddy account
2. Go to "My Products" → Find your domain
3. Click "DNS" next to bookedbarber.com
4. Click "ADD" button
5. Select Type: CNAME
6. Enter:
   - Name: `staging`
   - Value: `cname.vercel-dns.com`
   - TTL: 1 hour
7. Click "Save"

#### For Namecheap:
1. Sign in to Namecheap
2. Go to "Domain List"
3. Click "Manage" next to bookedbarber.com
4. Select "Advanced DNS"
5. Click "ADD NEW RECORD"
6. Enter:
   - Type: CNAME Record
   - Host: `staging`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic
7. Click "Save Changes"

#### For Cloudflare:
1. Log into Cloudflare
2. Select bookedbarber.com
3. Go to "DNS" tab
4. Click "Add record"
5. Enter:
   - Type: CNAME
   - Name: `staging`
   - Target: `cname.vercel-dns.com`
   - Proxy status: DNS only (gray cloud)
   - TTL: Auto
6. Click "Save"

#### For Google Domains:
1. Sign in to Google Domains
2. Click on bookedbarber.com
3. Navigate to "DNS" on the left menu
4. Scroll to "Custom records"
5. Enter:
   - Host name: `staging`
   - Type: CNAME
   - TTL: 3600
   - Data: `cname.vercel-dns.com`
6. Click "Add"

### 2. Add Domain to Vercel

1. Go to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/domains
2. Click "Add" button
3. Enter: `staging.bookedbarber.com`
4. Click "Add"
5. Vercel will show "Invalid Configuration" initially - this is normal
6. Select which Git branch to connect:
   - Choose: `staging` branch
7. Click "Save"

### 3. Wait for DNS Propagation

DNS changes take time to propagate globally:
- **Typically**: 5-30 minutes
- **Maximum**: Up to 48 hours
- **Cloudflare**: Usually instant if using their DNS

### 4. Verify DNS Configuration

Check if DNS is configured correctly:

```bash
# Check DNS records (run in terminal)
nslookup staging.bookedbarber.com

# Should return something like:
# staging.bookedbarber.com  canonical name = cname.vercel-dns.com
# cname.vercel-dns.com      address = 76.76.21.21
```

Or use online tools:
- https://dnschecker.org - Check global DNS propagation
- https://www.whatsmydns.net - Alternative DNS checker
- https://mxtoolbox.com/SuperTool.aspx - Comprehensive DNS tools

### 5. Verify in Vercel

1. Return to: https://vercel.com/c50bossios-projects/6fb-ai-dashboard/settings/domains
2. You should see:
   - ✅ staging.bookedbarber.com (Valid Configuration)
   - If still showing ❌ Invalid, wait longer for DNS propagation

### 6. SSL Certificate

Vercel automatically provisions SSL certificates once DNS is verified:
- **Automatic**: SSL provisioned within minutes after DNS verification
- **Free**: Included with all Vercel deployments
- **Auto-renewal**: Certificates renew automatically

## Troubleshooting

### "Invalid Configuration" in Vercel
- **Cause**: DNS hasn't propagated yet
- **Solution**: Wait 5-30 minutes and refresh

### DNS Record Not Found
```bash
# Check if you added the record correctly
dig staging.bookedbarber.com CNAME

# Should show:
# staging.bookedbarber.com. 3600 IN CNAME cname.vercel-dns.com.
```

### SSL Certificate Error
- **Cause**: Certificate still provisioning
- **Solution**: Wait 5-10 minutes after domain verification

### Site Not Loading
1. Clear browser cache
2. Try incognito/private browsing
3. Check DNS propagation at https://dnschecker.org
4. Verify record in domain provider's dashboard

### Conflicting Records
- **Issue**: Can't have both A and CNAME for same subdomain
- **Solution**: Remove any existing A records for "staging"

## Quick Verification Commands

```bash
# Check CNAME record
dig staging.bookedbarber.com CNAME

# Check final IP resolution
ping staging.bookedbarber.com

# Check SSL certificate
curl -I https://staging.bookedbarber.com

# Full DNS trace
dig +trace staging.bookedbarber.com
```

## Expected Timeline

1. **0-5 minutes**: Add DNS record at provider
2. **5-30 minutes**: DNS propagation begins
3. **10-35 minutes**: Vercel detects and verifies domain
4. **15-40 minutes**: SSL certificate provisioned
5. **20-45 minutes**: Site accessible at https://staging.bookedbarber.com

## Final URLs

Once configured:
- **Staging**: https://staging.bookedbarber.com
- **Vercel URL** (always works): https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app/
- **API Health**: https://staging.bookedbarber.com/api/health

## Support Contacts

- **Vercel Support**: https://vercel.com/support
- **Domain Provider Support**: Check your provider's support page
- **DNS Issues**: Use provider's live chat for fastest resolution