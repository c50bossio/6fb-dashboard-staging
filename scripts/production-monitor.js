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
  }: ${url}`);
  );
  
  const results = await Promise.all(
    config.endpoints.map(endpoint => checkEndpoint(url, endpoint))
  );
  
  let healthyCount = 0;
  let totalResponseTime = 0;
  
  results.forEach(result => {
    const status = result.healthy ? '✅' : '❌';
    const timeColor = result.responseTime > config.thresholds.responseTime ? '🔴' : '🟢';

    if (result.error) {
      
    }
    
    if (result.data) {
      .length} configured`);

    }

    if (result.healthy) healthyCount++;
    totalResponseTime += result.responseTime;
  });
  
  const uptime = (healthyCount / results.length) * 100;
  const avgResponseTime = totalResponseTime / results.length;
  
  }:`);
  }% (${healthyCount}/${results.length} healthy)`);
  }ms`);
  
  const healthStatus = uptime >= config.thresholds.uptime ? '🟢 HEALTHY' : '🔴 UNHEALTHY';
  const perfStatus = avgResponseTime <= config.thresholds.responseTime ? '🟢 FAST' : '🔴 SLOW';

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
  
  .toISOString());
  
  const stagingResults = await monitorEnvironment('staging', config.staging);
  const productionResults = await monitorEnvironment('production', config.production);

  );
  
  if (productionResults.healthy && productionResults.fast) {
    
  } else {
    
  }
  
  if (stagingResults.healthy && stagingResults.fast) {
    
  } else {
    
  }

}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { monitorEnvironment, checkEndpoint };