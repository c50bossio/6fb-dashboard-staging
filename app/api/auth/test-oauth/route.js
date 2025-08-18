import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Get the production URL
  const productionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'
  
  return NextResponse.json({
    status: 'OAuth Configuration Check',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseAnonKey,
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NOT SET',
      productionUrl
    },
    redirectUrls: {
      primary: `${productionUrl}/auth/callback`,
      secondary: `${productionUrl}/auth/callback-v2`,
      localhost: 'http://localhost:9999/auth/callback',
      vercelPreview: 'https://*.vercel.app/auth/callback'
    },
    supabaseConfiguration: {
      note: 'These URLs must be added to your Supabase project under Authentication > URL Configuration',
      siteUrl: productionUrl,
      redirectUrls: [
        `${productionUrl}/auth/callback`,
        `${productionUrl}/auth/callback-v2`,
        'http://localhost:9999/auth/callback',
        'http://localhost:3000/auth/callback',
        'https://*.vercel.app/auth/callback',
        'https://6fb-ai-dashboard-*.vercel.app/auth/callback'
      ]
    },
    googleOAuthSetup: {
      step1: 'Go to Supabase Dashboard > Authentication > Providers',
      step2: 'Enable Google provider',
      step3: 'Add Google Client ID and Secret from Google Cloud Console',
      step4: 'Set Authorized redirect URIs in Google Cloud Console',
      googleRedirectUri: `${supabaseUrl}/auth/v1/callback`,
      note: 'The Google redirect URI should point to your Supabase project, not your app'
    },
    debugInfo: {
      currentTime: Date.now(),
      headers: {
        host: 'Will be set by request',
        origin: 'Will be set by request'
      }
    }
  })
}