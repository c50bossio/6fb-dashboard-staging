/**
 * Database Test Helpers for Phase 4 Migration Testing
 * Provides utilities for seeding test data, validating schema, and cleaning up
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials in environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Load test fixtures
const loadFixture = (fixtureName) => {
  const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.json`)
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
}

/**
 * Seed test appointments into the database
 * @param {number} count - Number of test appointments to create
 * @returns {Promise<Array>} Array of created appointment IDs
 */
async function seedTestAppointments(count = 10) {
  const appointments = loadFixture('test-appointments')
  const createdIds = []

  // Use valid appointment templates
  const templates = [
    appointments.validAppointment,
    appointments.walkInAppointment,
    appointments.futureAppointment
  ]

  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length]
    const testAppointment = {
      ...template,
      // Generate unique times to avoid conflicts
      appointment_time: `${10 + i}:00:00`,
      appointment_date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(testAppointment)
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to seed appointment ${i}:`, error)
      continue
    }

    createdIds.push(data.id)
  }

  return createdIds
}

/**
 * Clean all test data from the database
 * @returns {Promise<Object>} Cleanup results
 */
async function cleanTestData() {
  const results = {
    appointments: 0,
    profiles: 0,
    services: 0
  }

  // Delete test appointments (those with test- prefix in IDs)
  const { data: appointmentsData, error: appointmentsError } = await supabase
    .from('appointments')
    .delete()
    .ilike('barbershop_id', 'test-%')
    .select('id')

  if (!appointmentsError) {
    results.appointments = appointmentsData?.length || 0
  }

  return results
}

/**
 * Verify database schema matches expected structure
 * @returns {Promise<Object>} Schema validation results
 */
async function verifySchema() {
  const results = {
    valid: true,
    errors: [],
    warnings: []
  }

  // Check if appointments table exists and has correct columns
  const expectedColumns = [
    'id',
    'barbershop_id',
    'client_id',
    'barber_id',
    'service_id',
    'appointment_date',
    'appointment_time',
    'duration_minutes',
    'status',
    'total_price_cents',
    'deposit_paid_cents',
    'client_notes',
    'barber_notes',
    'metadata',
    'google_event_id',
    'created_at',
    'updated_at'
  ]

  // Query to check table structure
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .limit(1)

  if (error) {
    results.valid = false
    results.errors.push(`Failed to query appointments table: ${error.message}`)
    return results
  }

  // Check if all expected columns exist
  const actualColumns = data.length > 0 ? Object.keys(data[0]) : []

  expectedColumns.forEach(col => {
    if (!actualColumns.includes(col) && data.length > 0) {
      results.warnings.push(`Column '${col}' not found in appointments table`)
    }
  })

  // Check for legacy field names that should not exist
  const legacyFields = ['customer_id', 'date', 'time', 'price']
  legacyFields.forEach(field => {
    if (actualColumns.includes(field)) {
      results.errors.push(`Legacy field '${field}' still exists in appointments table`)
      results.valid = false
    }
  })

  return results
}

/**
 * Check referential integrity of appointments
 * @returns {Promise<Object>} Integrity check results
 */
async function checkReferentialIntegrity() {
  const results = {
    valid: true,
    orphanedRecords: {
      appointments: [],
      missingClients: [],
      missingBarbers: [],
      missingServices: [],
      missingBarbershops: []
    }
  }

  // Check for appointments with invalid client_id references
  const { data: appointmentsWithInvalidClients } = await supabase.rpc(
    'check_invalid_client_references',
    {},
    { count: 'exact' }
  ).catch(() => ({ data: [] }))

  if (appointmentsWithInvalidClients?.length > 0) {
    results.valid = false
    results.orphanedRecords.missingClients = appointmentsWithInvalidClients
  }

  // Get all appointments
  const { data: allAppointments } = await supabase
    .from('appointments')
    .select('id, client_id, barber_id, service_id, barbershop_id')

  if (!allAppointments) return results

  // Check each relationship
  for (const appointment of allAppointments) {
    // Check client_id
    if (appointment.client_id) {
      const { data: client } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', appointment.client_id)
        .single()

      if (!client) {
        results.valid = false
        results.orphanedRecords.missingClients.push(appointment.id)
      }
    }

    // Check barber_id
    if (appointment.barber_id) {
      const { data: barber } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', appointment.barber_id)
        .single()

      if (!barber) {
        results.valid = false
        results.orphanedRecords.missingBarbers.push(appointment.id)
      }
    }
  }

  return results
}

/**
 * Verify all required fields are populated
 * @returns {Promise<Object>} Field validation results
 */
async function verifyRequiredFields() {
  const results = {
    valid: true,
    issues: []
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')

  if (!appointments) return results

  const requiredFields = [
    'barbershop_id',
    'barber_id',
    'appointment_date',
    'appointment_time',
    'duration_minutes',
    'status',
    'total_price_cents'
  ]

  appointments.forEach(appointment => {
    requiredFields.forEach(field => {
      if (appointment[field] === null || appointment[field] === undefined) {
        results.valid = false
        results.issues.push({
          appointmentId: appointment.id,
          field: field,
          message: `Required field '${field}' is null or undefined`
        })
      }
    })
  })

  return results
}

/**
 * Verify date and time formats are consistent
 * @returns {Promise<Object>} Format validation results
 */
async function verifyDateTimeFormats() {
  const results = {
    valid: true,
    issues: []
  }

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, appointment_date, appointment_time')

  if (!appointments) return results

  appointments.forEach(appointment => {
    // Check date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(appointment.appointment_date)) {
      results.valid = false
      results.issues.push({
        appointmentId: appointment.id,
        field: 'appointment_date',
        value: appointment.appointment_date,
        message: 'Invalid date format, expected YYYY-MM-DD'
      })
    }

    // Check time format (HH:MM:SS)
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/
    if (!timeRegex.test(appointment.appointment_time)) {
      results.valid = false
      results.issues.push({
        appointmentId: appointment.id,
        field: 'appointment_time',
        value: appointment.appointment_time,
        message: 'Invalid time format, expected HH:MM:SS'
      })
    }
  })

  return results
}

/**
 * Get database statistics for appointments
 * @returns {Promise<Object>} Database statistics
 */
async function getDatabaseStats() {
  const stats = {
    totalAppointments: 0,
    byStatus: {},
    byBarber: {},
    dateRange: { earliest: null, latest: null }
  }

  // Count total appointments
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })

  stats.totalAppointments = count || 0

  // Count by status
  const { data: appointments } = await supabase
    .from('appointments')
    .select('status, barber_id, appointment_date')

  if (appointments) {
    // Group by status
    appointments.forEach(apt => {
      stats.byStatus[apt.status] = (stats.byStatus[apt.status] || 0) + 1
      stats.byBarber[apt.barber_id] = (stats.byBarber[apt.barber_id] || 0) + 1
    })

    // Find date range
    const dates = appointments.map(a => a.appointment_date).sort()
    stats.dateRange.earliest = dates[0]
    stats.dateRange.latest = dates[dates.length - 1]
  }

  return stats
}

module.exports = {
  seedTestAppointments,
  cleanTestData,
  verifySchema,
  checkReferentialIntegrity,
  verifyRequiredFields,
  verifyDateTimeFormats,
  getDatabaseStats,
  loadFixture
}
