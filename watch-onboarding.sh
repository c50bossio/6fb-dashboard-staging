#!/bin/bash

# Real-time onboarding progress monitor
echo "👁️  WATCHING ONBOARDING PROGRESS IN REAL-TIME"
echo "============================================="
echo "Press Ctrl+C to stop"
echo ""

while true; do
  clear
  echo "👁️  ONBOARDING PROGRESS MONITOR"
  echo "================================"
  echo "Time: $(date '+%H:%M:%S')"
  echo ""
  
  node -e "
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    'https://dfhqjdoydihajmjxniee.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c'
  );
  
  async function monitor() {
    const userId = 'bcea9cf9-e593-4dbf-a787-1ed74e04dbf5';
    
    // Get profile status
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step')
      .eq('id', userId)
      .single();
    
    // Get saved progress
    const { data: progress } = await supabase
      .from('onboarding_progress')
      .select('step_name, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    
    console.log('Profile Status:');
    console.log('  Completed: ' + (profile?.onboarding_completed ? '✅ Yes' : '❌ No'));
    console.log('  Current Step: ' + (profile?.onboarding_step || 0));
    console.log('');
    console.log('Saved Steps (' + (progress?.length || 0) + ' total):');
    
    if (progress && progress.length > 0) {
      progress.slice(0, 5).forEach(p => {
        const time = new Date(p.completed_at).toLocaleTimeString();
        console.log('  ✅ ' + p.step_name + ' (saved at ' + time + ')');
      });
    } else {
      console.log('  No steps saved yet...');
    }
  }
  
  monitor().catch(e => console.error('Error:', e.message));
  " 2>/dev/null
  
  sleep 3
done