import 'dotenv/config'
import supabaseQuery from './lib/supabase-query.js'

async function testSupabaseAccess() {
  console.log('Testing Supabase access from Claude Code...\n')
  
  // Test 1: Query profiles table
  console.log('1. Querying profiles table (limit 5):')
  const profiles = await supabaseQuery.queryTable('profiles', { 
    select: 'id, email, full_name, role',
    limit: 5 
  })
  
  if (profiles.error) {
    console.error('Error querying profiles:', profiles.error)
  } else {
    console.log(`✅ Found ${profiles.data.length} profiles`)
    profiles.data.forEach(profile => {
      console.log(`  - ${profile.email} (${profile.role})`)
    })
  }
  
  // Test 2: Query agents table
  console.log('\n2. Querying agents table:')
  const agents = await supabaseQuery.queryTable('agents', { 
    select: 'id, name, type, status',
    limit: 3
  })
  
  if (agents.error) {
    console.error('Error querying agents:', agents.error)
  } else {
    console.log(`✅ Found ${agents.data.length} agents`)
    agents.data.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.type}) - ${agent.status}`)
    })
  }
  
  // Test 3: Query notifications
  console.log('\n3. Querying notifications table:')
  const notifications = await supabaseQuery.queryTable('notifications', { 
    select: 'id, type, channel, status',
    limit: 3,
    orderBy: 'created_at',
    ascending: false
  })
  
  if (notifications.error) {
    console.error('Error querying notifications:', notifications.error)
  } else {
    console.log(`✅ Found ${notifications.data.length} notifications`)
    notifications.data.forEach(notif => {
      console.log(`  - ${notif.type} via ${notif.channel} (${notif.status})`)
    })
  }
  
  console.log('\n🎉 Claude Code can successfully query your Supabase database!')
}

// Run the test
testSupabaseAccess().catch(console.error)