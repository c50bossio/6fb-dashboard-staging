#!/usr/bin/env node

/**
 * Test All Feature Connections
 * Verifies that all the connected features are working properly
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(`${colors.red}❌ Missing Supabase credentials${colors.reset}`)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAppointmentAPI() {
  console.log(`\n${colors.blue}🧪 Testing Appointment API...${colors.reset}`)
  
  try {
    // Test GET appointments
    const response = await fetch('http://localhost:9999/api/appointments', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      console.log(`${colors.green}✅ Appointment API GET - Working${colors.reset}`)
      return true
    } else {
      console.log(`${colors.red}❌ Appointment API GET - Status: ${response.status}${colors.reset}`)
      return false
    }
  } catch (error) {
    console.log(`${colors.red}❌ Appointment API - Error: ${error.message}${colors.reset}`)
    return false
  }
}

async function testBookingAPI() {
  console.log(`\n${colors.blue}🧪 Testing Booking API...${colors.reset}`)
  
  try {
    const response = await fetch('http://localhost:9999/api/bookings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      console.log(`${colors.green}✅ Booking API - Working${colors.reset}`)
      return true
    } else {
      console.log(`${colors.red}❌ Booking API - Status: ${response.status}${colors.reset}`)
      return false
    }
  } catch (error) {
    console.log(`${colors.red}❌ Booking API - Error: ${error.message}${colors.reset}`)
    return false
  }
}

async function testCIN7Tables() {
  console.log(`\n${colors.blue}🧪 Testing CIN7 Database Tables...${colors.reset}`)
  
  const tables = [
    'inventory_checks',
    'sale_syncs',
    'external_sales',
    'inventory_alerts',
    'webhook_logs'
  ]
  
  let allTablesExist = true
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1)
      
      if (error) {
        console.log(`${colors.red}❌ Table '${table}' - Not found${colors.reset}`)
        allTablesExist = false
      } else {
        console.log(`${colors.green}✅ Table '${table}' - Exists${colors.reset}`)
      }
    } catch (error) {
      console.log(`${colors.red}❌ Table '${table}' - Error: ${error.message}${colors.reset}`)
      allTablesExist = false
    }
  }
  
  return allTablesExist
}

async function testSendGridService() {
  console.log(`\n${colors.blue}🧪 Testing SendGrid Service...${colors.reset}`)
  
  try {
    const service = require('./services/service-loader')
    
    if (service.sendGridService) {
      // Check if it's the production service
      const serviceName = service.sendGridService.constructor.name
      
      if (serviceName.includes('Production') || serviceName.includes('SendGrid')) {
        console.log(`${colors.green}✅ SendGrid Production Service - Loaded${colors.reset}`)
        
        // Check if API key is configured
        if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('placeholder')) {
          console.log(`${colors.green}✅ SendGrid API Key - Configured${colors.reset}`)
          return true
        } else {
          console.log(`${colors.yellow}⚠️  SendGrid API Key - Not configured (using mock)${colors.reset}`)
          return false
        }
      } else if (serviceName.includes('Mock')) {
        console.log(`${colors.yellow}⚠️  SendGrid - Using mock service${colors.reset}`)
        return false
      }
    } else {
      console.log(`${colors.red}❌ SendGrid Service - Not loaded${colors.reset}`)
      return false
    }
  } catch (error) {
    console.log(`${colors.red}❌ SendGrid Service - Error: ${error.message}${colors.reset}`)
    return false
  }
}

async function testFastAPIConnection() {
  console.log(`\n${colors.blue}🧪 Testing FastAPI Backend...${colors.reset}`)
  
  try {
    const response = await fetch('http://localhost:8000/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (response.ok) {
      console.log(`${colors.green}✅ FastAPI Backend - Running${colors.reset}`)
      return true
    } else {
      console.log(`${colors.yellow}⚠️  FastAPI Backend - Not running (start with: uvicorn fastapi_backend:app)${colors.reset}`)
      return false
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  FastAPI Backend - Not running${colors.reset}`)
    return false
  }
}

async function runAllTests() {
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`)
  console.log(`${colors.blue}🚀 Testing All Feature Connections${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`)
  
  const results = {
    appointments: await testAppointmentAPI(),
    bookings: await testBookingAPI(),
    cin7Tables: await testCIN7Tables(),
    sendGrid: await testSendGridService(),
    fastAPI: await testFastAPIConnection()
  }
  
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}`)
  console.log(`${colors.blue}📊 Test Summary${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}`)
  
  const passed = Object.values(results).filter(r => r).length
  const total = Object.values(results).length
  const percentage = Math.round((passed / total) * 100)
  
  console.log(`\n${colors.blue}Results: ${passed}/${total} tests passed (${percentage}%)${colors.reset}`)
  
  if (passed === total) {
    console.log(`\n${colors.green}🎉 All connections are working correctly!${colors.reset}`)
    console.log(`${colors.green}✨ Your features are now fully connected and production-ready!${colors.reset}`)
  } else {
    console.log(`\n${colors.yellow}⚠️  Some connections need attention:${colors.reset}`)
    
    if (!results.cin7Tables) {
      console.log(`\n${colors.yellow}To fix CIN7 tables:${colors.reset}`)
      console.log('1. Open Supabase SQL Editor')
      console.log('2. Run the SQL from create-pos-integration-tables.sql')
    }
    
    if (!results.sendGrid) {
      console.log(`\n${colors.yellow}To fix SendGrid:${colors.reset}`)
      console.log('1. Add SENDGRID_API_KEY to your .env file')
      console.log('2. Restart the application')
    }
    
    if (!results.fastAPI) {
      console.log(`\n${colors.yellow}To start FastAPI:${colors.reset}`)
      console.log('Run: uvicorn fastapi_backend:app --reload')
    }
  }
  
  console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n`)
}

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`)
    process.exit(1)
  })