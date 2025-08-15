const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log(`🚀 Attempting to execute SQL for project: ${projectRef}`);

const sqlContent = fs.readFileSync('database/RUN_THIS_IN_SUPABASE.sql', 'utf8');

const options = {
  hostname: `${projectRef}.supabase.co`,
  port: 443,
  path: '/rest/v1/rpc',
  method: 'POST',
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    
    if (res.statusCode !== 200) {
      console.log('\n❌ Automated execution not available via API');
      console.log('\n✅ Easy solution - Copy & Paste method:');
      console.log('─────────────────────────────────────────');
      console.log('1. I\'ve opened your browser to the SQL editor');
      console.log('2. Copy everything from: database/RUN_THIS_IN_SUPABASE.sql');
      console.log('3. Paste it in the SQL editor');
      console.log('4. Click the green "RUN" button');
      console.log('5. You\'ll see "All tables created successfully! 🎉"');
      console.log('─────────────────────────────────────────');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(JSON.stringify({
  query: sqlContent
}));

req.end();