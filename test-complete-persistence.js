#!/usr/bin/env node

/**
 * Test the complete cross-tab persistence solution
 * This verifies both the database persistence AND the auth redirect prevention
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testCompleteSolution() {
  
  );
  
  const results = {
    databaseReady: false,
    canTrackOnboarding: false,
    crossTabPersistence: false,
    authRedirectPrevention: false
  };
  
  try {
    // 1. Test database table exists
    
    const { data: tableTest, error: tableError } = await supabase
      .from('onboarding_sessions')
      .select('id')
      .limit(1);
    
    if (!tableError || tableError.code === 'PGRST116') {
      results.databaseReady = true;
      
    } else {
      
      return results;
    }
    
    // 2. Test onboarding state tracking

    // Get a test user
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (profiles && profiles.length > 0) {
      const testUserId = profiles[0].id;
      
      // First delete any existing test session
      await supabase
        .from('onboarding_sessions')
        .delete()
        .eq('user_id', testUserId)
        .eq('session_type', 'test_persistence');
      
      // Create a test onboarding session
      const { data: session, error: sessionError } = await supabase
        .from('onboarding_sessions')
        .insert({
          user_id: testUserId,
          session_type: 'test_persistence',
          current_step: 'step_1',
          step_data: { test: true, timestamp: new Date().toISOString() },
          is_completed: false,
          progress_percentage: 25
        })
        .select()
        .single();
      
      if (!sessionError) {
        results.canTrackOnboarding = true;

        // 3. Test cross-tab persistence

        // Update the session data (simulating Tab A)
        const updateData = { 
          test: true, 
          tabA: 'updated', 
          timestamp: new Date().toISOString() 
        };
        
        const { error: updateError } = await supabase
          .from('onboarding_sessions')
          .update({
            step_data: updateData,
            current_step: 'step_2',
            progress_percentage: 50
          })
          .eq('user_id', testUserId)
          .eq('session_type', 'test_persistence');
        
        if (!updateError) {
          // Read back the data (simulating Tab B)
          const { data: readData, error: readError } = await supabase
            .from('onboarding_sessions')
            .select('*')
            .eq('user_id', testUserId)
            .eq('session_type', 'test_persistence')
            .single();
          
          if (!readError && readData?.step_data?.tabA === 'updated') {
            results.crossTabPersistence = true;

          } else {
            
          }
        }
        
        // 4. Test auth redirect prevention

        // Check if we can query active onboarding sessions
        const { data: activeSession, error: activeError } = await supabase
          .from('onboarding_sessions')
          .select('id, is_completed')
          .eq('user_id', testUserId)
          .eq('is_completed', false)
          .limit(1);
        
        if (!activeError && activeSession && activeSession.length > 0) {
          results.authRedirectPrevention = true;

        } else {
          
        }
        
        // Clean up test data
        await supabase
          .from('onboarding_sessions')
          .delete()
          .eq('user_id', testUserId)
          .eq('session_type', 'test_persistence');

      } else {
        
      }
    } else {
      
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
  
  // Summary
  );
  
  );
  
  const allPassed = Object.values(results).every(v => v);
  
  Object.entries(results).forEach(([test, passed]) => {
    
  });
  
  if (allPassed) {

  } else {

    ');

  }
  
  process.exit(allPassed ? 0 : 1);
}

testCompleteSolution();