#!/usr/bin/env node

/**
 * Production Monitoring Script for BookedBarber
 * Monitors health, performance, and deployment status
 */

const https = require('https');

const config = {
  production: 'https://bookedbarber.com',
  staging: 'https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app',
  endpoints: [
    '/api/health',
    '/api/auth/session',
    '/api/dashboard/metrics',
    '/api/ai/status',
  ],
  thresholds: {
    responseTime: 2000, // 2 seconds
    uptime: 99.9, // 99.9%
  }
};

async function checkEndpoint(url, endpoint) {
  return new Promise((resolve) => {
    const start = Date.now();
    const fullUrl = url + endpoint;
    
    https.get(fullUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - start;
        resolve({
          endpoint,
          status: res.statusCode,
          responseTime,
          healthy: res.statusCode >= 200 && res.statusCode < 400,
          data: endpoint === '/api/health' ? JSON.parse(data) : null
        });
      });
    }).on('error', (err) => {
      resolve({
        endpoint,
        status: 0,
        responseTime: Date.now() - start,
        healthy: false,
        error: err.message
      });
    });
  });
}

async function monitorEnvironment(env, url) {
  console.log(`\n🔍 Monitoring ${env.toUpperCase()}: ${url}`);
  console.log('='.repeat(60));
  
  const results = await Promise.all(
    config.endpoints.map(endpoint => checkEndpoint(url, endpoint))
  );
  
  let healthyCount = 0;
  let totalResponseTime = 0;
  
  results.forEach(result => {
    const status = result.healthy ? '✅' : '❌';
    const timeColor = result.responseTime > config.thresholds.responseTime ? '🔴' : '🟢';
    
    console.log(`${status} ${result.endpoint}`);
    console.log(`   Status: ${result.status} | Time: ${timeColor} ${result.responseTime}ms`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.data) {
      console.log(`   Services: ${Object.keys(result.data.services).length} configured`);
      console.log(`   Environment: ${result.data.environment}`);
      console.log(`   Version: ${result.data.version}`);
    }
    
    console.log('');
    
    if (result.healthy) healthyCount++;
    totalResponseTime += result.responseTime;
  });
  
  const uptime = (healthyCount / results.length) * 100;
  const avgResponseTime = totalResponseTime / results.length;
  
  console.log(`📊 Summary for ${env.toUpperCase()}:`);
  console.log(`   Uptime: ${uptime.toFixed(1)}% (${healthyCount}/${results.length} healthy)`);
  console.log(`   Avg Response Time: ${avgResponseTime.toFixed(0)}ms`);
  
  const healthStatus = uptime >= config.thresholds.uptime ? '🟢 HEALTHY' : '🔴 UNHEALTHY';
  const perfStatus = avgResponseTime <= config.thresholds.responseTime ? '🟢 FAST' : '🔴 SLOW';
  
  console.log(`   Status: ${healthStatus} | Performance: ${perfStatus}`);
  
  return {
    environment: env,
    uptime,
    avgResponseTime,
    healthy: uptime >= config.thresholds.uptime,
    fast: avgResponseTime <= config.thresholds.responseTime,
    results
  };
}

async function main() {
  console.log('🚀 BookedBarber Production Monitor');
  console.log('📅 ' + new Date().toISOString());
  
  const stagingResults = await monitorEnvironment('staging', config.staging);
  const productionResults = await monitorEnvironment('production', config.production);
  
  console.log('\n🎯 OVERALL STATUS');
  console.log('='.repeat(60));
  
  if (productionResults.healthy && productionResults.fast) {
    console.log('🟢 PRODUCTION: All systems operational');
  } else {
    console.log('🔴 PRODUCTION: Issues detected');
  }
  
  if (stagingResults.healthy && stagingResults.fast) {
    console.log('🟢 STAGING: All systems operational');
  } else {
    console.log('🟡 STAGING: Issues detected');
  }
  
  console.log('\n📋 Quick Commands:');
  console.log('  Production health: curl https://bookedbarber.com/api/health');
  console.log('  Staging health:    curl https://6fb-ai-dashboard-f62lshna2-6fb.vercel.app/api/health');
  console.log('  Monitor logs:      vercel logs 6fb-ai-dashboard --scope=6fb');
  console.log('  Deploy production: git push origin production');
  console.log('  Deploy staging:    git push origin staging');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { monitorEnvironment, checkEndpoint };