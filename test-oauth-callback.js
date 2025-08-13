// Simple test to debug OAuth callback issues
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dfhqjdoydihajmjxniee.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
);

async function testOAuthCallback() {
  console.log('🧪 Testing OAuth callback flow...');
  
  // Test 1: Check if our environment variables are set
  console.log('\n1. Environment Variables:');
  console.log('  GOOGLE_CLIENT_ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  console.log('  NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || 'DEFAULT');
  
  // Test 2: Test state verification
  console.log('\n2. State Verification Test:');
  const testState = 'eyJkYXRhIjoie1wiYmFyYmVyc2hvcF9pZFwiOlwiMGIyZDc1MjQtNDliYy00N2RiLTkyMGQtZGI5Yzk4MjJjNDE2XCIsXCJ1c2VyX2lkXCI6XCIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTFcIixcInRpbWVzdGFtcFwiOjE3NTUwNDMzMDM4OTN9Iiwic2lnbmF0dXJlIjoiMzYzMjVmYTQ2OWIzZWZhNjA4YjFmZWZlMGE4ZWEyMDgwYmVmNDEzMzdhYWNhYjJhNzNmYWVlMTQ0NDQzYzk2NCJ9';
  
  try {
    const decoded = JSON.parse(Buffer.from(testState, 'base64').toString());
    console.log('  State decodes successfully:', JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.log('  ❌ State decode failed:', error.message);
  }
  
  // Test 3: Check Google token exchange endpoint
  console.log('\n3. Google Token Exchange Test:');
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: 'test_code',
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/gmb/oauth/callback`
      })
    });
    
    const result = await response.text();
    console.log('  Response status:', response.status);
    console.log('  Response:', result.substring(0, 200));
  } catch (error) {
    console.log('  ❌ Token exchange failed:', error.message);
  }
  
  // Test 4: Database connection
  console.log('\n4. Database Connection Test:');
  try {
    const { data, error } = await supabase
      .from('barbershops')
      .select('id, name')
      .eq('id', '0b2d7524-49bc-47db-920d-db9c9822c416')
      .single();
    
    if (error) {
      console.log('  ❌ Database query failed:', error.message);
    } else {
      console.log('  ✅ Database connection working:', data?.name || 'Found shop');
    }
  } catch (error) {
    console.log('  ❌ Database connection failed:', error.message);
  }
}

testOAuthCallback().catch(console.error);