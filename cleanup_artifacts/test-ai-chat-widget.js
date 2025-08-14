/**
 * AI Chat Widget Comprehensive Evaluation
 * Tests all production features with real data integration
 * Includes API endpoint testing and internal tool connections
 */

const { chromium } = require('playwright');
const fetch = require('node-fetch');

// API endpoint tests
async function testAPIEndpoints() {
  console.log('🔌 Testing Internal API Connections...\n');
  
  const endpoints = [
    { name: 'Analytics Enhanced Chat', url: 'http://localhost:9999/api/ai/analytics-enhanced-chat' },
    { name: 'Analytics Live Data', url: 'http://localhost:9999/api/analytics/live-data' },
    { name: 'AI Chat Health', url: 'http://localhost:9999/api/ai/chat' },
    { name: 'AI Analytics Usage', url: 'http://localhost:9999/api/ai/analytics/usage' },
    { name: 'Business Recommendations', url: 'http://localhost:9999/api/business-recommendations' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`   Testing ${endpoint.name}...`);
      
      if (endpoint.url.includes('analytics-enhanced-chat')) {
        // POST request for chat
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'test api connection',
            session_id: 'eval_test_session',
            business_context: { shop_name: 'Test Shop', barbershop_id: 'test' }
          }),
          timeout: 5000
        });
        console.log(`   ${endpoint.name}: ${response.ok ? '✅' : '❌'} (${response.status})`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`     Response has message: ${data.message || data.response ? '✅' : '❌'}`);
        }
      } else if (endpoint.url.includes('usage') || endpoint.url.includes('recommendations')) {
        // POST request for other endpoints
        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'test', data: {} }),
          timeout: 5000
        });
        console.log(`   ${endpoint.name}: ${response.ok ? '✅' : '❌'} (${response.status})`);
      } else {
        // GET request
        const response = await fetch(endpoint.url, { timeout: 5000 });
        console.log(`   ${endpoint.name}: ${response.ok ? '✅' : '❌'} (${response.status})`);
      }
    } catch (error) {
      console.log(`   ${endpoint.name}: ❌ (${error.message})`);
    }
  }
  
  console.log('\n');
}

async function runAIChatEvaluation() {
  console.log('🤖 Starting AI Chat Widget Evaluation...\n');
  
  // First test API endpoints
  await testAPIEndpoints();
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    args: ['--disable-web-security', '--allow-running-insecure-content']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to homepage
    console.log('📍 Navigating to homepage...');
    await page.goto('http://localhost:9999');
    await page.waitForTimeout(3000);
    
    // Test 1: Chat widget visibility and opening
    console.log('✨ Test 1: Chat Widget Visibility');
    const chatButton = await page.locator('button:has(svg)').filter({ hasText: /AI/ }).first();
    const isVisible = await chatButton.isVisible();
    console.log(`   Widget visible: ${isVisible ? '✅' : '❌'}`);
    
    if (isVisible) {
      await chatButton.click();
      await page.waitForTimeout(2000);
      
      const chatWidget = await page.locator('div:has-text("AI Assistant")').first();
      const isOpen = await chatWidget.isVisible();
      console.log(`   Widget opens: ${isOpen ? '✅' : '❌'}`);
      
      if (isOpen) {
        // Test 2: Proactive greeting evaluation
        console.log('\n💬 Test 2: Proactive Greeting');
        const greeting = await page.locator('.bg-gray-100').first().textContent();
        const hasTimeBasedGreeting = greeting && (
          greeting.includes('Good morning') || 
          greeting.includes('Good afternoon') || 
          greeting.includes('Good evening')
        );
        console.log(`   Time-based greeting: ${hasTimeBasedGreeting ? '✅' : '❌'}`);
        console.log(`   Greeting text: "${greeting}"`);
        
        // Test 3: Quick Actions presence
        console.log('\n🚀 Test 3: Quick Actions');
        const quickActions = await page.locator('button').filter({ hasText: /Revenue|Appointments|Insights|Growth|Marketing/ });
        const actionCount = await quickActions.count();
        console.log(`   Quick actions found: ${actionCount} ${actionCount >= 4 ? '✅' : '❌'}`);
        
        if (actionCount > 0) {
          // Test quick action click
          await quickActions.first().click();
          await page.waitForTimeout(3000);
          
          const newMessage = await page.locator('.bg-amber-600').last().textContent();
          console.log(`   Quick action sends message: ${newMessage ? '✅' : '❌'}`);
        }
        
        // Test 4: Voice input button
        console.log('\n🎤 Test 4: Voice Input');
        const micButton = await page.locator('button:has(svg[class*="MicrophoneIcon"])');
        const hasMicButton = await micButton.isVisible();
        console.log(`   Voice input button present: ${hasMicButton ? '✅' : '❌'}`);
        
        // Test 5: Real data integration test
        console.log('\n📊 Test 5: Real Data Integration');
        await page.fill('input[placeholder*="business"]', 'tell me how much revenue ive made in the last week');
        await page.press('input[placeholder*="business"]', 'Enter');
        
        // Wait for AI response
        await page.waitForTimeout(5000);
        
        const aiResponses = await page.locator('.bg-gray-100').count();
        console.log(`   AI responses received: ${aiResponses > 1 ? '✅' : '❌'}`);
        
        // Check if response contains real data (not [object Object])
        const lastResponse = await page.locator('.bg-gray-100').last().textContent();
        const hasObjectError = lastResponse && lastResponse.includes('[object Object]');
        const hasRealData = lastResponse && !hasObjectError && lastResponse.length > 50;
        console.log(`   No [object Object] errors: ${!hasObjectError ? '✅' : '❌'}`);
        console.log(`   Has substantial response: ${hasRealData ? '✅' : '❌'}`);
        
        if (hasObjectError) {
          console.log(`   ⚠️ Response contains: ${lastResponse.substring(0, 200)}...`);
        }
        
        // Test 5b: Tool Integration Tests
        console.log('\n🔧 Test 5b: Business Tools Integration');
        
        // Test analytics tool integration
        await page.fill('input[placeholder*="business"]', 'show me my customer analytics and trends');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(4000);
        
        const analyticsResponse = await page.locator('.bg-gray-100').last().textContent();
        const hasAnalyticsData = analyticsResponse && (
          analyticsResponse.includes('customer') || 
          analyticsResponse.includes('trend') || 
          analyticsResponse.includes('analytics')
        );
        console.log(`   Analytics tool connection: ${hasAnalyticsData ? '✅' : '❌'}`);
        
        // Test appointment tool integration
        await page.fill('input[placeholder*="business"]', 'what appointments do I have today?');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(4000);
        
        const appointmentResponse = await page.locator('.bg-gray-100').last().textContent();
        const hasAppointmentData = appointmentResponse && (
          appointmentResponse.includes('appointment') || 
          appointmentResponse.includes('booking') || 
          appointmentResponse.includes('schedule')
        );
        console.log(`   Appointment tool connection: ${hasAppointmentData ? '✅' : '❌'}`);
        
        // Test business insights tool
        await page.fill('input[placeholder*="business"]', 'give me business recommendations to increase revenue');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(4000);
        
        const insightsResponse = await page.locator('.bg-gray-100').last().textContent();
        const hasInsights = insightsResponse && (
          insightsResponse.includes('recommend') || 
          insightsResponse.includes('improve') || 
          insightsResponse.includes('strategy')
        );
        console.log(`   Business insights tool: ${hasInsights ? '✅' : '❌'}`);
        
        // Test data persistence and context
        await page.fill('input[placeholder*="business"]', 'based on what we discussed, what should I focus on first?');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(4000);
        
        const contextResponse = await page.locator('.bg-gray-100').last().textContent();
        const hasContext = contextResponse && contextResponse.length > 30 && !contextResponse.includes('error');
        console.log(`   Context awareness: ${hasContext ? '✅' : '❌'}`);
        
        // Network request monitoring
        console.log('\n🌐 Test 5c: Network Request Monitoring');
        let apiCallsMade = 0;
        
        page.on('response', response => {
          if (response.url().includes('/api/ai/') || response.url().includes('/api/analytics/')) {
            apiCallsMade++;
            console.log(`   API call to: ${response.url().split('/api/')[1]} - ${response.status()}`);
          }
        });
        
        // Send one more test message to capture API calls
        await page.fill('input[placeholder*="business"]', 'final connectivity test');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(3000);
        
        console.log(`   Total API calls captured: ${apiCallsMade} ${apiCallsMade > 0 ? '✅' : '❌'}`)
        
        // Test 6: Smart Actions Detection
        console.log('\n🎯 Test 6: Smart Actions');
        const smartActionButtons = await page.locator('.bg-amber-100').count();
        console.log(`   Smart action buttons: ${smartActionButtons} ${smartActionButtons > 0 ? '✅' : '❌'}`);
        
        if (smartActionButtons > 0) {
          const actionTexts = await page.locator('.bg-amber-100').allTextContents();
          console.log(`   Action types found: ${actionTexts.join(', ')}`);
        }
        
        // Test 7: Rating system
        console.log('\n⭐ Test 7: Rating System');
        const rateButton = await page.locator('button:has-text("Rate this response")');
        const hasRatingSystem = await rateButton.isVisible();
        console.log(`   Rating system present: ${hasRatingSystem ? '✅' : '❌'}`);
        
        // Test 8: Session persistence
        console.log('\n💾 Test 8: Session Persistence');
        const messageCount = await page.locator('.bg-gray-100, .bg-amber-600').count();
        console.log(`   Messages in conversation: ${messageCount} ${messageCount >= 2 ? '✅' : '❌'}`);
        
        // Test 9: Error handling
        console.log('\n🛡️ Test 9: Error Handling');
        
        // Send a problematic message
        await page.fill('input[placeholder*="business"]', 'test error handling with special chars: <script>alert("test")</script>');
        await page.press('input[placeholder*="business"]', 'Enter');
        await page.waitForTimeout(3000);
        
        const finalMessageCount = await page.locator('.bg-gray-100, .bg-amber-600').count();
        const handledGracefully = finalMessageCount > messageCount;
        console.log(`   Handles edge cases: ${handledGracefully ? '✅' : '❌'}`);
        
        // Test 10: UI responsiveness
        console.log('\n📱 Test 10: UI Responsiveness');
        
        // Test dragging (if implemented)
        const dragHandle = await page.locator('.drag-handle').isVisible().catch(() => false);
        console.log(`   Draggable widget: ${dragHandle ? '✅' : '❌'}`);
        
        // Test resize behavior
        await page.setViewportSize({ width: 800, height: 600 });
        await page.waitForTimeout(1000);
        const widgetStillVisible = await chatWidget.isVisible();
        console.log(`   Responsive design: ${widgetStillVisible ? '✅' : '❌'}`);
        
        // Performance Test
        console.log('\n⚡ Performance Test');
        const startTime = Date.now();
        await page.fill('input[placeholder*="business"]', 'quick performance test');
        await page.press('input[placeholder*="business"]', 'Enter');
        
        // Wait for response or timeout
        try {
          await page.waitForSelector('.bg-gray-100:last-child', { timeout: 10000 });
          const responseTime = Date.now() - startTime;
          console.log(`   Response time: ${responseTime}ms ${responseTime < 8000 ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`   Response timeout: ❌`);
        }
      }
    }
    
    // Summary
    console.log('\n🎯 EVALUATION SUMMARY');
    console.log('=====================================');
    console.log('AI Chat Widget has been evaluated for:');
    console.log('✨ Widget visibility and interaction');
    console.log('💬 Proactive time-based greetings'); 
    console.log('🚀 Quick action buttons');
    console.log('🎤 Voice input support');
    console.log('📊 Real Supabase data integration');
    console.log('🎯 Smart contextual actions');
    console.log('⭐ Rating and feedback system');
    console.log('💾 Session persistence');
    console.log('🛡️ Error handling');
    console.log('📱 Responsive UI design');
    console.log('⚡ Performance benchmarks');
    
    console.log('\n✅ Evaluation complete! Check results above.');
    
  } catch (error) {
    console.error('❌ Evaluation error:', error.message);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  runAIChatEvaluation().catch(console.error);
}

module.exports = runAIChatEvaluation;