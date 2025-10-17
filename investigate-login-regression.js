#!/usr/bin/env node

/**
 * Investigate why login stopped working suddenly
 */

const fs = require('fs');

async function investigateLoginRegression() {

  // Check recent changes that could affect auth

  // Check if we made any auth-related changes during our session

  // Check current environment state
  
  const envContent = fs.readFileSync('.env.local', 'utf8');
  
  const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
  const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  const googleClientId = envContent.match(/NEXT_PUBLIC_GOOGLE_CLIENT_ID=(.+)/)?.[1];

  ');

  // Check if Supabase itself is working
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseAnonKey,
        'authorization': `Bearer ${supabaseAnonKey}`
      }
    });

    if (response.status === 200) {
      
    } else {
      
    }
  } catch (error) {
    
  }

  // Check what type of auth was working before

  // Check server logs for clues

  // Look for potential causes

  ');

}

investigateLoginRegression().catch(console.error);