#!/usr/bin/env node

/**
 * Production Setup Script for BookedBarber
 * Configures all production services and validates deployment
 */

const https = require('https');
const { execSync } = require('child_process');

const config = {
  production: 'https://bookedbarber.com',
  staging: 'https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app',
  requiredEnvVars: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL'
  ],
  optionalEnvVars: [
    'STRIPE_WEBHOOK_SECRET',
    'GOOGLE_AI_API_KEY',
    'PUSHER_APP_ID',
    'NEXT_PUBLIC_PUSHER_KEY',
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_SENTRY_DSN'
  ],
  criticalEndpoints: [
    '/api/health',
    '/api/auth/session',
    '/api/dashboard/metrics'
  ]
};

function makeRequest(url) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          responseTime: Date.now() - start,
          data: res.statusCode === 200 ? data : null,
          healthy: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    }).on('error', (err) => {
      resolve({
        status: 0,
        responseTime: Date.now() - start,
        healthy: false,
        error: err.message
      });
    });
  });
}

async function checkEnvironmentVariables() {
  
  );
  
  try {
    const result = execSync('vercel env ls --scope=6fb', { encoding: 'utf8' });
    
    let requiredCount = 0;
    let optionalCount = 0;
    
    config.requiredEnvVars.forEach(envVar => {
      if (result.includes(envVar)) {
        
        requiredCount++;
      } else {
        
      }
    });
    
    config.optionalEnvVars.forEach(envVar => {
      if (result.includes(envVar)) {
        `);
        optionalCount++;
      } else {
        `);
      }
    });

    return requiredCount === config.requiredEnvVars.length;
    
  } catch (err) {
    
    return false;
  }
}

async function checkProductionHealth() {
  
  );
  
  const results = await Promise.all(
    config.criticalEndpoints.map(async endpoint => {
      const result = await makeRequest(config.production + endpoint);
      const status = result.healthy ? '✅' : '❌';
      const perfStatus = result.responseTime < 1000 ? '🟢' : '🔴';

      if (result.error) {
        
      }
      
      return result;
    })
  );
  
  const healthyCount = results.filter(r => r.healthy).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

   * 100).toFixed(1)}%`);
  }ms`);
  
  return healthyCount === results.length;
}

async function checkGitConfiguration() {
  
  );
  
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const remoteBranches = execSync('git branch -r', { encoding: 'utf8' });

    const requiredBranches = ['origin/production', 'origin/staging', 'origin/main'];
    requiredBranches.forEach(branch => {
      if (remoteBranches.includes(branch)) {
        
      } else {
        
      }
    });
    
    try {
      const protectionStatus = execSync('gh api repos/c50bossio/6fb-dashboard-staging/branches/production/protection', { encoding: 'utf8' });
      
    } catch (err) {
      
    }
    
    return true;
  } catch (err) {
    
    return false;
  }
}

async function checkVercelDeployment() {
  
  );
  
  try {
    const projects = execSync('vercel project ls --scope=6fb', { encoding: 'utf8' });
    
    if (projects.includes('6fb-ai-dashboard')) {
      
    } else {
      
      return false;
    }
    
    const domains = execSync('vercel domains ls --scope=6fb', { encoding: 'utf8' });
    
    if (domains.includes('bookedbarber.com')) {
      
    } else {
      
    }
    
    try {
      const deployments = execSync('vercel ls --scope=6fb', { encoding: 'utf8' });
      
    } catch (err) {
      
    }
    
    return true;
  } catch (err) {
    
    return false;
  }
}

async function generateSetupReport() {
  
  );
  .toISOString()}`);

  const envCheck = await checkEnvironmentVariables();
  const healthCheck = await checkProductionHealth();
  const gitCheck = await checkGitConfiguration();
  const deployCheck = await checkVercelDeployment();

  );
  
  const checks = [
    { name: 'Environment Variables', status: envCheck },
    { name: 'Production Health', status: healthCheck },
    { name: 'Git Configuration', status: gitCheck },
    { name: 'Vercel Deployment', status: deployCheck }
  ];
  
  let allGood = true;
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    
    if (!check.status) allGood = false;
  });
  
  );
  
  if (allGood) {

    ');

  } else {

  }

}

if (require.main === module) {
  generateSetupReport().catch(console.error);
}

module.exports = { 
  checkEnvironmentVariables,
  checkProductionHealth,
  checkGitConfiguration,
  checkVercelDeployment,
  generateSetupReport 
};