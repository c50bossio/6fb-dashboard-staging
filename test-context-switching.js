// Test script to verify unified context switching functionality
// Run this in browser console on http://localhost:9999/test-unified-context

async function testContextSwitching() {
  console.log('🧪 Testing Unified Context System...\n');
  
  // Check if the page has loaded
  const heading = document.querySelector('h1');
  if (!heading || !heading.textContent.includes('Unified Context System Test')) {
    console.error('❌ Not on the test page! Navigate to /test-unified-context first');
    return;
  }
  
  console.log('✅ On test page');
  
  // Look for context buttons
  const contextButtons = document.querySelectorAll('button[class*="border"]');
  console.log(`Found ${contextButtons.length} context buttons`);
  
  if (contextButtons.length === 0) {
    console.warn('⚠️ No contexts available. May need to add barbershops/staff to database');
    return;
  }
  
  // Check current active context
  const activeContext = document.querySelector('[class*="border-blue"]');
  if (activeContext) {
    console.log('📍 Current active context:', activeContext.querySelector('.font-medium')?.textContent);
  }
  
  // Check contextual data section
  const dataSection = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Contextual Data'));
  if (dataSection) {
    const parent = dataSection.parentElement;
    const hasData = !parent.textContent.includes('No contextual data loaded');
    console.log(hasData ? '✅ Contextual data is loaded' : '⚠️ No contextual data loaded');
    
    if (hasData) {
      // Check what data is present
      const sections = ['Appointments', 'Staff', 'Services', 'Metrics'];
      sections.forEach(section => {
        const sectionEl = Array.from(parent.querySelectorAll('h3')).find(h => h.textContent === section);
        if (sectionEl) {
          const count = sectionEl.nextElementSibling?.textContent;
          console.log(`  - ${section}: ${count || 'present'}`);
        }
      });
    }
  }
  
  // Check cache statistics
  const cacheSection = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Cache Statistics'));
  if (cacheSection) {
    const parent = cacheSection.parentElement;
    const stats = parent.querySelectorAll('.text-2xl');
    if (stats.length > 0) {
      console.log('\n📊 Cache Statistics:');
      console.log(`  - Cached Items: ${stats[0]?.textContent || 'N/A'}`);
      console.log(`  - Hit Rate: ${stats[1]?.textContent || 'N/A'}`);
      console.log(`  - High Priority: ${stats[2]?.textContent || 'N/A'}`);
      console.log(`  - Low Priority: ${stats[3]?.textContent || 'N/A'}`);
    }
  }
  
  // Test switching contexts
  if (contextButtons.length > 1) {
    console.log('\n🔄 Testing context switch...');
    const targetButton = Array.from(contextButtons).find(btn => !btn.classList.contains('border-blue-500')) || contextButtons[1];
    const targetName = targetButton.querySelector('.font-medium')?.textContent;
    console.log(`Switching to: ${targetName}`);
    
    targetButton.click();
    
    // Wait for update
    setTimeout(() => {
      const newActive = document.querySelector('[class*="border-blue"]');
      if (newActive && newActive !== activeContext) {
        console.log('✅ Context switch successful!');
        
        // Check if data updated
        const dataSection = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Contextual Data'));
        if (dataSection) {
          const parent = dataSection.parentElement;
          const hasData = !parent.textContent.includes('No contextual data loaded');
          const isLoading = parent.textContent.includes('(Loading...)');
          
          if (isLoading) {
            console.log('⏳ Data is loading...');
          } else if (hasData) {
            console.log('✅ New contextual data loaded');
          } else {
            console.log('⚠️ No data loaded for this context');
          }
        }
      } else {
        console.log('❌ Context switch did not work properly');
      }
    }, 1000);
  }
  
  console.log('\n✅ Test complete! Check the results above.');
}

// Instructions
console.log('📋 Context Switching Test Script Loaded');
console.log('Run testContextSwitching() to test the unified context system');
console.log('Or copy and paste this entire script into browser console on /test-unified-context');

// Auto-run if on the correct page
if (typeof window !== 'undefined' && window.location.pathname === '/test-unified-context') {
  setTimeout(testContextSwitching, 500);
}