const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

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

async function createTables() {
  console.log('🚀 Creating database tables programmatically...\n');

  try {
    const { data: test, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (!testError) {
      console.log('✅ Tables already exist!');
      
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*');
      
      console.log(`✅ Found ${agents?.length || 0} agents in database`);
      return;
    }

    console.log('📝 Creating tables using Supabase Admin API...\n');

    
    console.log('⚠️  Direct table creation through JS client is limited.');
    console.log('    Tables must be created through the Supabase Dashboard.\n');
    
    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;
    
    console.log('📋 Quick Setup Instructions:');
    console.log('─'.repeat(50));
    console.log('1. Click this link to open SQL Editor:');
    console.log(`   👉 ${sqlEditorUrl}\n`);
    console.log('2. Copy the SQL from: database/RUN_THIS_IN_SUPABASE.sql');
    console.log('3. Paste it in the SQL editor');
    console.log('4. Click the green "Run" button\n');
    
    console.log('📋 Alternative: Use psql command line:');
    console.log('─'.repeat(50));
    console.log('1. Install psql if not installed:');
    console.log('   brew install postgresql\n');
    console.log('2. Get your database password from Supabase dashboard');
    console.log('3. Run this command:');
    console.log(`   psql "postgresql://postgres.${projectRef}:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres" < database/RUN_THIS_IN_SUPABASE.sql\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();