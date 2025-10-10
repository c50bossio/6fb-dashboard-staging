const puppeteer = require('puppeteer');

(async () => {
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  await page.evaluateOnNewDocument(() => {
    window.performanceMetrics = {
      startTime: Date.now(),
      domContentLoaded: 0,
      loadComplete: 0,
      resourceCount: 0,
      errors: []
    };
    
    document.addEventListener('DOMContentLoaded', () => {
      window.performanceMetrics.domContentLoaded = Date.now() - window.performanceMetrics.startTime;
    });
    
    window.addEventListener('load', () => {
      window.performanceMetrics.loadComplete = Date.now() - window.performanceMetrics.startTime;
      window.performanceMetrics.resourceCount = performance.getEntriesByType('resource').length;
    });
    
    window.addEventListener('error', (e) => {
      window.performanceMetrics.errors.push(e.message);
    });
  });
  
  const networkRequests = [];
  page.on('response', (response) => {
    networkRequests.push({
      url: response.url(),
      status: response.status(),
      timing: response.timing()
    });
  });
  
  const consoleMessages = [];
  page.on('console', (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  const startTime = Date.now();
  
  try {
    await page.goto('http://localhost:9999/login', { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    const navigationTime = Date.now() - startTime;

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const metrics = await page.evaluate(() => {
      const timing = performance.timing;
      
      return {
        navigationStart: timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        domInteractive: timing.domInteractiveEventEnd - timing.navigationStart,
        resourceCount: performance.getEntriesByType('resource').length,
        customMetrics: window.performanceMetrics,
        readyState: document.readyState,
        hasForm: !!document.querySelector('form'),
        hasSubmitButton: !!document.querySelector('button[type="submit"], button'),
        title: document.title
      };
    });
    
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource')
        .map(r => ({
          name: r.name.split('/').pop() || r.name,
          duration: r.duration,
          size: r.transferSize || 0,
          type: r.initiatorType
        }))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);
    });

    try {
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i]');
      if (emailInput) {
        await emailInput.type('test@example.com', {delay: 50});
        
      }
      
      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.type('testpass', {delay: 50});
        
      }
      
      const submitButton = await page.$('button[type="submit"], button');
      if (submitButton) {
        const buttonText = await page.evaluate(el => el.textContent, submitButton);
        
      }
    } catch (e) {
      
    }

    .toFixed(2)}s)`);
    .toFixed(2)}s)`);
    .toFixed(2)}s)`);

    resources.forEach((r, i) => {
      .padStart(2)}. ${r.duration.toFixed(2)}ms - ${r.type} - ${r.name}`);
    });

    const failedRequests = networkRequests.filter(r => r.status >= 400);

    if (consoleMessages.length > 0) {
      
      consoleMessages.forEach(msg => {
        if (msg.type === 'error') {
          
        } else if (msg.type === 'warning') {
          
        }
      });
    }
    
    const currentLoadTime = metrics.loadComplete / 1000;
    const previousBaseline = 5.3;
    const improvement = ((previousBaseline - currentLoadTime) / previousBaseline) * 100;

    }s`);
    
    if (improvement > 0) {
      }% faster ✅`);
    } else {
      .toFixed(1)}% slower ❌`);
    }
    
    const targetMet = currentLoadTime <= 2.0;
    : ${targetMet ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
    if (targetMet) {
      
    } else {
      
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
})();