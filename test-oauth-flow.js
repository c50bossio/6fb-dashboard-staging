// Test OAuth flow with proper cookie handling
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI';

console.log('🔍 Testing OAuth PKCE flow...\n');

async function testPKCEFlow() {
  try {
    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: {
          getItem: (key) => {
            console.log(`📖 Storage GET: ${key}`);
            return null; // Simulating no existing session
          },
          setItem: (key, value) => {
            console.log(`💾 Storage SET: ${key}`);
            console.log(`   Value preview: ${value?.substring(0, 100)}...`);
            
            // Check if this is the code verifier
            if (key.includes('code-verifier')) {
              console.log('🔑 CODE VERIFIER DETECTED!');
              console.log('   Full key:', key);
              console.log('   Value length:', value?.length);
            }
          },
          removeItem: (key) => {
            console.log(`🗑️ Storage REMOVE: ${key}`);
          }
        }
      }
    });

    console.log('🚀 Initiating OAuth with Google...\n');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:9999/api/auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    
    if (error) {
      console.error('❌ OAuth Error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ OAuth initiated successfully!');
      console.log('📍 Redirect URL:', data?.url);
      
      // Parse the URL to see what parameters are included
      if (data?.url) {
        const url = new URL(data.url);
        console.log('\n📊 OAuth URL Parameters:');
        for (const [key, value] of url.searchParams) {
          console.log(`   ${key}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
        }
        
        // Check if state parameter is present (should contain flow state)
        const state = url.searchParams.get('state');
        if (state) {
          console.log('\n🔍 State parameter found (contains flow state)');
          console.log('   Length:', state.length);
        }
      }
    }
    
  } catch (err) {
    console.error('💥 Exception:', err.message);
    console.error(err.stack);
  }
}

testPKCEFlow();