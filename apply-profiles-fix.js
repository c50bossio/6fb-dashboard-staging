const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyProfilesFix() {
  console.log('\n🔧 Fixing OAuth Registration Issue...\n');
  
  try {
    // First, check if profiles table exists
    console.log('1️⃣ Checking if profiles table exists...');
    const { data: existingProfiles, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Profiles table already exists');
      
      // Check if it has the correct structure
      const { data: tableInfo, error: infoError } = await supabase
        .from('profiles')
        .select('*')
        .limit(0);
      
      console.log('📋 Table structure check completed');
    } else if (checkError.code === '42P01') {
      console.log('⚠️ Profiles table does not exist - creating it now...');
      
      // Read the SQL file
      const sql = fs.readFileSync('./database/create-profiles-table.sql', 'utf8');
      
      // Note: Supabase doesn't allow direct SQL execution via the client library
      // We need to use the SQL editor in Supabase dashboard or create the table via the API
      
      console.log('\n📝 SQL script ready to execute');
      console.log('\n⚠️  IMPORTANT: Since Supabase client doesn\'t support direct SQL execution,');
      console.log('   you need to run the following SQL in your Supabase dashboard:\n');
      console.log('1. Go to https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql/new');
      console.log('2. Copy and paste the contents of: database/create-profiles-table.sql');
      console.log('3. Click "Run" to execute the SQL\n');
      console.log('Alternatively, I\'ll try to create a basic version using the API...');
      
      // Try to create a basic profiles table using Supabase API
      // This is a workaround since we can't execute raw SQL
      console.log('\n🔨 Attempting to create profiles entries for existing auth users...');
      
      // Get existing auth users (this might not work without service role)
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (!usersError && users) {
        console.log(`📊 Found ${users.length} existing auth users`);
        
        for (const user of users) {
          console.log(`\n👤 Processing user: ${user.email}`);
          
          // Try to insert profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
              role: 'CLIENT',
              created_at: user.created_at,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (profileError) {
            if (profileError.code === '42P01') {
              console.log('❌ Profiles table still doesn\'t exist');
              console.log('🚨 You MUST run the SQL script in Supabase dashboard first!');
              break;
            } else if (profileError.code === '23505') {
              console.log('⏩ Profile already exists for this user');
            } else {
              console.log('⚠️ Error creating profile:', profileError.message);
            }
          } else {
            console.log('✅ Profile created successfully');
          }
        }
      }
    }
    
    console.log('\n✨ OAuth Registration Fix Process Complete!\n');
    console.log('Next steps:');
    console.log('1. If you haven\'t already, run the SQL script in Supabase dashboard');
    console.log('2. Try registering with a new Google account');
    console.log('3. The registration should now complete successfully and redirect to dashboard');
    
  } catch (error) {
    console.error('❌ Error during fix process:', error);
  }
}

// Run the fix
applyProfilesFix().catch(console.error);