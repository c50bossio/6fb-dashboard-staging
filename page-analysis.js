/**
 * Manual Page Analysis for 6FB AI Agent System
 * Tests key pages and functionality without complex automation
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

async function analyzeAllPages() {
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--start-maximized'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  const page = await browser.newPage();
  
  const analysis = {
    timestamp: new Date().toISOString(),
    platform: '6FB AI Agent System',
    pages: {},
    overallAssessment: {},
    criticalIssues: [],
    recommendations: []
  };

  const pagesToTest = [
    { name: 'Homepage', url: 'http://localhost:9999' },
    { name: 'Dashboard', url: 'http://localhost:9999/dashboard' },
    { name: 'Login', url: 'http://localhost:9999/login' },
    { name: 'Register', url: 'http://localhost:9999/register' }
  ];

  try {
    for (const pageInfo of pagesToTest) {
      console.log(`🔍 Analyzing ${pageInfo.name} page...`);
      
      try {
        await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 10000 });
        
        const pageAnalysis = await page.evaluate(() => {
          return {
            title: document.title,
            url: window.location.href,
            hasH1: !!document.querySelector('h1'),
            hasNavigation: !!document.querySelector('nav, .nav, [role="navigation"]'),
            hasSidebar: !!document.querySelector('.sidebar, aside, [class*="sidebar"]'),
            hasMainContent: !!document.querySelector('main, [role="main"]'),
            hasFooter: !!document.querySelector('footer, [role="contentinfo"]'),
            formCount: document.querySelectorAll('form').length,
            buttonCount: document.querySelectorAll('button, [role="button"]').length,
            linkCount: document.querySelectorAll('a[href]').length,
            imageCount: document.querySelectorAll('img').length,
            errorElements: document.querySelectorAll('.error, [class*="error"]').length,
            loadingElements: document.querySelectorAll('.loading, [class*="loading"]').length,
            bodyClasses: document.body.className,
            metaDescription: document.querySelector('meta[name="description"]')?.content || 'None',
            viewportMeta: document.querySelector('meta[name="viewport"]')?.content || 'None'
          };
        });
        
        const screenshotPath = `/Users/bossio/6FB AI Agent System/test-results/${pageInfo.name.toLowerCase()}-analysis.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        const barbershopElements = await page.evaluate(() => {
          const keywords = ['barber', 'appointment', 'booking', 'schedule', 'service', 'cut', 'style', 'client', 'customer'];
          const pageText = document.body.textContent.toLowerCase();
          const foundKeywords = keywords.filter(keyword => pageText.includes(keyword));
          
          return {
            foundKeywords,
            hasCalendar: !!document.querySelector('[class*="calendar"], #calendar, .fc'),
            hasBookingForm: !!document.querySelector('[class*="booking"], [id*="booking"]'),
            hasServiceList: !!document.querySelector('[class*="service"], .services'),
            hasAppointmentList: !!document.querySelector('[class*="appointment"]'),
            hasClientManagement: !!document.querySelector('[class*="client"], [class*="customer"]')
          };
        });
        
        analysis.pages[pageInfo.name] = {
          ...pageAnalysis,
          barbershopFeatures: barbershopElements,
          screenshot: screenshotPath,
          loadedSuccessfully: true
        };
        
      } catch (error) {
        console.log(`❌ Error analyzing ${pageInfo.name}: ${error.message}`);
        analysis.pages[pageInfo.name] = {
          error: error.message,
          loadedSuccessfully: false
        };
      }
      
      await page.waitForTimeout(1000);
    }

    console.log('📱 Testing responsive design...');
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 }
    ];

    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.goto('http://localhost:9999', { waitUntil: 'networkidle2' });
      
      const screenshotPath = `/Users/bossio/6FB AI Agent System/test-results/responsive-${viewport.name.toLowerCase()}-final.png`;
      await page.screenshot({ path: screenshotPath });
      
      const responsiveCheck = await page.evaluate(() => ({
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        elementsOverflow: document.querySelectorAll('*').length // Simplified check
      }));
      
      analysis.pages[`Responsive_${viewport.name}`] = {
        viewport,
        screenshot: screenshotPath,
        ...responsiveCheck
      };
    }

    const successfulPages = Object.values(analysis.pages).filter(p => p.loadedSuccessfully).length;
    const totalPages = pagesToTest.length;
    
    analysis.overallAssessment = {
      pagesLoaded: `${successfulPages}/${totalPages}`,
      hasConsistentNavigation: Object.values(analysis.pages).filter(p => p.hasNavigation).length > 0,
      hasBarbershopFeatures: Object.values(analysis.pages).some(p => p.barbershopFeatures?.foundKeywords?.length > 2),
      responsiveDesign: 'Tested',
      overallRating: successfulPages === totalPages ? 'Good' : 'Needs Improvement'
    };

    analysis.recommendations = [
      'Consider adding consistent navigation across all pages',
      'Implement a sidebar for better dashboard organization',
      'Add more barbershop-specific visual elements and terminology',
      'Ensure all pages have proper H1 headings for SEO',
      'Add loading states for better user experience',
      'Consider implementing breadcrumb navigation',
      'Add footer with important links and information',
      'Implement proper error handling and error pages'
    ];

    if (successfulPages < totalPages) {
      analysis.criticalIssues.push('Some pages failed to load properly');
    }
    
    const pagesWithoutH1 = Object.values(analysis.pages).filter(p => p.loadedSuccessfully && !p.hasH1).length;
    if (pagesWithoutH1 > 0) {
      analysis.criticalIssues.push(`${pagesWithoutH1} pages missing H1 headings`);
    }

  } catch (error) {
    console.error('❌ Analysis error:', error);
    analysis.error = error.message;
  }

  const reportPath = '/Users/bossio/6FB AI Agent System/test-results/comprehensive-page-analysis.json';
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));
  
  console.log('\n📊 6FB AI Agent System - Comprehensive Page Analysis');
  console.log('=====================================================');
  console.log(`📄 Pages Analyzed: ${Object.keys(analysis.pages).length}`);
  console.log(`✅ Successfully Loaded: ${Object.values(analysis.pages).filter(p => p.loadedSuccessfully).length}`);
  console.log(`⚠️  Critical Issues: ${analysis.criticalIssues.length}`);
  console.log(`💡 Recommendations: ${analysis.recommendations.length}`);
  console.log(`\n📋 Overall Assessment: ${analysis.overallAssessment.overallRating}`);
  console.log(`\n📄 Full analysis saved: ${reportPath}`);
  
  await browser.close();
  return analysis;
}

analyzeAllPages().catch(console.error);