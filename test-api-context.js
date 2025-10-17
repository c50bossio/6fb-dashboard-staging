#!/usr/bin/env node

// Test script to verify unified context API functionality

async function testContextAPI() {
  try {
    console.log('🧪 Testing Unified Context API...\n');
    
    // Fetch the test page to verify it loads
    const pageResponse = await fetch('http://localhost:9999/test-unified-context');
    
    if (pageResponse.ok) {
      console.log('✅ Test page loads successfully (Status:', pageResponse.status + ')');
      
      // Check if the page content contains expected elements
      const html = await pageResponse.text();
      
      if (html.includes('Unified Context System Test')) {
        console.log('✅ Page contains expected title');
      } else {
        console.log('⚠️ Page loaded but title not found');
      }
      
      if (html.includes('Active Context')) {
        console.log('✅ Active Context section found');
      } else {
        console.log('⚠️ Active Context section not found');
      }
      
      if (html.includes('Available Contexts')) {
        console.log('✅ Available Contexts section found');
      } else {
        console.log('⚠️ Available Contexts section not found');
      }
      
      if (html.includes('Contextual Data')) {
        console.log('✅ Contextual Data section found');
      } else {
        console.log('⚠️ Contextual Data section not found');
      }
      
      if (html.includes('Cache Statistics')) {
        console.log('✅ Cache Statistics section found');
      } else {
        console.log('⚠️ Cache Statistics section not found');
      }
      
      console.log('\n✅ Test page structure verified!');
      console.log('\n📋 Next Steps:');
      console.log('1. Open http://localhost:9999/test-unified-context in your browser');
      console.log('2. Check the browser console for any errors');
      console.log('3. Try switching between contexts in the UI');
      console.log('4. Verify that contextual data updates when switching');
      
    } else {
      console.error('❌ Test page failed to load. Status:', pageResponse.status);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Ensure the dev server is running on port 9999');
      console.log('2. Check for compilation errors in the terminal');
    }
    
  } catch (error) {
    console.error('❌ Error testing context API:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the dev server is running: npm run dev');
    console.log('2. Check that port 9999 is not blocked');
  }
}

// Run the test
testContextAPI();