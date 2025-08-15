const puppeteer = require('puppeteer');

(async () => {
  console.log('🎯 Analyzing Core Web Vitals and detailed performance...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('🚀 Navigating to login page...');
  const startTime = Date.now();
  
  await page.goto('http://localhost:9999/login', {
    waitUntil: 'networkidle0',
    timeout: 30000
  });
  
  const navigationTime = Date.now() - startTime;
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics = {};
      
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        metrics.navigationTiming = {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnect: navigation.connectEnd - navigation.connectStart,
          ttfb: navigation.responseStart - navigation.requestStart, // Time to First Byte
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          totalTime: navigation.loadEventEnd - navigation.fetchStart
        };
      }
      
      const paintEntries = performance.getEntriesByType('paint');
      metrics.paintTiming = {};
      paintEntries.forEach(entry => {
        metrics.paintTiming[entry.name] = Math.round(entry.startTime);
      });
      
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        metrics.lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
      }
      
      metrics.fid = 'Requires user interaction';
      
      const clsEntries = performance.getEntriesByType('layout-shift');
      let cls = 0;
      clsEntries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });
      metrics.cls = Math.round(cls * 1000) / 1000;
      
      if (performance.memory) {
        metrics.memory = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
      }
      
      const resources = performance.getEntriesByType('resource');
      metrics.resourceCounts = resources.reduce((acc, resource) => {
        const type = resource.initiatorType || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      metrics.slowResources = resources
        .filter(r => r.duration > 100)
        .map(r => ({
          name: r.name.split('/').pop(),
          type: r.initiatorType,
          duration: Math.round(r.duration),
          size: r.transferSize
        }))
        .sort((a, b) => b.duration - a.duration);
      
      resolve(metrics);
    });
  });
  
  console.log(`\n🕒 TOTAL NAVIGATION TIME: ${navigationTime}ms`);
  
  console.log('\n🎯 CORE WEB VITALS:');
  console.log(`   LCP (Largest Contentful Paint): ${metrics.lcp}ms`);
  console.log(`   FID (First Input Delay): ${metrics.fid}`);
  console.log(`   CLS (Cumulative Layout Shift): ${metrics.cls}`);
  
  console.log('\n🎨 PAINT TIMING:');
  Object.entries(metrics.paintTiming).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}ms`);
  });
  
  if (metrics.navigationTiming) {
    console.log('\n⏱️  NAVIGATION TIMING BREAKDOWN:');
    console.log(`   DNS Lookup: ${Math.round(metrics.navigationTiming.dnsLookup)}ms`);
    console.log(`   TCP Connect: ${Math.round(metrics.navigationTiming.tcpConnect)}ms`);
    console.log(`   TTFB (Time to First Byte): ${Math.round(metrics.navigationTiming.ttfb)}ms`);
    console.log(`   DOM Content Loaded: ${Math.round(metrics.navigationTiming.domContentLoaded)}ms`);
    console.log(`   Load Complete: ${Math.round(metrics.navigationTiming.loadComplete)}ms`);
    console.log(`   Total Time: ${Math.round(metrics.navigationTiming.totalTime)}ms`);
  }
  
  if (metrics.memory) {
    console.log('\n🧠 MEMORY USAGE:');
    console.log(`   Used: ${metrics.memory.used}MB`);
    console.log(`   Total: ${metrics.memory.total}MB`);
    console.log(`   Limit: ${metrics.memory.limit}MB`);
  }
  
  console.log('\n📊 RESOURCE SUMMARY:');
  Object.entries(metrics.resourceCounts).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  
  console.log('\n🐌 SLOW RESOURCES (>100ms):');
  metrics.slowResources.slice(0, 10).forEach(resource => {
    const sizeInfo = resource.size ? ` (${Math.round(resource.size/1024)}KB)` : '';
    console.log(`   ${resource.duration}ms - ${resource.type} - ${resource.name}${sizeInfo}`);
  });
  
  console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');
  
  if (metrics.lcp > 2500) {
    console.log('   ⚠️  LCP is poor (>2.5s). Consider optimizing largest content element.');
  } else if (metrics.lcp > 1000) {
    console.log('   ⚡ LCP needs improvement (>1s). Optimize critical rendering path.');
  }
  
  if (metrics.cls > 0.1) {
    console.log('   ⚠️  CLS is poor (>0.1). Check for layout shifts during load.');
  }
  
  const slowScripts = metrics.slowResources.filter(r => r.type === 'script').length;
  if (slowScripts > 3) {
    console.log(`   🐌 ${slowScripts} slow scripts detected. Consider code splitting or lazy loading.`);
  }
  
  if (navigationTime > 3000) {
    console.log('   🚨 Page load time is very slow (>3s). Critical performance optimization needed.');
  }
  
  await browser.close();
})().catch(console.error);