// DIRECT BROWSER TEST - Run in browser console
// This bypasses React Query and tests direct Supabase access

console.log("🔍 Starting direct browser profile test...");

// Test direct Supabase client access
(async () => {
  try {
    // Method 1: Try to get the global Supabase client from window
    let supabase;
    
    if (window.supabase) {
      supabase = window.supabase;
      console.log("✅ Found global supabase client");
    } else {
      // Method 2: Try to create a new client with known credentials
      const { createBrowserClient } = await import('@supabase/ssr');
      supabase = createBrowserClient(
        'https://dfhqjdoydihajmjxniee.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODcwMTAsImV4cCI6MjA2OTY2MzAxMH0.TUYnEBzpB2LQaGLIXg5wtvJHyyhFD2QAOMdY_B-V1fI'
      );
      console.log("✅ Created new supabase client");
    }
    
    // Test 1: Check auth status
    console.log("\n📋 Test 1: Auth Status");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("❌ Auth error:", authError);
      return;
    }
    
    if (user) {
      console.log("✅ User authenticated:", {
        id: user.id,
        email: user.email
      });
    } else {
      console.log("❌ No authenticated user");
      return;
    }
    
    // Test 2: Direct profile query (RLS is disabled)
    console.log("\n📋 Test 2: Direct Profile Query");
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error("❌ Profile query error:", profileError);
      console.error("Error details:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      });
    } else if (profileData) {
      console.log("✅ Profile found:", profileData);
      console.log("🎯 Profile should show:", {
        role: profileData.role,
        name: profileData.full_name,
        shop_id: profileData.barbershop_id
      });
    } else {
      console.log("❌ No profile data returned");
    }
    
    // Test 3: Check React Query cache
    console.log("\n📋 Test 3: React Query Cache Check");
    if (window.__REACT_QUERY_CLIENT__) {
      const queryClient = window.__REACT_QUERY_CLIENT__;
      const cacheData = queryClient.getQueryData(['business-context', 'profile', user.id]);
      console.log("React Query cache for profile:", cacheData);
    } else {
      console.log("⚠️ React Query client not found on window");
    }
    
    // Test 4: Force clear all caches
    console.log("\n📋 Test 4: Cache Clearing");
    if (window.localStorage) {
      const supabaseKeys = Object.keys(localStorage).filter(key => key.includes('supabase'));
      console.log("Supabase localStorage keys:", supabaseKeys);
    }
    
  } catch (error) {
    console.error("💥 Browser test error:", error);
  }
})();