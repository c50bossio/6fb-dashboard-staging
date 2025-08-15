import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export async function POST(request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { domain, provider } = await request.json()
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single()
    
    const emailContent = generateSetupEmail(domain, provider, profile?.full_name)
    
    await sendEmail({
      to: profile?.email || user.email,
      subject: `Setup Instructions for ${domain}`,
      html: emailContent
    })
    
    await supabase.from('domain_setup_emails').insert({
      user_id: user.id,
      domain,
      provider,
      sent_at: new Date().toISOString()
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Setup instructions sent to your email' 
    })
    
  } catch (error) {
    console.error('Error sending setup email:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}

function generateSetupEmail(domain, provider, userName) {
  const dnsRecords = {
    a: { type: 'A', name: '@', value: '76.76.21.21' },
    cname: { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }
  }
  
  const providerInstructions = {
    godaddy: {
      loginUrl: 'https://godaddy.com/login',
      steps: [
        'Go to "My Products" and click "DNS" next to your domain',
        'Delete any existing A records for "@"',
        'Click "Add" and create the records below'
      ]
    },
    namecheap: {
      loginUrl: 'https://www.namecheap.com/myaccount/login',
      steps: [
        'Go to "Domain List" and click "Manage"',
        'Select "Advanced DNS" tab',
        'Add the records below'
      ]
    },
    google: {
      loginUrl: 'https://domains.google.com',
      steps: [
        'Click on your domain name',
        'Select "DNS" from the left menu',
        'Scroll to "Custom resource records" and add the records below'
      ]
    }
  }
  
  const instructions = providerInstructions[provider] || providerInstructions.godaddy
  
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3B82F6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
    .record-box { background: white; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .record-field { margin: 10px 0; }
    .label { font-weight: bold; color: #666; font-size: 12px; }
    .value { font-family: monospace; background: #f0f0f0; padding: 8px; border-radius: 4px; margin-top: 5px; }
    .steps { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Domain Setup Instructions</h1>
      <p style="margin: 10px 0 0 0;">For: ${domain}</p>
    </div>
    
    <div class="content">
      <p>Hi ${userName || 'there'},</p>
      
      <p>Here's how to connect <strong>${domain}</strong> to your BookedBarber page:</p>
      
      <div class="steps">
        <h3 style="margin-top: 0;">📋 Quick Steps:</h3>
        <ol>
          ${instructions.steps.map(step => `<li>${step}</li>`).join('')}
        </ol>
        <a href="${instructions.loginUrl}" class="button">Login to ${provider}</a>
      </div>
      
      <h3>DNS Records to Add:</h3>
      
      <div class="record-box">
        <h4 style="margin-top: 0; color: #3B82F6;">Record 1: A Record</h4>
        <div class="record-field">
          <div class="label">Type:</div>
          <div class="value">A</div>
        </div>
        <div class="record-field">
          <div class="label">Name/Host:</div>
          <div class="value">@</div>
        </div>
        <div class="record-field">
          <div class="label">Value/Points to:</div>
          <div class="value">${dnsRecords.a.value}</div>
        </div>
      </div>
      
      <div class="record-box">
        <h4 style="margin-top: 0; color: #3B82F6;">Record 2: CNAME Record</h4>
        <div class="record-field">
          <div class="label">Type:</div>
          <div class="value">CNAME</div>
        </div>
        <div class="record-field">
          <div class="label">Name/Host:</div>
          <div class="value">www</div>
        </div>
        <div class="record-field">
          <div class="label">Value/Points to:</div>
          <div class="value">${dnsRecords.cname.value}</div>
        </div>
      </div>
      
      <div style="background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <strong>⏰ Timeline:</strong><br>
        • DNS changes take 1-48 hours to work (usually 1-2 hours)<br>
        • You'll get an email when your domain is live<br>
        • Your current BookedBarber link will keep working
      </div>
      
      <h3>Need Help?</h3>
      <p>Simply reply to this email with any questions. Common issues:</p>
      <ul>
        <li><strong>Can't find DNS settings?</strong> Look for "DNS", "Name Servers", or "Zone File"</li>
        <li><strong>Existing records?</strong> It's safe to add our records alongside existing ones</li>
        <li><strong>Using Cloudflare?</strong> Make sure the proxy (orange cloud) is OFF</li>
      </ul>
      
      <p>We'll check your domain automatically every hour and notify you when it's live!</p>
      
      <p>Best regards,<br>The BookedBarber Team</p>
    </div>
    
    <div class="footer">
      <p>You're receiving this because you requested domain setup for ${domain}</p>
      <p>BookedBarber • Making booking simple</p>
    </div>
  </div>
</body>
</html>
  `
}

async function sendEmail({ to, subject, html }) {
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  const msg = {
    to,
    from: 'support@bookedbarber.com',
    subject,
    html
  }
  
  await sgMail.send(msg)
}