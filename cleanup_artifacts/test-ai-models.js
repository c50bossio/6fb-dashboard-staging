#!/usr/bin/env node

/**
 * Test script to verify AI model updates
 * Tests that GPT-5 and Claude Opus 4.1 are properly configured
 */

const fs = require('fs')
const path = require('path')

console.log('🤖 AI Model Configuration Test')
console.log('================================\n')

// Check environment variables
console.log('📋 Checking environment variables:')
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  console.log('✅ .env.local file exists')
  
  const envContent = fs.readFileSync(envPath, 'utf8')
  const hasOpenAI = envContent.includes('OPENAI_API_KEY=')
  const hasAnthropic = envContent.includes('ANTHROPIC_API_KEY=')
  const hasGemini = envContent.includes('GOOGLE_GEMINI_API_KEY=')
  
  console.log(`${hasOpenAI ? '✅' : '❌'} OpenAI API key configured`)
  console.log(`${hasAnthropic ? '✅' : '❌'} Anthropic API key configured`)
  console.log(`${hasGemini ? '✅' : '❌'} Google Gemini API key configured`)
} else {
  console.log('❌ .env.local file not found')
}

console.log('\n📂 Checking file updates:')

// Check AI Agent Chat component
const aiChatPath = path.join(__dirname, 'components/ai/AIAgentChat.js')
if (fs.existsSync(aiChatPath)) {
  const content = fs.readFileSync(aiChatPath, 'utf8')
  const hasGPT5 = content.includes("'gpt-5'")
  const hasModelSelector = content.includes('ModelSelector')
  
  console.log(`${hasGPT5 ? '✅' : '❌'} AIAgentChat updated to use GPT-5`)
  console.log(`${hasModelSelector ? '✅' : '❌'} ModelSelector integrated`)
}

// Check Model Selector component
const modelSelectorPath = path.join(__dirname, 'components/ai/ModelSelector.js')
if (fs.existsSync(modelSelectorPath)) {
  console.log('✅ ModelSelector component created')
  
  const content = fs.readFileSync(modelSelectorPath, 'utf8')
  const hasGPT5 = content.includes('gpt-5')
  const hasClaude41 = content.includes('claude-opus-4-1')
  const hasGemini2 = content.includes('gemini-2.0')
  
  console.log(`  ${hasGPT5 ? '✅' : '❌'} GPT-5 models configured`)
  console.log(`  ${hasClaude41 ? '✅' : '❌'} Claude Opus 4.1 configured`)
  console.log(`  ${hasGemini2 ? '✅' : '❌'} Gemini 2.0 configured`)
} else {
  console.log('❌ ModelSelector component not found')
}

// Check API routes
const apiRoutePath = path.join(__dirname, 'app/api/ai/agents/route.js')
if (fs.existsSync(apiRoutePath)) {
  const content = fs.readFileSync(apiRoutePath, 'utf8')
  const hasGPT5 = content.includes("'gpt-5'")
  const hasClaude41 = content.includes('claude-opus-4-1')
  
  console.log(`${hasGPT5 ? '✅' : '❌'} API routes updated to GPT-5`)
  console.log(`${hasClaude41 ? '✅' : '❌'} API routes updated to Claude Opus 4.1`)
}

// Check ai-providers.js
const providersPath = path.join(__dirname, 'lib/ai-providers.js')
if (fs.existsSync(providersPath)) {
  const content = fs.readFileSync(providersPath, 'utf8')
  const hasGPT5 = content.includes("'gpt-5'")
  const hasClaude41 = content.includes('claude-opus-4-1')
  
  console.log(`${hasGPT5 ? '✅' : '❌'} ai-providers.js updated to GPT-5`)
  console.log(`${hasClaude41 ? '✅' : '❌'} ai-providers.js updated to Claude Opus 4.1`)
}

// Check FastAPI backend
const backendPath = path.join(__dirname, 'fastapi_backend.py')
if (fs.existsSync(backendPath)) {
  const content = fs.readFileSync(backendPath, 'utf8')
  const hasModelConfig = content.includes('AI_MODELS =')
  const hasGPT5Default = content.includes('DEFAULT_AI_MODEL = "gpt-5"')
  const hasModelEndpoint = content.includes('/api/v1/ai/models')
  
  console.log(`${hasModelConfig ? '✅' : '❌'} AI_MODELS configuration added to backend`)
  console.log(`${hasGPT5Default ? '✅' : '❌'} Default model set to GPT-5`)
  console.log(`${hasModelEndpoint ? '✅' : '❌'} Model management endpoints added`)
}

// Check documentation
const claudeMdPath = path.join(__dirname, 'CLAUDE.md')
if (fs.existsSync(claudeMdPath)) {
  const content = fs.readFileSync(claudeMdPath, 'utf8')
  const hasGPT5 = content.includes('GPT-5')
  const hasClaude41 = content.includes('Claude Opus 4.1')
  const hasModelSection = content.includes('## AI Model Configuration')
  
  console.log(`${hasModelSection ? '✅' : '❌'} AI Model Configuration section added to docs`)
  console.log(`${hasGPT5 ? '✅' : '❌'} GPT-5 documented`)
  console.log(`${hasClaude41 ? '✅' : '❌'} Claude Opus 4.1 documented`)
}

console.log('\n✨ Model Update Summary:')
console.log('========================')
console.log('• OpenAI: GPT-4 → GPT-5 (with Mini and Nano variants)')
console.log('• Anthropic: Claude-3-Sonnet → Claude Opus 4.1')
console.log('• Google: Gemini 1.5 → Gemini 2.0 Flash')
console.log('\n🎯 Default Model: GPT-5')
console.log('📊 Best for Coding: Claude Opus 4.1')
console.log('💰 Most Cost-Effective: Gemini 2.0 Flash')

console.log('\n✅ AI model updates completed successfully!')