#!/usr/bin/env node

/**
 * Test script for payment processing setup
 * Verifies that all components are properly integrated
 */

const { createClient } = require('@supabase/supabase-js')
const fetch = require('node-fetch')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const API_BASE = 'http://localhost:9999/api'

async function testDatabaseTables() {
  console.log('\n🔍 Testing Database Tables...')
  
  const tables = [
    'stripe_connected_accounts',
    'bank_accounts',
    'payout_settings',
    'business_payment_methods',
    'payout_transactions'
  ]
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error && error.code === '42P01') {
        console.log(`❌ Table ${table} does not exist`)
      } else {
        console.log(`✅ Table ${table} exists`)
      }
    } catch (err) {
      console.log(`❌ Error checking table ${table}:`, err.message)
    }
  }
}

async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...')
  
  const endpoints = [
    { method: 'GET', path: '/payments/bank-accounts', name: 'Bank Accounts' },
    { method: 'GET', path: '/payments/payout-settings', name: 'Payout Settings' },
    { method: 'GET', path: '/health', name: 'Health Check' }
  ]
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${API_BASE}${endpoint.path}`, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok || response.status === 401) {
        console.log(`✅ ${endpoint.name} endpoint is responding (${response.status})`)
      } else {
        console.log(`❌ ${endpoint.name} endpoint returned ${response.status}`)
      }
    } catch (err) {
      console.log(`❌ ${endpoint.name} endpoint is not accessible:`, err.message)
    }
  }
}

async function testStripeService() {
  console.log('\n🔍 Testing Stripe Service...')
  
  try {
    const { stripeService } = require('./services/stripe-service')
    
    const healthCheck = await stripeService.healthCheck()
    
    if (healthCheck.status === 'healthy') {
      console.log('✅ Stripe service is healthy')
    } else if (healthCheck.status === 'not_configured') {
      console.log('⚠️ Stripe API key not configured')
    } else {
      console.log('❌ Stripe service error:', healthCheck.message)
    }
    
    // Check if Connect methods exist
    const connectMethods = [
      'createConnectedAccount',
      'createAccountLink',
      'retrieveAccount',
      'createBankAccount',
      'updatePayoutSchedule',
      'createLoginLink'
    ]
    
    for (const method of connectMethods) {
      if (typeof stripeService[method] === 'function') {
        console.log(`✅ Stripe Connect method '${method}' exists`)
      } else {
        console.log(`❌ Stripe Connect method '${method}' not found`)
      }
    }
    
  } catch (err) {
    console.log('❌ Error testing Stripe service:', err.message)
  }
}

async function testWebhookHandlers() {
  console.log('\n🔍 Testing Webhook Handlers...')
  
  const webhookEvents = [
    'account.updated',
    'account.application.deauthorized',
    'capability.updated',
    'payout.created',
    'payout.paid',
    'payout.failed',
    'external_account.created',
    'external_account.updated'
  ]
  
  // Read webhook handler file to check for event handlers
  const fs = require('fs')
  const path = require('path')
  
  try {
    const webhookFile = fs.readFileSync(
      path.join(__dirname, 'app/api/webhooks/stripe/route.js'),
      'utf8'
    )
    
    for (const event of webhookEvents) {
      if (webhookFile.includes(`case '${event}':`)) {
        console.log(`✅ Webhook handler for '${event}' exists`)
      } else {
        console.log(`❌ Webhook handler for '${event}' not found`)
      }
    }
  } catch (err) {
    console.log('❌ Error reading webhook file:', err.message)
  }
}

async function testFastAPIIntegration() {
  console.log('\n🔍 Testing FastAPI Integration...')
  
  try {
    const response = await fetch('http://localhost:8001/api/payments/health')
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ FastAPI payment router is healthy')
      console.log(`   - Stripe configured: ${data.stripe_configured}`)
      console.log(`   - Database connected: ${data.database_connected}`)
    } else {
      console.log(`⚠️ FastAPI payment router returned ${response.status}`)
    }
  } catch (err) {
    console.log('❌ FastAPI backend not accessible:', err.message)
    console.log('   Run: python fastapi_backend.py')
  }
}

async function runAllTests() {
  console.log('🚀 Payment Processing Setup Test')
  console.log('================================')
  
  await testDatabaseTables()
  await testAPIEndpoints()
  await testStripeService()
  await testWebhookHandlers()
  await testFastAPIIntegration()
  
  console.log('\n================================')
  console.log('✨ Test Summary:')
  console.log('1. Run database migration if tables are missing:')
  console.log('   Copy contents of database/migrations/004_payment_processing.sql')
  console.log('   to Supabase SQL Editor and execute')
  console.log('')
  console.log('2. Set environment variables in .env.local:')
  console.log('   STRIPE_SECRET_KEY=sk_test_...')
  console.log('   STRIPE_WEBHOOK_SECRET=whsec_...')
  console.log('   STRIPE_CONNECT_CLIENT_ID=ca_...')
  console.log('')
  console.log('3. Configure Stripe Connect in Dashboard:')
  console.log('   https://dashboard.stripe.com/test/connect/accounts/overview')
  console.log('')
  console.log('4. Test the onboarding flow:')
  console.log('   Navigate to /dashboard and go through onboarding')
  console.log('   Step 5 (Payment Setup) should now have bank account setup')
}

// Run tests
runAllTests().catch(console.error)