import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: users, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, role')
  .limit(10)

if (error) {
  console.log('Error:', error.message)
  console.log('Trying auth.users...')
  
  // Try auth schema
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  console.log('Auth users:', JSON.stringify(authUsers, null, 2))
} else {
  console.log('Profiles found:', JSON.stringify(users, null, 2))
}
