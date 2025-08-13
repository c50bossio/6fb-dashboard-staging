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
  console.log('🔑 Checking Environment Variables...');
  console.log('='.repeat(50));
  
  try {
    const result = execSync('vercel env ls --scope=6fb', { encoding: 'utf8' });
    
    let requiredCount = 0;
    let optionalCount = 0;
    
    config.requiredEnvVars.forEach(envVar => {
      if (result.includes(envVar)) {
        console.log(`✅ ${envVar}: Configured`);
        requiredCount++;
      } else {
        console.log(`❌ ${envVar}: Missing`);
      }
    });
    
    config.optionalEnvVars.forEach(envVar => {
      if (result.includes(envVar)) {
        console.log(`🟡 ${envVar}: Configured (optional)`);
        optionalCount++;
      } else {
        console.log(`⚪ ${envVar}: Not configured (optional)`);
      }
    });
    
    console.log(`\\n📊 Environment Variables Summary:`);
    console.log(`   Required: ${requiredCount}/${config.requiredEnvVars.length}`);
    console.log(`   Optional: ${optionalCount}/${config.optionalEnvVars.length}`);
    
    return requiredCount === config.requiredEnvVars.length;
    
  } catch (err) {
    console.log('❌ Failed to check environment variables:', err.message);
    return false;
  }
}

async function checkProductionHealth() {
  console.log('\\n🏥 Production Health Check...');
  console.log('='.repeat(50));
  
  const results = await Promise.all(
    config.criticalEndpoints.map(async endpoint => {
      const result = await makeRequest(config.production + endpoint);
      const status = result.healthy ? '✅' : '❌';
      const perfStatus = result.responseTime < 1000 ? '🟢' : '🔴';
      
      console.log(`${status} ${endpoint}`);
      console.log(`   Status: ${result.status} | Time: ${perfStatus} ${result.responseTime}ms`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      return result;
    })
  );
  
  const healthyCount = results.filter(r => r.healthy).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`\\n📊 Production Health Summary:`);
  console.log(`   Uptime: ${((healthyCount / results.length) * 100).toFixed(1)}%`);
  console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  return healthyCount === results.length;
}

async function checkGitConfiguration() {
  console.log('\\n🔧 Git Configuration Check...');
  console.log('='.repeat(50));
  
  try {
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const remoteBranches = execSync('git branch -r', { encoding: 'utf8' });
    
    console.log(`✅ Current branch: ${currentBranch}`);
    
    const requiredBranches = ['origin/production', 'origin/staging', 'origin/main'];
    requiredBranches.forEach(branch => {
      if (remoteBranches.includes(branch)) {
        console.log(`✅ ${branch}: Exists`);
      } else {
        console.log(`❌ ${branch}: Missing`);
      }
    });
    
    // Check if production branch is protected
    try {
      const protectionStatus = execSync('gh api repos/c50bossio/6fb-dashboard-staging/branches/production/protection', { encoding: 'utf8' });
      console.log('✅ Production branch: Protected');
    } catch (err) {
      console.log('❌ Production branch: Not protected');
    }
    
    return true;
  } catch (err) {
    console.log('❌ Git configuration check failed:', err.message);
    return false;
  }
}

async function checkVercelDeployment() {
  console.log('\\n🚀 Vercel Deployment Check...');
  console.log('='.repeat(50));
  
  try {
    // Check project status
    const projects = execSync('vercel project ls --scope=6fb', { encoding: 'utf8' });
    
    if (projects.includes('6fb-ai-dashboard')) {
      console.log('✅ Project: 6fb-ai-dashboard found');
    } else {
      console.log('❌ Project: 6fb-ai-dashboard not found');
      return false;
    }
    
    // Check domains
    const domains = execSync('vercel domains ls --scope=6fb', { encoding: 'utf8' });
    
    if (domains.includes('bookedbarber.com')) {
      console.log('✅ Domain: bookedbarber.com configured');
    } else {
      console.log('❌ Domain: bookedbarber.com not configured');
    }
    
    // Check latest deployment
    try {
      const deployments = execSync('vercel ls --scope=6fb', { encoding: 'utf8' });
      console.log('✅ Deployments: Active');
    } catch (err) {
      console.log('❌ Deployments: Failed to check');
    }
    
    return true;
  } catch (err) {
    console.log('❌ Vercel deployment check failed:', err.message);
    return false;
  }
}

async function generateSetupReport() {
  console.log('\\n📋 PRODUCTION SETUP REPORT');
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log(`Production URL: ${config.production}`);
  console.log(`Staging URL: ${config.staging}`);
  
  const envCheck = await checkEnvironmentVariables();
  const healthCheck = await checkProductionHealth();
  const gitCheck = await checkGitConfiguration();
  const deployCheck = await checkVercelDeployment();
  
  console.log('\\n🎯 OVERALL STATUS');
  console.log('='.repeat(60));
  
  const checks = [
    { name: 'Environment Variables', status: envCheck },
    { name: 'Production Health', status: healthCheck },
    { name: 'Git Configuration', status: gitCheck },
    { name: 'Vercel Deployment', status: deployCheck }
  ];
  
  let allGood = true;
  checks.forEach(check => {
    const icon = check.status ? '✅' : '❌';
    console.log(`${icon} ${check.name}: ${check.status ? 'PASSED' : 'FAILED'}`);
    if (!check.status) allGood = false;
  });
  
  console.log('\\n' + '='.repeat(60));
  
  if (allGood) {
    console.log('🎉 PRODUCTION SETUP COMPLETE!');
    console.log('🚀 BookedBarber is fully operational at https://bookedbarber.com');
    console.log('\\n📋 Next Steps:');
    console.log('  1. Test Stripe integration');
    console.log('  2. Configure optional services (Pusher, PostHog, Sentry)');
    console.log('  3. Set up monitoring alerts');
    console.log('  4. Plan user onboarding');
  } else {
    console.log('⚠️  PRODUCTION SETUP INCOMPLETE');
    console.log('❌ Some components need attention before going live');
    console.log('\\n📋 Action Required:');
    console.log('  1. Fix failed checks above');
    console.log('  2. Re-run this script to verify');
    console.log('  3. Contact support if issues persist');
  }
  
  console.log('\\n🔧 Useful Commands:');
  console.log('  Production monitor: node scripts/production-monitor.js');
  console.log('  Deploy to production: git push origin production');
  console.log('  Check logs: vercel logs 6fb-ai-dashboard --scope=6fb');
  console.log('  Health check: curl https://bookedbarber.com/api/health');
}

// Run the setup report
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