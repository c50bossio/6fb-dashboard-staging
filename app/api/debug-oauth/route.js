import { NextResponse } from 'next/server';

export async function GET(request) {
  const { createClient } = await import('@supabase/supabase-js');
  
  // Test server-side configuration
  const serverUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Use structured logging instead of console.log for production safety
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Server-side OAuth debug');
    console.log('Server URL:', serverUrl);
    console.log('Server Key:', serverKey?.substring(0, 50) + '...');
  }
  
  try {
    const supabase = createClient(serverUrl, serverKey);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:9999/api/auth/callback',
      }
    });
    
    const result = {
      serverSide: {
        url: serverUrl,
        keyPrefix: serverKey?.substring(0, 50),
        oauthResult: error ? { error: error.message } : { success: true, url: data.url },
        timestamp: new Date().toISOString()
      }
    };
    
    return NextResponse.json(result);
    
  } catch (err) {
    return NextResponse.json({
      serverSide: {
        error: err.message,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}