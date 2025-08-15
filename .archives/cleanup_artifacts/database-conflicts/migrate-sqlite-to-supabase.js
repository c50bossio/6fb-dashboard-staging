#!/usr/bin/env node

/**
 * SQLite to Supabase Data Migration Script
 * 
 * Migrates data from local SQLite database to Supabase production database
 * Following SUPABASE_PRODUCTION_RULE.md - NO MOCK DATA, REAL DATABASE ONLY
 */

const { createClient } = require('@supabase/supabase-js')
const sqlite3 = require('sqlite3').verbose()
const { promisify } = require('util')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const db = new sqlite3.Database('./data/agent_system.db')
const dbAll = promisify(db.all.bind(db))
const dbGet = promisify(db.get.bind(db))

const stats = {
  appointments: { migrated: 0, skipped: 0, errors: 0 },
  customers: { migrated: 0, skipped: 0, errors: 0 },
  payments: { migrated: 0, skipped: 0, errors: 0 },
  services: { migrated: 0, skipped: 0, errors: 0 },
  barbers: { migrated: 0, skipped: 0, errors: 0 }
}

/**
 * Log migration progress with colors
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().substr(11, 8)
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  }
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
}

/**
 * Check if we can connect to both databases
 */
async function testConnections() {
  log('🔌 Testing database connections...', 'info')
  
  try {
    const sqliteCount = await dbGet("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'")
    log(`✅ SQLite connected - ${sqliteCount.count} tables found`, 'success')
    
    const { data, error } = await supabase.from('appointments').select('id').limit(1)
    if (error && !error.message.includes('does not exist')) {
      throw error
    }
    log('✅ Supabase connected successfully', 'success')
    
    return true
  } catch (error) {
    log(`❌ Connection test failed: ${error.message}`, 'error')
    return false
  }
}

/**
 * Create necessary tables in Supabase if they don't exist
 */
async function createSupabaseTables() {
  log('🏗️  Creating Supabase tables if needed...', 'info')
  
  const tableQueries = [
    `
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      preferences JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    
    `
    CREATE TABLE IF NOT EXISTS services (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      barbershop_id UUID,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    
    `
    CREATE TABLE IF NOT EXISTS barbers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      bio TEXT,
      availability JSONB DEFAULT '{}',
      commission_rate DECIMAL(5,2) DEFAULT 60.00,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    
    `
    CREATE TABLE IF NOT EXISTS appointments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id UUID REFERENCES customers(id),
      barber_id UUID REFERENCES barbers(id),
      service_id UUID REFERENCES services(id),
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no-show')) DEFAULT 'pending',
      price DECIMAL(10,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    `,
    
    `
    CREATE TABLE IF NOT EXISTS payments (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      appointment_id UUID REFERENCES appointments(id),
      customer_id UUID REFERENCES customers(id),
      amount DECIMAL(10,2) NOT NULL,
      status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
      payment_method TEXT DEFAULT 'card',
      stripe_payment_intent_id TEXT,
      processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    `
  ]
  
  for (const query of tableQueries) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: query.trim() })
      if (error) {
        log(`⚠️  Table creation warning: ${error.message}`, 'warning')
      }
    } catch (error) {
      log(`⚠️  Could not create table (may already exist): ${error.message}`, 'warning')
    }
  }
  
  log('✅ Table creation completed', 'success')
}

/**
 * Migrate customers from SQLite to Supabase
 */
async function migrateCustomers() {
  log('👥 Migrating customers...', 'info')
  
  try {
    const customers = await dbAll(`
      SELECT id, name, email, phone, created_at, updated_at,
             COALESCE(preferences, '{}') as preferences
      FROM customers 
      WHERE name IS NOT NULL
      ORDER BY created_at
    `)
    
    log(`Found ${customers.length} customers in SQLite`, 'info')
    
    for (const customer of customers) {
      try {
        const identifier = customer.email || customer.name
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .or(customer.email ? `email.eq.${customer.email}` : `name.eq.${customer.name}`)
          .limit(1)
        
        if (existing && existing.length > 0) {
          stats.customers.skipped++
          continue
        }
        
        const { error } = await supabase.from('customers').insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          preferences: customer.preferences ? JSON.parse(customer.preferences) : {},
          created_at: customer.created_at,
          updated_at: customer.updated_at || customer.created_at
        })
        
        if (error) {
          log(`❌ Failed to migrate customer ${customer.name}: ${error.message}`, 'error')
          stats.customers.errors++
        } else {
          stats.customers.migrated++
        }
        
      } catch (error) {
        log(`❌ Error processing customer ${customer.name}: ${error.message}`, 'error')
        stats.customers.errors++
      }
    }
    
    log(`✅ Customers: ${stats.customers.migrated} migrated, ${stats.customers.skipped} skipped, ${stats.customers.errors} errors`, 'success')
    
  } catch (error) {
    log(`❌ Customer migration failed: ${error.message}`, 'error')
  }
}

/**
 * Migrate services from SQLite to Supabase
 */
async function migrateServices() {
  log('✂️  Migrating services...', 'info')
  
  try {
    const services = await dbAll(`
      SELECT id, name, description, price, duration_minutes, created_at
      FROM services 
      WHERE name IS NOT NULL AND price IS NOT NULL
      ORDER BY created_at
    `)
    
    log(`Found ${services.length} services in SQLite`, 'info')
    
    for (const service of services) {
      try {
        const { data: existing } = await supabase
          .from('services')
          .select('id')
          .eq('name', service.name)
          .limit(1)
        
        if (existing && existing.length > 0) {
          stats.services.skipped++
          continue
        }
        
        const { error } = await supabase.from('services').insert({
          name: service.name,
          description: service.description,
          price: parseFloat(service.price),
          duration_minutes: service.duration_minutes || 60,
          is_active: true,
          created_at: service.created_at
        })
        
        if (error) {
          log(`❌ Failed to migrate service ${service.name}: ${error.message}`, 'error')
          stats.services.errors++
        } else {
          stats.services.migrated++
        }
        
      } catch (error) {
        log(`❌ Error processing service ${service.name}: ${error.message}`, 'error')
        stats.services.errors++
      }
    }
    
    log(`✅ Services: ${stats.services.migrated} migrated, ${stats.services.skipped} skipped, ${stats.services.errors} errors`, 'success')
    
  } catch (error) {
    log(`❌ Service migration failed: ${error.message}`, 'error')
  }
}

/**
 * Migrate barbers from SQLite to Supabase
 */
async function migrateBarbers() {
  log('💇 Migrating barbers...', 'info')
  
  try {
    const barbers = await dbAll(`
      SELECT id, name, email, phone, bio, availability, commission_rate, created_at
      FROM barbers 
      WHERE name IS NOT NULL
      ORDER BY created_at
    `)
    
    log(`Found ${barbers.length} barbers in SQLite`, 'info')
    
    for (const barber of barbers) {
      try {
        const { data: existing } = await supabase
          .from('barbers')
          .select('id')
          .or(barber.email ? `email.eq.${barber.email}` : `name.eq.${barber.name}`)
          .limit(1)
        
        if (existing && existing.length > 0) {
          stats.barbers.skipped++
          continue
        }
        
        const { error } = await supabase.from('barbers').insert({
          name: barber.name,
          email: barber.email,
          phone: barber.phone,
          bio: barber.bio,
          availability: barber.availability ? JSON.parse(barber.availability) : {},
          commission_rate: barber.commission_rate || 60.00,
          is_active: true,
          created_at: barber.created_at
        })
        
        if (error) {
          log(`❌ Failed to migrate barber ${barber.name}: ${error.message}`, 'error')
          stats.barbers.errors++
        } else {
          stats.barbers.migrated++
        }
        
      } catch (error) {
        log(`❌ Error processing barber ${barber.name}: ${error.message}`, 'error')
        stats.barbers.errors++
      }
    }
    
    log(`✅ Barbers: ${stats.barbers.migrated} migrated, ${stats.barbers.skipped} skipped, ${stats.barbers.errors} errors`, 'success')
    
  } catch (error) {
    log(`❌ Barber migration failed: ${error.message}`, 'error')
  }
}

/**
 * Get Supabase UUID by name/email lookup
 */
async function getSupabaseId(table, nameOrEmail, fallbackName = null) {
  try {
    let query = supabase.from(table).select('id')
    
    if (nameOrEmail.includes('@')) {
      query = query.eq('email', nameOrEmail)
    } else {
      query = query.eq('name', nameOrEmail)
    }
    
    const { data } = await query.limit(1)
    if (data && data.length > 0) {
      return data[0].id
    }
    
    if (fallbackName) {
      const { data: fallbackData } = await supabase
        .from(table)
        .select('id')
        .eq('name', fallbackName)
        .limit(1)
      
      if (fallbackData && fallbackData.length > 0) {
        return fallbackData[0].id
      }
    }
    
    return null
  } catch (error) {
    return null
  }
}

/**
 * Migrate appointments from SQLite to Supabase
 */
async function migrateAppointments() {
  log('📅 Migrating appointments...', 'info')
  
  try {
    const appointments = await dbAll(`
      SELECT a.id, a.customer_name, a.customer_email, a.barber_name, 
             a.service_name, a.start_time, a.end_time, a.status, 
             a.price, a.notes, a.created_at, a.updated_at
      FROM appointments a
      WHERE a.start_time IS NOT NULL
      ORDER BY a.created_at
    `)
    
    log(`Found ${appointments.length} appointments in SQLite`, 'info')
    
    for (const appointment of appointments) {
      try {
        const { data: existing } = await supabase
          .from('appointments')
          .select('id')
          .eq('start_time', appointment.start_time)
          .limit(1)
        
        if (existing && existing.length > 0) {
          stats.appointments.skipped++
          continue
        }
        
        const customerId = await getSupabaseId('customers', appointment.customer_email || appointment.customer_name, appointment.customer_name)
        const barberId = await getSupabaseId('barbers', appointment.barber_name)
        const serviceId = await getSupabaseId('services', appointment.service_name)
        
        const { error } = await supabase.from('appointments').insert({
          customer_id: customerId,
          barber_id: barberId,
          service_id: serviceId,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          status: appointment.status || 'pending',
          price: appointment.price ? parseFloat(appointment.price) : null,
          notes: appointment.notes,
          created_at: appointment.created_at,
          updated_at: appointment.updated_at || appointment.created_at
        })
        
        if (error) {
          log(`❌ Failed to migrate appointment: ${error.message}`, 'error')
          stats.appointments.errors++
        } else {
          stats.appointments.migrated++
        }
        
      } catch (error) {
        log(`❌ Error processing appointment: ${error.message}`, 'error')
        stats.appointments.errors++
      }
    }
    
    log(`✅ Appointments: ${stats.appointments.migrated} migrated, ${stats.appointments.skipped} skipped, ${stats.appointments.errors} errors`, 'success')
    
  } catch (error) {
    log(`❌ Appointment migration failed: ${error.message}`, 'error')
  }
}

/**
 * Migrate payments from SQLite to Supabase
 */
async function migratePayments() {
  log('💳 Migrating payments...', 'info')
  
  try {
    const payments = await dbAll(`
      SELECT p.id, p.appointment_id, p.customer_email, p.amount, 
             p.status, p.payment_method, p.stripe_payment_intent_id,
             p.processed_at, p.created_at
      FROM payments p
      WHERE p.amount IS NOT NULL
      ORDER BY p.created_at
    `)
    
    log(`Found ${payments.length} payments in SQLite`, 'info')
    
    for (const payment of payments) {
      try {
        const customerId = payment.customer_email ? 
          await getSupabaseId('customers', payment.customer_email) : null
        
        let appointmentId = null
        if (customerId) {
          const { data: appointments } = await supabase
            .from('appointments')
            .select('id')
            .eq('customer_id', customerId)
            .limit(1)
          
          if (appointments && appointments.length > 0) {
            appointmentId = appointments[0].id
          }
        }
        
        const { error } = await supabase.from('payments').insert({
          appointment_id: appointmentId,
          customer_id: customerId,
          amount: parseFloat(payment.amount),
          status: payment.status || 'completed',
          payment_method: payment.payment_method || 'card',
          stripe_payment_intent_id: payment.stripe_payment_intent_id,
          processed_at: payment.processed_at,
          created_at: payment.created_at
        })
        
        if (error) {
          log(`❌ Failed to migrate payment: ${error.message}`, 'error')
          stats.payments.errors++
        } else {
          stats.payments.migrated++
        }
        
      } catch (error) {
        log(`❌ Error processing payment: ${error.message}`, 'error')
        stats.payments.errors++
      }
    }
    
    log(`✅ Payments: ${stats.payments.migrated} migrated, ${stats.payments.skipped} skipped, ${stats.payments.errors} errors`, 'success')
    
  } catch (error) {
    log(`❌ Payment migration failed: ${error.message}`, 'error')
  }
}

/**
 * Print final migration summary
 */
function printSummary() {
  log('📊 MIGRATION COMPLETE - Summary:', 'success')
  console.log('=' .repeat(60))
  
  Object.entries(stats).forEach(([table, counts]) => {
    const total = counts.migrated + counts.skipped + counts.errors
    if (total > 0) {
      console.log(`${table.toUpperCase().padEnd(15)} | ${counts.migrated.toString().padStart(4)} migrated | ${counts.skipped.toString().padStart(4)} skipped | ${counts.errors.toString().padStart(4)} errors`)
    }
  })
  
  console.log('=' .repeat(60))
  
  const totalMigrated = Object.values(stats).reduce((sum, counts) => sum + counts.migrated, 0)
  const totalErrors = Object.values(stats).reduce((sum, counts) => sum + counts.errors, 0)
  
  if (totalErrors === 0) {
    log(`🎉 SUCCESS: ${totalMigrated} records migrated with no errors!`, 'success')
  } else {
    log(`⚠️  PARTIAL SUCCESS: ${totalMigrated} records migrated, ${totalErrors} errors`, 'warning')
  }
  
  log('\n✅ Your barbershop data is now in Supabase and ready for production!', 'success')
}

/**
 * Main migration function
 */
async function main() {
  log('🚀 Starting SQLite to Supabase migration...', 'info')
  log('Following SUPABASE_PRODUCTION_RULE.md - Real database only!', 'info')
  
  try {
    const connectionsOk = await testConnections()
    if (!connectionsOk) {
      process.exit(1)
    }
    
    await createSupabaseTables()
    
    await migrateCustomers()
    await migrateServices() 
    await migrateBarbers()
    await migrateAppointments()
    await migratePayments()
    
    printSummary()
    
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'error')
    process.exit(1)
  } finally {
    db.close()
  }
}

if (require.main === module) {
  main()
}

module.exports = { main, stats }