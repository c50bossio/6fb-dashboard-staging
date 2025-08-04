#!/usr/bin/env node

const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testAIChat() {
  console.log('🤖 Testing AI Chat Functionality...\n');
  
  // Test OpenAI
  if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('YOUR_OPENAI_KEY_HERE')) {
    console.log('✅ OpenAI API key configured');
    
    try {
      const response = await fetch('http://localhost:9999/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say hello in one sentence' }],
          provider: 'openai',
          model: 'gpt-3.5-turbo'
        })
      });
      
      if (response.ok) {
        const data = await response.text();
        console.log('✅ OpenAI chat working!');
        console.log('   Response:', data.substring(0, 100) + '...');
      } else {
        console.log('❌ OpenAI chat error:', response.status);
      }
    } catch (error) {
      console.log('❌ OpenAI test failed:', error.message);
    }
  } else {
    console.log('⚠️  OpenAI API key not configured');
    console.log('   Add your key to OPENAI_API_KEY in .env.local');
  }
  
  console.log('');
  
  // Test Claude
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('✅ Claude API key configured');
    
    try {
      const response = await fetch('http://localhost:9999/api/ai/chat-multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say hello in one sentence' }],
          provider: 'anthropic',
          model: 'claude-3-5-haiku-20241022'
        })
      });
      
      if (response.ok) {
        const data = await response.text();
        console.log('✅ Claude chat working!');
        console.log('   Response:', data.substring(0, 100) + '...');
      } else {
        console.log('❌ Claude chat error:', response.status);
      }
    } catch (error) {
      console.log('❌ Claude test failed:', error.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('─────────────────────────────');
  console.log('Supabase: ' + (process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configured' : '❌ Not configured'));
  console.log('OpenAI:   ' + (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('YOUR_OPENAI_KEY_HERE') ? '✅ Configured' : '❌ Not configured'));
  console.log('Claude:   ' + (process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Not configured'));
  console.log('PostHog:  ' + (process.env.NEXT_PUBLIC_POSTHOG_KEY ? '✅ Configured' : '❌ Not configured'));
}

testAIChat().catch(console.error);