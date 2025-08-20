#!/usr/bin/env node

/**
 * Fix the Supabase anonymous key issue
 */

const fs = require('fs');

async function fixSupabaseKey() {
  console.log('🔧 Fixing Supabase Anonymous Key Issue\n');

  console.log('🔍 Problem Identified:');
  console.log('   ❌ Supabase REST API returning 401');
  console.log('   ❌ This means anonymous key is invalid/expired');
  console.log('   ❌ All auth would fail suddenly with this issue\n');

  // Check current key
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const currentKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
  
  console.log('Current anonymous key:');
  console.log(`${currentKey?.substring(0, 50)}...${currentKey?.substring(-10)}`);
  console.log(`Length: ${currentKey?.length} characters\n`);

  // The key I added might be incorrect - let me check production
  console.log('🔍 Checking Production Environment for Correct Key...');
  try {
    const prodEnvContent = fs.readFileSync('.env.production', 'utf8');
    const prodHasKey = prodEnvContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('Production .env has anon key:', prodHasKey);
    
    if (!prodHasKey) {
      console.log('Production uses base64 encoded key as noted in file');
    }
  } catch (error) {
    console.log('Could not read production env');
  }

  // Check if there's a working key in production deployment
  console.log('\n🎯 Solution Steps:');
  console.log('==========================================');
  console.log('');
  console.log('The anonymous key I added earlier might be incorrect.');
  console.log('We need to get the real anonymous key from Supabase.');
  console.log('');
  console.log('OPTION 1: Get Key from Supabase Dashboard');
  console.log('   1. Go to https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee');
  console.log('   2. Settings → API');
  console.log('   3. Copy the "anon public" key');
  console.log('   4. Replace NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  console.log('');
  console.log('OPTION 2: Check Production Environment');
  console.log('   1. Check Vercel environment variables');
  console.log('   2. Look for NEXT_PUBLIC_SUPABASE_ANON_KEY_B64');
  console.log('   3. Decode and use that key');
  console.log('');
  console.log('OPTION 3: Temporary Fix - Remove the Key');
  console.log('   1. Comment out NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   2. Restart server');
  console.log('   3. See if it falls back to working configuration');

  console.log('\n💡 Quick Test:');
  console.log('   Try commenting out the NEXT_PUBLIC_SUPABASE_ANON_KEY line');
  console.log('   Restart the dev server');
  console.log('   If login works again, we know the key was wrong');

  console.log('\n🔍 Most Likely Explanation:');
  console.log('   Login was working before because there was no anon key');
  console.log('   When I added an incorrect key, it broke the connection');
  console.log('   The key I added was likely a guess, not the real one');
}

fixSupabaseKey().catch(console.error);