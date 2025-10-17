const puppeteer = require('puppeteer');

(async () => {

  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
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

  const startTime = Date.now();
  
  await page.goto('http://localhost:9999/login', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  const endTime = Date.now();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  :`);

  if (failedRequests.length > 0) {
    
    failedRequests.forEach(req => {
      
    });
  }
  
  const slowRequests = networkRequests
    .filter(req => req.duration && req.duration > 500)
    .sort((a, b) => (b.duration || 0) - (a.duration || 0));
  
  if (slowRequests.length > 0) {
    :');
    slowRequests.forEach(req => {
      }...`);
    });
  }
  
  const byType = networkRequests.reduce((acc, req) => {
    acc[req.resourceType] = (acc[req.resourceType] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byType).forEach(([type, count]) => {
    
  });
  
  const resourceTimings = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(resource => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: Math.round(resource.duration),
      size: resource.transferSize,
      startTime: Math.round(resource.startTime)
    })).sort((a, b) => b.duration - a.duration);
  });

  resourceTimings.slice(0, 10).forEach(resource => {
    const fileName = resource.name.split('/').pop().substring(0, 50);
    
  });
  
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

  await browser.close();
})().catch(console.error);