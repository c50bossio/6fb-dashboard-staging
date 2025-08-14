// Test Supabase connection and OAuth providers
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

console.log('🔍 Testing Supabase OAuth configuration...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 50) + '...');

async function testOAuth() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('\n🚀 Testing Google OAuth...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:9999/api/auth/callback',
      }
    });
    
    if (error) {
      console.error('❌ OAuth Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ OAuth Success:', data);
    }
    
  } catch (err) {
    console.error('💥 Exception:', err.message);
  }
}

testOAuth();