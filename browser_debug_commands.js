/**
 * Browser Console Debug Commands
 * Copy and paste these into the browser developer console while logged in
 * 
 * Instructions:
 * 1. Open your 6FB AI Agent System in the browser
 * 2. Make sure you're logged in as c50bossio@gmail.com  
 * 3. Open Developer Tools (F12)
 * 4. Go to the Console tab
 * 5. Copy and paste each command one at a time
 */

// Command 1: Get current authenticated user
console.log("🔍 Getting authenticated user...");
const { createClient } = await import('/lib/supabase/UNIFIED_CLIENT.js');
const supabase = createClient();
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError) {
  console.error("❌ Auth error:", authError);
} else if (user) {
  console.log("✅ Authenticated user:", {
    id: user.id,
    email: user.email,
    lastSignIn: user.last_sign_in_at
  });
  window.currentUserId = user.id; // Save for next commands
} else {
  console.log("❌ No authenticated user");
}

// Command 2: Check for profile with correct user ID
console.log("🔍 Checking for profile with authenticated user ID...");
const { data: correctProfile, error: correctError } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', window.currentUserId)
  .maybeSingle();
  
if (correctError) {
  console.error("❌ Error fetching profile:", correctError);
} else if (correctProfile) {
  console.log("✅ Profile found with correct ID:", correctProfile);
  console.log("🎯 The profile exists! Check React Query cache or component rendering.");
} else {
  console.log("❌ No profile found with authenticated user ID");
}

// Command 3: Check for profiles with matching email
console.log("🔍 Checking for profiles with matching email...");
const { data: emailProfiles, error: emailError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', user.email);
  
if (emailError) {
  console.error("❌ Error fetching profiles by email:", emailError);
} else if (emailProfiles?.length > 0) {
  console.log(`✅ Found ${emailProfiles.length} profile(s) with matching email:`, emailProfiles);
  
  const mismatchedProfile = emailProfiles.find(p => p.id !== user.id);
  if (mismatchedProfile) {
    console.error("⚠️ USER ID MISMATCH DETECTED!");
    console.log("Profile exists with wrong user ID:", mismatchedProfile);
    console.log("🔧 Fix SQL command:");
    console.log(`UPDATE profiles SET id = '${user.id}' WHERE id = '${mismatchedProfile.id}';`);
  }
} else {
  console.log("❌ No profiles found with matching email");
}

// Command 4: Check ENTERPRISE_OWNER profiles
console.log("🔍 Checking for ENTERPRISE_OWNER profiles...");
const { data: enterpriseProfiles, error: enterpriseError } = await supabase
  .from('profiles')
  .select('*')
  .eq('role', 'ENTERPRISE_OWNER');
  
if (enterpriseError) {
  console.error("❌ Error fetching ENTERPRISE_OWNER profiles:", enterpriseError);
} else if (enterpriseProfiles?.length > 0) {
  console.log("✅ Found ENTERPRISE_OWNER profiles:", enterpriseProfiles);
} else {
  console.log("❌ No ENTERPRISE_OWNER profiles found");
}

// Command 5: Test profile creation manually (if no profile found)
if (!correctProfile) {
  console.log("🔧 Testing profile creation...");
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      email: user.email,
      full_name: user.email.split('@')[0],
      role: 'ENTERPRISE_OWNER',
      subscription_tier: 'enterprise',
      subscription_status: 'active'
    }, {
      onConflict: 'id',
      ignoreDuplicates: false
    })
    .select()
    .single();
    
  if (createError) {
    console.error("❌ Profile creation error:", createError);
  } else {
    console.log("✅ Profile created successfully:", newProfile);
    console.log("🔄 Refresh the page to see the changes");
  }
}