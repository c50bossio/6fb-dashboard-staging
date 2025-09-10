// Debug script to check user authentication and profile data
// Run this with: node debug_user_auth.js

import { createClient } from './lib/supabase/UNIFIED_CLIENT.js';

async function debugUserAuth() {
  console.log("🔍 Starting authentication debug...");
  
  try {
    const supabase = createClient();
    
    // Step 1: Get current session
    console.log("\n📋 Step 1: Getting current session...");
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("❌ Session error:", sessionError);
      return;
    }
    
    if (!session || !session.user) {
      console.log("❌ No active session found. User needs to login.");
      return;
    }
    
    console.log("✅ Session found!");
    console.log("📧 Email:", session.user.email);
    console.log("🆔 User ID:", session.user.id);
    
    // Step 2: Check for profile with authenticated user ID
    console.log("\n📋 Step 2: Checking for profile with authenticated user ID...");
    const { data: correctProfile, error: correctError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (correctError) {
      console.error("❌ Error fetching profile:", correctError);
    } else if (correctProfile) {
      console.log("✅ Profile found with correct user ID:");
      console.log("👤 Name:", correctProfile.full_name);
      console.log("🎭 Role:", correctProfile.role);
      console.log("🏪 Shop ID:", correctProfile.barbershop_id);
    } else {
      console.log("❌ No profile found with authenticated user ID");
    }
    
    // Step 3: Check for profiles with matching email
    console.log("\n📋 Step 3: Checking for profiles with matching email...");
    const { data: emailProfiles, error: emailError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', session.user.email);
    
    if (emailError) {
      console.error("❌ Error fetching email profiles:", emailError);
    } else if (emailProfiles && emailProfiles.length > 0) {
      console.log(`✅ Found ${emailProfiles.length} profile(s) with matching email:`);
      emailProfiles.forEach((profile, index) => {
        console.log(`\n   Profile ${index + 1}:`);
        console.log(`   🆔 ID: ${profile.id}`);
        console.log(`   👤 Name: ${profile.full_name}`);
        console.log(`   🎭 Role: ${profile.role}`);
        console.log(`   🏪 Shop ID: ${profile.barbershop_id}`);
        
        // Check for mismatch
        if (profile.id !== session.user.id) {
          console.log("   ⚠️  USER ID MISMATCH DETECTED!");
        }
      });
    } else {
      console.log("❌ No profiles found with matching email");
    }
    
    // Step 4: Provide fix suggestions
    console.log("\n🔧 DIAGNOSIS:");
    if (correctProfile) {
      console.log("✅ Profile exists with correct user ID - React Query cache issue likely");
      console.log("🔄 Try: Hard refresh browser (Ctrl+Shift+R)");
      console.log("🔄 Try: Click 'Refresh Data' button in RoleDebugger");
    } else if (emailProfiles && emailProfiles.length > 0) {
      const mismatchedProfile = emailProfiles.find(p => p.id !== session.user.id);
      if (mismatchedProfile) {
        console.log("⚠️  USER ID MISMATCH - Profile exists but with wrong user ID");
        console.log("🔧 SQL Fix:");
        console.log(`UPDATE profiles SET id = '${session.user.id}' WHERE id = '${mismatchedProfile.id}';`);
      }
    } else {
      console.log("❌ No profile exists - will be created automatically on next login");
      console.log("🔄 Try: Refresh the browser to trigger profile creation");
    }
    
  } catch (error) {
    console.error("💥 Debug script error:", error);
  }
}

// Run the debug
debugUserAuth();