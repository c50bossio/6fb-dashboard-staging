const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Analyzing network requests and resource timing...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Collect network requests
  const networkRequests = [];
  const failedRequests = [];
  
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      startTime: Date.now()
    });
  });
  
  page.on('response', response => {
    const request = networkRequests.find(req => req.url === response.url());
    if (request) {
      request.status = response.status();
      request.endTime = Date.now();
      request.duration = request.endTime - request.startTime;
      request.size = response.headers()['content-length'] || 'unknown';
    }
    
    if (!response.ok()) {
      failedRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  console.log('📡 Starting navigation with network monitoring...');
  const startTime = Date.now();
  
  await page.goto('http://localhost:9999/login', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  const endTime = Date.now();
  
  // Wait a bit more for any delayed requests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`\n🌐 NETWORK ANALYSIS (${endTime - startTime}ms total):`);
  console.log(`   Total requests: ${networkRequests.length}`);
  console.log(`   Failed requests: ${failedRequests.length}`);
  
  if (failedRequests.length > 0) {
    console.log('\n❌ FAILED REQUESTS:');
    failedRequests.forEach(req => {
      console.log(`   ${req.status} - ${req.url}`);
    });
  }
  
  // Analyze slow requests
  const slowRequests = networkRequests
    .filter(req => req.duration && req.duration > 500)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  
  if (slowRequests.length > 0) {
    console.log('\n🐌 SLOW REQUESTS (>500ms):');
    slowRequests.forEach(req => {
      console.log(`   ${req.duration}ms - ${req.resourceType} - ${req.url.substring(0, 80)}...`);
    });
  }
  
  // Group by resource type
  const byType = networkRequests.reduce((acc, req) => {
    acc[req.resourceType] = (acc[req.resourceType] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📊 REQUESTS BY TYPE:');
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  // Get detailed resource timing
  const resourceTimings = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: Math.round(resource.duration),
      size: resource.transferSize,
      startTime: Math.round(resource.startTime)
    })).sort((a, b) => b.duration - a.duration);
  });
  
  console.log('\n⏱️  SLOWEST RESOURCES:');
  resourceTimings.slice(0, 10).forEach(resource => {
    const fileName = resource.name.split('/').pop().substring(0, 50);
    console.log(`   ${resource.duration}ms - ${resource.type} - ${fileName}`);
  });
  
  // Get JavaScript execution timing
  const jsMetrics = await page.evaluate(() => {
    const entries = performance.getEntriesByType('measure') || [];
    const jsExecutionTime = entries
      .filter(entry => entry.name.includes('js') || entry.name.includes('script'))
      .reduce((total, entry) => total + entry.duration, 0);
    
    return {
      jsExecutionTime: Math.round(jsExecutionTime),
      totalMeasures: entries.length
    };
  });
  
  console.log('\n⚡ JAVASCRIPT PERFORMANCE:');
  console.log(`   JS execution time: ${jsMetrics.jsExecutionTime}ms`);
  console.log(`   Performance measures: ${jsMetrics.totalMeasures}`);
  
  await browser.close();
})().catch(console.error);