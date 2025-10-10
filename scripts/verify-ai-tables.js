#!/usr/bin/env node

/**
 * Verify AI-related tables exist and provide creation instructions
 */

import 'dotenv/config'
import supabaseQuery from '../lib/supabase-query.js'

const AI_TABLES = [
  { name: 'ai_chat_sessions', description: 'AI agent chat sessions' },
  { name: 'ai_chat_messages', description: 'AI chat messages and responses' },
  { name: 'ai_knowledge_base', description: 'RAG knowledge base for AI agents' },
  { name: 'business_analytics', description: 'Business metrics and analytics' },
  { name: 'ai_usage_analytics', description: 'AI system usage tracking' }
]

async function verifyAITables() {
  console.log('🤖 Verifying AI system tables...\n')
  
  const results = []
  
  for (const table of AI_TABLES) {
    try {
      const result = await supabaseQuery.queryTable(table.name, { limit: 1 })
      const exists = !result.error
      
      results.push({ ...table, exists, error: result.error })
      
      if (exists) {
        console.log(`✅ ${table.name}: OK`)
      } else {
        console.log(`❌ ${table.name}: MISSING - ${table.description}`)
      }
    } catch (error) {
      results.push({ ...table, exists: false, error: error.message })
      console.log(`❌ ${table.name}: ERROR - ${error.message}`)
    }
  }
  
  const existingCount = results.filter(r => r.exists).length
  const missingCount = results.filter(r => !r.exists).length
  
  console.log(`\n📊 Summary: ${existingCount} existing, ${missingCount} missing AI tables`)
  
  if (missingCount > 0) {
    console.log('\n🛠️ MANUAL CREATION REQUIRED:')
    console.log('=================================')
    console.log('The missing AI tables need to be created manually in Supabase.')
    console.log('')
    console.log('📋 Instructions:')
    console.log('1. Go to: https://supabase.com/dashboard')
    console.log('2. Select your project')
    console.log('3. Navigate to "SQL Editor" in the sidebar')
    console.log('4. Create a "New query"')
    console.log('5. Copy and paste the contents of: scripts/create-missing-tables.sql')
    console.log('6. Click "Run" to execute')
    console.log('')
    console.log('📁 File location: scripts/create-missing-tables.sql')
    console.log('🔧 Tables to create:')
    
    results.filter(r => !r.exists).forEach(table => {
      console.log(`   - ${table.name} (${table.description})`)
    })
    
    console.log('\n⏱️ This process should take less than 5 minutes.')
  } else {
    console.log('\n🎉 All AI tables are available!')
    console.log('✅ The AI agent system is ready to use.')
  }
  
  return { existingCount, missingCount, results }
}

async function testExistingTables() {
  console.log('\n🔍 Testing existing core tables...')
  
  const coreTableChecks = [
    { name: 'profiles', description: 'User profiles (Supabase auth)' },
    { name: 'barbershops', description: 'Barbershop information' },
    { name: 'appointments', description: 'Booking appointments' },
    { name: 'services', description: 'Available services' },
    { name: 'agents', description: 'Existing agent configurations' }
  ]
  
  for (const table of coreTableChecks) {
    try {
      const result = await supabaseQuery.queryTable(table.name, { limit: 1 })
      if (!result.error) {
        const count = result.data?.length || 0
        console.log(`✅ ${table.name}: ${count} sample record(s)`)
      } else {
        console.log(`⚠️ ${table.name}: ${result.error}`)
      }
    } catch (error) {
      console.log(`❌ ${table.name}: ${error.message}`)
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 6FB AI Agent System - Database Verification\n')
  
  await testExistingTables()
  const verification = await verifyAITables()
  
  if (verification.missingCount === 0) {
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. ✅ Database schema is complete')
    console.log('2. 🔄 Connect APIs to real database data')  
    console.log('3. 🤖 Test AI agent functionality')
    console.log('4. 📊 Verify analytics calculations')
  } else {
    console.log('\n⚠️ ACTION REQUIRED:')
    console.log('Please create the missing AI tables before proceeding.')
    console.log('Run this script again after creation to verify.')
  }
}

main().catch(console.error)