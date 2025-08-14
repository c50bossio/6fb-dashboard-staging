const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dfhqjdoydihajmjxniee.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMTI1MzIsImV4cCI6MjA1MDc4ODUzMn0.qOJBWy5BEu6LYo0n2CYjgvYOJHPYC7K5KnL7y2O6Uws';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSignup() {
  console.log('🔄 Testing user registration...');
  
  const timestamp = Date.now();
  const testEmail = `testuser${timestamp}@bookedbarber.com`;
  
  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: 'TestPassword123!',
    options: {
      data: {
        first_name: 'Test',
        last_name: 'User',
        role: 'CLIENT'
      }
    }
  });
  
  if (error) {
    console.error('❌ Registration error:', error);
  } else {
    console.log('✅ Registration successful!');
    console.log('📧 User:', data.user ? data.user.email : 'no user');
    console.log('🔐 Session exists:', Boolean(data.session));
    console.log('📬 Email confirmation required:', Boolean(!data.session && data.user));
    
    if (data.user) {
      console.log('\n📋 User Details:');
      console.log('  ID:', data.user.id);
      console.log('  Email:', data.user.email);
      console.log('  Created:', data.user.created_at);
      console.log('  Metadata:', data.user.user_metadata);
    }
  }
}

testSignup().catch(console.error);