/**
 * Deploy Enterprise Schema to Production Database
 * This script applies the enterprise database migration to Supabase
 */

const fs = require('fs');
const path = require('path');

async function deployEnterpriseSchema() {
  
  );

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

    // Verify the tables were created
    const tablesToCheck = ['organizations', 'enterprise_websites', 'organization_members', 'enterprise_analytics_cache'];

    for (const table of tablesToCheck) {
      try {
        const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
          headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY
          }
        });
        
        if (verifyResponse.ok) {
          
        } else {
          
        }
      } catch (err) {
        
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

        }
      }
    } catch (err) {
      
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Check the SQL syntax and database permissions');
    process.exit(1);
  }
}

// Run the deployment
deployEnterpriseSchema().catch(console.error);