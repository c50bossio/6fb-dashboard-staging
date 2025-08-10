#!/usr/bin/env node

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

console.log('📋 Calendar Tables Setup Instructions')
console.log('=' .repeat(60))
console.log('')
console.log('The calendar tables need to be created in your Supabase database.')
console.log('')
console.log('🔗 Step 1: Go to Supabase SQL Editor')
console.log('   https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql')
console.log('')
console.log('📝 Step 2: Copy and run this SQL:')
console.log('-'.repeat(60))

// Read and display the schema
const schemaPath = path.join(__dirname, '..', 'database', 'calendar-schema-with-test-flag.sql')
const schema = fs.readFileSync(schemaPath, 'utf8')
console.log(schema)

console.log('-'.repeat(60))
console.log('')
console.log('✅ Step 3: After running the SQL, run:')
console.log('   npm run seed-calendar')
console.log('')
console.log('This will populate your database with test data.')
console.log('')
console.log('💡 To clean up test data later, run:')
console.log('   npm run cleanup-test-data')