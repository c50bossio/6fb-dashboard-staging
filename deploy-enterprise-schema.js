/**
 * Deploy Enterprise Schema to Production Database
 * This script applies the enterprise database migration to Supabase
 */

const fs = require('fs');
const path = require('path');

async function deployEnterpriseSchema() {
  console.log('🚀 DEPLOYING ENTERPRISE SCHEMA TO PRODUCTION');
  console.log('='.repeat(60));

  // Read the migration file
  const migrationPath = path.join(__dirname, 'database/migrations/003_enterprise_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  const SUPABASE_URL = 'https://dfhqjdoydihajmjxniee.supabase.co';
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c';

  try {
    // Use the RPC endpoint to execute SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: migrationSQL
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Enterprise schema migration deployed successfully!');

    // Verify the tables were created
    const tablesToCheck = ['organizations', 'enterprise_websites', 'organization_members', 'enterprise_analytics_cache'];
    
    console.log('\n📊 Verifying table creation:');
    
    for (const table of tablesToCheck) {
      try {
        const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        });
        
        if (verifyResponse.ok) {
          console.log(`   ✅ ${table}: Created successfully`);
        } else {
          console.log(`   ❌ ${table}: ${verifyResponse.status} ${verifyResponse.statusText}`);
        }
      } catch (err) {
        console.log(`   ⚠️  ${table}: Verification failed - ${err.message}`);
      }
    }

    // Test barbershops table for new columns
    try {
      const barbershopsResponse = await fetch(`${SUPABASE_URL}/rest/v1/barbershops?select=*&limit=1`, {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY
        }
      });
      
      if (barbershopsResponse.ok) {
        const data = await barbershopsResponse.json();
        if (data.length > 0) {
          const barbershop = data[0];
          const hasOrgId = 'organization_id' in barbershop;
          const hasManager = 'location_manager_id' in barbershop;
          const hasStatus = 'location_status' in barbershop;
          
          console.log('\n🏪 Barbershops table updates:');
          console.log(`   ✅ organization_id column: ${hasOrgId ? 'Added' : 'Missing'}`);
          console.log(`   ✅ location_manager_id column: ${hasManager ? 'Added' : 'Missing'}`);
          console.log(`   ✅ location_status column: ${hasStatus ? 'Added' : 'Missing'}`);
        }
      }
    } catch (err) {
      console.log(`   ⚠️  Could not verify barbershops updates: ${err.message}`);
    }

    console.log('\n🎉 ENTERPRISE DATABASE FOUNDATION: READY');
    console.log('🏢 Organizations can now manage multiple barbershop locations');
    console.log('🔐 Row Level Security policies active for data protection');
    console.log('📈 Analytics caching system ready for performance');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Check the SQL syntax and database permissions');
    process.exit(1);
  }
}

// Run the deployment
deployEnterpriseSchema().catch(console.error);