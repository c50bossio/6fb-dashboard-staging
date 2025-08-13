
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable Chrome DevTools Performance API
  await page.coverage.startJSCoverage();
  await page.coverage.startCSSCoverage();
  
  console.log('🔍 Detailed performance analysis...');
  
  // Measure multiple load cycles for consistency
  const loadTimes = [];
  
  for (let i = 0; i < 3; i++) {
    console.log();
    
    const startTime = Date.now();
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'networkidle0',
      timeout: 10000 
    });
    
    const loadTime = Date.now() - startTime;
    loadTimes.push(loadTime);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Clear cache between tests
    await page.reload({ waitUntil: 'networkidle0' });
  }
  
  // Get detailed metrics from last load
  const metrics = await page.metrics();
  
  const performanceData = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    
    // Group resources by type
    const resourcesByType = resources.reduce((acc, resource) => {
      if (!acc[resource.initiatorType]) acc[resource.initiatorType] = [];
      acc[resource.initiatorType].push({
        name: resource.name.split('/').pop(),
        duration: resource.duration,
        size: resource.transferSize || 0
      });
      return acc;
    }, {});
    
    return {
      navigation: nav ? {
        domContentLoaded: nav.domContentLoadedEventEnd,
        loadComplete: nav.loadEventEnd,
        domInteractive: nav.domInteractive,
        firstPaint: nav.responseStart,
        responseEnd: nav.responseEnd,
        transferSize: nav.transferSize
      } : null,
      resourcesByType,
      totalResources: resources.length,
      largestResource: resources.sort((a, b) => b.duration - a.duration)[0]
    };
  });
  
  // Coverage analysis
  const jsCoverage = await page.coverage.stopJSCoverage();
  const cssCoverage = await page.coverage.stopCSSCoverage();
  
  const unusedJS = jsCoverage.reduce((acc, coverage) => {
    const total = coverage.text.length;
    const used = coverage.ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
    return acc + (total - used);
  }, 0);
  
  const unusedCSS = cssCoverage.reduce((acc, coverage) => {
    const total = coverage.text.length;
    const used = coverage.ranges.reduce((sum, range) => sum + (range.end - range.start), 0);
    return acc + (total - used);
  }, 0);
  
  console.log('📈 Performance Summary:');
  console.log();
  console.log();
  console.log();
  
  if (performanceData.navigation) {
    console.log();
    console.log();
    console.log();
    console.log();
  }
  
  console.log('🎯 Resource Analysis:');
  Object.entries(performanceData.resourcesByType).forEach(([type, resources]) => {
    const totalSize = resources.reduce((sum, r) => sum + r.size, 0);
    const avgDuration = resources.reduce((sum, r) => sum + r.duration, 0) / resources.length;
    console.log();
  });
  
  console.log('🧹 Code Coverage:');
  console.log();
  console.log();
  
  console.log('💾 Chrome DevTools Metrics:');
  console.log();
  console.log();
  console.log();
  console.log();
  console.log();
  
  // Performance grade
  const avgLoadTime = loadTimes.reduce((a, b) => a + b) / loadTimes.length / 1000;
  let grade = 'F';
  if (avgLoadTime <= 1.0) grade = 'A+';
  else if (avgLoadTime <= 1.5) grade = 'A';
  else if (avgLoadTime <= 2.0) grade = 'B';
  else if (avgLoadTime <= 3.0) grade = 'C';
  else if (avgLoadTime <= 4.0) grade = 'D';
  
  console.log();
  console.log();
  console.log();
  
  await browser.close();
})();
