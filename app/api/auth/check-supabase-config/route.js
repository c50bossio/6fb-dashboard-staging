import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  try {
    // Check auth settings
    const settingsResponse = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { 'apikey': supabaseAnonKey }
    })
    
    const settings = await settingsResponse.json()
    
    // Check if Google is properly configured
    const googleEnabled = settings.external_providers?.includes('google')
    const hasGoogleProvider = settings.external?.google !== undefined
    
    return NextResponse.json({
      supabase_project: supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1],
      auth_settings: {
        external_providers: settings.external_providers || [],
        google_enabled: googleEnabled,
        has_google_config: hasGoogleProvider,
        site_url: settings.site_url,
        redirect_urls: settings.redirect_urls,
        auth_url: `${supabaseUrl}/auth/v1`
      },
      oauth_urls: {
        google_oauth: `${supabaseUrl}/auth/v1/authorize?provider=google`,
        expected_callback: `${supabaseUrl}/auth/v1/callback`,
        test_redirect: `${process.env.NEXT_PUBLIC_APP_URL || 'https://bookedbarber.com'}/auth/test-supabase-oauth`
      },
      checklist: {
        '✅ Supabase URL configured': !!supabaseUrl,
        '✅ Supabase Anon Key configured': !!supabaseAnonKey,
        [`${googleEnabled ? '✅' : '❌'} Google provider enabled`]: googleEnabled,
        '✅ Auth endpoint accessible': settingsResponse.ok
      },
      next_steps: !googleEnabled ? [
        '1. Go to Supabase Dashboard → Authentication → Providers',
        '2. Enable Google provider',
        '3. Add Google Client ID and Secret from Google Cloud Console',
        '4. Save the configuration'
      ] : [
        'Google is enabled. If OAuth still fails, check:',
        '1. Google Cloud Console has correct redirect URI',
        '2. Supabase has correct Google Client ID/Secret',
        '3. Try the test page at /auth/test-supabase-oauth'
      ]
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check Supabase configuration',
      message: error.message,
      troubleshooting: [
        'Check if Supabase project is active',
        'Verify environment variables are correct',
        'Ensure Supabase URL is accessible'
      ]
    }, { status: 500 })
  }
}