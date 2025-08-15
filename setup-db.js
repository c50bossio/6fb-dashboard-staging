const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  console.log('Testing Supabase connection...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('Expected error (tables not created):', error.message)
      console.log('\nProject Reference:', supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1])
      console.log('\nDirect SQL Editor Link:')
      console.log(`https://supabase.com/dashboard/project/${supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]}/sql/new`)
    } else {
      console.log('Tables already exist!')
    }
  } catch (err) {
    console.error('Connection error:', err)
  }
}

testConnection()