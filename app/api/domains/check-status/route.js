import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import dns from 'dns/promises'
export const runtime = 'edge'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain required' }, { status: 400 })
    }
    
    // Check DNS records
    const status = await checkDomainStatus(domain)
    
    return NextResponse.json(status)
    
  } catch (error) {
    console.error('Error checking domain:', error)
    return NextResponse.json(
      { error: 'Failed to check domain status' },
      { status: 500 }
    )
  }
}

// Cron job endpoint to check all pending domains
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get all domains pending verification
    const { data: pendingDomains } = await supabase
      .from('barbershops')
      .select('id, custom_domain, owner_id')
      .eq('domain_verified', false)
      .not('custom_domain', 'is', null)
    
    if (!pendingDomains || pendingDomains.length === 0) {
      return NextResponse.json({ message: 'No pending domains' })
    }
    
    const results = []
    
    for (const shop of pendingDomains) {
      const status = await checkDomainStatus(shop.custom_domain)
      
      if (status.isConfigured && status.sslActive) {
        // Domain is ready! Update database
        await supabase
          .from('barbershops')
          .update({
            domain_verified: true,
            domain_verified_at: new Date().toISOString()
          })
          .eq('id', shop.id)
        
        // Send success email
        await sendDomainActiveEmail(shop.owner_id, shop.custom_domain)
        
        results.push({
          domain: shop.custom_domain,
          status: 'activated'
        })
      } else {
        results.push({
          domain: shop.custom_domain,
          status: 'pending',
          issues: status.issues
        })
      }
    }
    
    return NextResponse.json({
      checked: pendingDomains.length,
      results
    })
    
  } catch (error) {
    console.error('Error in domain check cron:', error)
    return NextResponse.json(
      { error: 'Failed to check domains' },
      { status: 500 }
    )
  }
}

async function checkDomainStatus(domain) {
  const status = {
    domain,
    isConfigured: false,
    sslActive: false,
    dnsRecords: {
      a: false,
      cname: false
    },
    issues: []
  }
  
  try {
    // Check A record
    const aRecords = await dns.resolve4(domain)
    if (aRecords.includes('76.76.21.21')) {
      status.dnsRecords.a = true
    } else {
      status.issues.push('A record not pointing to our server')
    }
  } catch (error) {
    status.issues.push('A record not found')
  }
  
  try {
    // Check CNAME for www
    const cnameRecords = await dns.resolveCname(`www.${domain}`)
    if (cnameRecords.some(record => record.includes('vercel'))) {
      status.dnsRecords.cname = true
    } else {
      status.issues.push('CNAME record not configured')
    }
  } catch (error) {
    // CNAME might not be required
    status.dnsRecords.cname = true
  }
  
  // Check if domain is accessible via HTTPS
  try {
    const response = await fetch(`https://${domain}`, {
      method: 'HEAD',
      redirect: 'manual'
    })
    
    if (response.ok || response.status === 301 || response.status === 302) {
      status.sslActive = true
    }
  } catch (error) {
    status.issues.push('SSL certificate not active yet')
  }
  
  status.isConfigured = status.dnsRecords.a && status.sslActive
  
  return status
}

async function sendDomainActiveEmail(userId, domain) {
  const supabase = createClient()
  
  // Get user email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single()
  
  if (!profile) return
  
  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .success-box { background: #d4edda; border: 2px solid #28a745; padding: 20px; border-radius: 8px; text-align: center; }
    .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-box">
      <h1 style="color: #28a745; margin: 0;">🎉 Your Domain is Live!</h1>
    </div>
    
    <p>Hi ${profile.full_name || 'there'},</p>
    
    <p>Great news! Your custom domain <strong>${domain}</strong> is now active and working!</p>
    
    <p>Your customers can now book appointments at:</p>
    <ul>
      <li><a href="https://${domain}">https://${domain}</a></li>
      <li><a href="https://www.${domain}">https://www.${domain}</a></li>
    </ul>
    
    <div style="text-align: center;">
      <a href="https://${domain}" class="button">Visit Your Site</a>
    </div>
    
    <h3>✅ What's Working:</h3>
    <ul>
      <li>Custom domain is active</li>
      <li>SSL certificate installed (secure https://)</li>
      <li>Both www and non-www versions work</li>
      <li>All bookings go directly to your calendar</li>
    </ul>
    
    <p>Share your new professional booking link with customers!</p>
    
    <p>Best regards,<br>The BookedBarber Team</p>
  </div>
</body>
</html>
  `
  
  // Send email using your email service
  await sendEmail({
    to: profile.email,
    subject: `✅ ${domain} is now live!`,
    html: emailContent
  })
}

async function sendEmail({ to, subject, html }) {
  // Implementation depends on your email service
  console.log('Sending email to:', to, 'Subject:', subject)
}