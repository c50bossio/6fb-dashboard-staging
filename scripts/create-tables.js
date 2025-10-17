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

  try {
    const { data: test, error: testError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (!testError) {

      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('*');

      return;
    }

    const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL.split('//')[1].split('.')[0];
    const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

    );

    );

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();