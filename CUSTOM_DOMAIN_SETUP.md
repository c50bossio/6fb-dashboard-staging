# Custom Domain Setup Guide

## Overview
This guide explains how to make custom domains fully functional for barbershop booking pages.

## Current Implementation
✅ **What's Working Now:**
- Custom domain field in onboarding flow
- Domain name stored in `barbershops.custom_domain` column
- UI for entering custom domain during setup

❌ **What's Needed for Full Functionality:**
- DNS configuration
- SSL certificate provisioning
- Domain verification
- Routing configuration

## Full Implementation Requirements

### 1. Domain Verification Service
```javascript
// /app/api/domains/verify/route.js
export async function POST(request) {
  const { domain } = await request.json()
  
  // Step 1: Generate verification TXT record
  const verificationCode = generateVerificationCode()
  
  // Step 2: Store in database
  await supabase.from('domain_verifications').insert({
    domain,
    verification_code: verificationCode,
    status: 'pending'
  })
  
  // Step 3: Return DNS instructions
  return {
    txtRecord: `bookedbarber-verify=${verificationCode}`,
    instructions: 'Add this TXT record to your DNS'
  }
}
```

### 2. DNS Configuration Instructions
Users need to configure their DNS with:
- **A Record**: Points to your server IP
- **CNAME Record**: Points to bookedbarber.com
- **TXT Record**: For domain verification

### 3. SSL Certificate Automation
```javascript
// Using Let's Encrypt with Certbot or Caddy
async function provisionSSL(domain) {
  // Automatic SSL certificate generation
  const cert = await certbot.generate({
    domain,
    email: user.email,
    webroot: '/var/www/certbot'
  })
  
  // Store certificate info
  await supabase.from('ssl_certificates').insert({
    domain,
    certificate: cert.certificate,
    expires_at: cert.expiresAt
  })
}
```

### 4. Nginx/Caddy Configuration
```nginx
# /etc/nginx/sites-available/custom-domains
server {
    server_name ~^(?<domain>.+)$;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Custom-Domain $domain;
    }
    
    ssl_certificate /etc/letsencrypt/live/$domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$domain/privkey.pem;
}
```

### 5. Next.js Middleware for Domain Routing
```javascript
// /middleware.js
export async function middleware(request) {
  const hostname = request.headers.get('host')
  
  // Check if it's a custom domain
  if (!hostname.includes('bookedbarber.com')) {
    // Look up barbershop by custom domain
    const { data: shop } = await supabase
      .from('barbershops')
      .select('*')
      .eq('custom_domain', hostname)
      .single()
    
    if (shop) {
      // Rewrite to barbershop page
      return NextResponse.rewrite(
        new URL(`/shop/${shop.shop_slug}`, request.url)
      )
    }
  }
}
```

## Implementation Options

### Option 1: Vercel (Easiest)
Vercel provides built-in custom domain support:
1. User adds domain in Vercel dashboard
2. Vercel handles SSL automatically
3. Use Vercel API to manage domains programmatically

```javascript
// Using Vercel API
const { data } = await fetch('https://api.vercel.com/v9/projects/your-project/domains', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${VERCEL_API_TOKEN}`,
  },
  body: JSON.stringify({
    name: customDomain,
  }),
})
```

### Option 2: Cloudflare for SaaS
Cloudflare offers custom domain support for SaaS:
1. Set up Cloudflare for SaaS
2. Use Cloudflare API to add custom hostnames
3. Automatic SSL provisioning

```javascript
// Using Cloudflare API
await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_hostnames`, {
  method: 'POST',
  headers: {
    'X-Auth-Email': CF_EMAIL,
    'X-Auth-Key': CF_API_KEY,
  },
  body: JSON.stringify({
    hostname: customDomain,
    ssl: {
      method: 'http',
      type: 'dv',
    },
  }),
})
```

### Option 3: Self-Hosted (Most Control)
1. Use Caddy server for automatic SSL
2. Implement domain verification workflow
3. Dynamic Nginx/Caddy configuration updates

## Database Schema Addition
```sql
-- Add to existing barbershops table (already done)
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS domain_verified_at TIMESTAMP WITH TIME ZONE;

-- New table for domain management
CREATE TABLE domain_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES barbershops(id),
  domain VARCHAR(255) NOT NULL,
  verification_code VARCHAR(100),
  verification_method VARCHAR(20) DEFAULT 'txt', -- txt, cname, file
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, failed
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## UI Components Needed

### Domain Setup Wizard
```javascript
// /components/DomainSetupWizard.js
export default function DomainSetupWizard({ barbershopId }) {
  const [step, setStep] = useState('enter') // enter, verify, complete
  
  return (
    <div>
      {step === 'enter' && <EnterDomain />}
      {step === 'verify' && <VerifyDomain />}
      {step === 'complete' && <SetupComplete />}
    </div>
  )
}
```

### Domain Management Dashboard
```javascript
// /app/dashboard/domains/page.js
export default function DomainsPage() {
  return (
    <div>
      <h2>Custom Domain Settings</h2>
      <DomainStatus />
      <DNSInstructions />
      <SSLCertificateInfo />
    </div>
  )
}
```

## Recommended Implementation Path

### Phase 1: Basic Setup (Current)
✅ Store custom domain in database
✅ Display in onboarding flow
✅ Show in barbershop settings

### Phase 2: Vercel Integration (Quickest)
- Use Vercel's custom domain API
- Automatic SSL provisioning
- Simple DNS setup

### Phase 3: Full Self-Service (Advanced)
- Domain verification workflow
- DNS configuration checker
- SSL certificate management
- Subdomain support

## Cost Considerations
- **Vercel**: $20/month for custom domains
- **Cloudflare for SaaS**: $0.10 per hostname/month
- **Self-hosted**: Server costs + maintenance

## Security Considerations
1. Validate domain ownership before activation
2. Implement rate limiting on domain changes
3. Monitor for domain hijacking attempts
4. Regular SSL certificate renewal
5. DNSSEC support for enhanced security

## Testing Strategy
1. Test with subdomain first (test.yourdomain.com)
2. Verify SSL certificate installation
3. Test booking flow on custom domain
4. Monitor for DNS propagation
5. Test domain removal/change workflow

## Support Documentation for Users
1. How to buy a domain
2. DNS configuration guide (with screenshots)
3. Common DNS providers setup:
   - GoDaddy
   - Namecheap
   - Google Domains
   - Cloudflare
4. Troubleshooting guide
5. SSL certificate FAQ

## Quick Start with Vercel (Recommended)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy to Vercel
vercel

# 3. Add custom domain via API or Dashboard
vercel domains add customer-domain.com

# 4. User configures DNS:
# A Record: 76.76.21.21 (Vercel IP)
# or CNAME: cname.vercel-dns.com
```

## Monitoring & Analytics
- Track custom domain usage
- Monitor SSL certificate expiration
- DNS resolution monitoring
- Traffic analytics per domain
- Domain performance metrics

## Future Enhancements
1. Subdomain support (shop1.barbershop.com)
2. Multiple domains per barbershop
3. Domain aliases and redirects
4. Internationalized domain names (IDN)
5. Domain marketplace for premium names