/**
 * Trafft Database Service
 * Handles all database operations for Trafft integration
 */

import pkg from 'pg'
const { Pool } = pkg
import crypto from 'crypto'

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/6fb_ai_agent_system',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

/**
 * Encrypt sensitive data (credentials, API keys)
 */
function encryptCredentials(data) {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  const key = crypto.scryptSync(secretKey, 'salt', 32)
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipher(algorithm, key)
  cipher.setAAD(Buffer.from('trafft-credentials', 'utf8'))
  
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

/**
 * Decrypt sensitive data
 */
function decryptCredentials(encryptedData) {
  try {
    const algorithm = 'aes-256-gcm'
    const secretKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
    const key = crypto.scryptSync(secretKey, 'salt', 32)
    
    const decipher = crypto.createDecipher(algorithm, key)
    decipher.setAAD(Buffer.from('trafft-credentials', 'utf8'))
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('Credential decryption failed:', error)
    throw new Error('Failed to decrypt credentials')
  }
}

/**
 * Generate sync hash for change detection
 */
function generateSyncHash(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')
}

// ==========================================
// INTEGRATION MANAGEMENT
// ==========================================

/**
 * Store Trafft integration credentials
 */
export async function storeIntegrationCredentials(barbershopId, credentials) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Encrypt credentials
    const encryptedCredentials = encryptCredentials({
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret
    })
    
    // Check if integration already exists
    const existingResult = await client.query(
      'SELECT id FROM integrations WHERE barbershop_id = $1 AND provider = $2',
      [barbershopId, 'trafft']
    )
    
    let integrationId
    
    if (existingResult.rows.length > 0) {
      // Update existing integration
      integrationId = existingResult.rows[0].id
      await client.query(`
        UPDATE integrations 
        SET credentials = $1, 
            status = $2, 
            authenticated_at = NOW(), 
            updated_at = NOW(),
            last_error = NULL
        WHERE id = $3
      `, [JSON.stringify(encryptedCredentials), 'active', integrationId])
    } else {
      // Create new integration
      const insertResult = await client.query(`
        INSERT INTO integrations (
          barbershop_id, provider, name, description, status, 
          credentials, authenticated_at, sync_settings
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        RETURNING id
      `, [
        barbershopId,
        'trafft',
        'Trafft Booking System',
        'Integration with Trafft booking and scheduling platform',
        'active',
        JSON.stringify(encryptedCredentials),
        JSON.stringify({
          syncInterval: '1h',
          autoSync: true,
          syncTypes: ['appointments', 'customers', 'services', 'employees']
        })
      ])
      
      integrationId = insertResult.rows[0].id
    }
    
    await client.query('COMMIT')
    return integrationId
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error storing integration credentials:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get integration credentials
 */
export async function getIntegrationCredentials(barbershopId, provider = 'trafft') {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT id, credentials, status, authenticated_at, last_sync_at, sync_settings
      FROM integrations 
      WHERE barbershop_id = $1 AND provider = $2 AND status = 'active'
    `, [barbershopId, provider])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const integration = result.rows[0]
    const decryptedCredentials = decryptCredentials(integration.credentials)
    
    return {
      integrationId: integration.id,
      ...decryptedCredentials,
      status: integration.status,
      authenticatedAt: integration.authenticated_at,
      lastSyncAt: integration.last_sync_at,
      syncSettings: integration.sync_settings
    }
    
  } catch (error) {
    console.error('Error getting integration credentials:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get integration status
 */
export async function getIntegrationStatus(barbershopId, provider = 'trafft') {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT id, provider, name, status, authenticated_at, last_sync_at, 
             last_error, sync_settings, feature_flags
      FROM integrations 
      WHERE barbershop_id = $1 AND provider = $2
    `, [barbershopId, provider])
    
    if (result.rows.length === 0) {
      return null
    }
    
    const integration = result.rows[0]
    
    return {
      integrationId: integration.id,
      barbershopId,
      provider: integration.provider,
      name: integration.name,
      status: integration.status,
      authenticatedAt: integration.authenticated_at,
      lastSyncAt: integration.last_sync_at,
      lastError: integration.last_error,
      features: {
        appointments: true,
        customers: true,
        services: true,
        employees: true,
        analytics: true,
        ...integration.feature_flags
      },
      syncSettings: integration.sync_settings
    }
    
  } catch (error) {
    console.error('Error getting integration status:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Remove integration
 */
export async function removeIntegration(barbershopId, provider = 'trafft') {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Delete all related data
    await client.query('DELETE FROM integrations WHERE barbershop_id = $1 AND provider = $2', [barbershopId, provider])
    
    await client.query('COMMIT')
    return true
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error removing integration:', error)
    throw error
  } finally {
    client.release()
  }
}

// ==========================================
// SYNC OPERATIONS
// ==========================================

/**
 * Create sync operation record
 */
export async function createSyncOperation(integrationId, barbershopId, syncType, dateFrom, dateTo) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      INSERT INTO sync_operations (
        integration_id, barbershop_id, sync_type, status, 
        date_from, date_to, started_at
      ) VALUES ($1, $2, $3, 'pending', $4, $5, NOW())
      RETURNING id
    `, [integrationId, barbershopId, syncType, dateFrom, dateTo])
    
    return result.rows[0].id
    
  } catch (error) {
    console.error('Error creating sync operation:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Update sync operation status and results
 */
export async function updateSyncOperation(syncId, status, results = {}) {
  const client = await pool.connect()
  
  try {
    const updateData = {
      status,
      records_processed: results.recordsProcessed || 0,
      records_success: results.recordsSuccess || 0,
      records_failed: results.recordsFailed || 0,
      summary: JSON.stringify(results.summary || {}),
      errors: JSON.stringify(results.errors || [])
    }
    
    if (status === 'success' || status === 'failed') {
      updateData.completed_at = 'NOW()'
    }
    
    const setClause = Object.keys(updateData)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ')
    
    const values = [syncId, ...Object.values(updateData)]
    
    await client.query(`
      UPDATE sync_operations 
      SET ${setClause}
      WHERE id = $1
    `, values)
    
    // Update integration last sync time
    if (status === 'success') {
      await client.query(`
        UPDATE integrations 
        SET last_sync_at = NOW(), last_error = NULL 
        WHERE id = (SELECT integration_id FROM sync_operations WHERE id = $1)
      `, [syncId])
    }
    
  } catch (error) {
    console.error('Error updating sync operation:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get sync history
 */
export async function getSyncHistory(barbershopId, provider = 'trafft', limit = 10) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT so.id, so.sync_type, so.status, so.started_at, so.completed_at,
             so.records_processed, so.records_success, so.records_failed,
             so.summary, so.errors, so.duration_seconds
      FROM sync_operations so
      JOIN integrations i ON so.integration_id = i.id
      WHERE so.barbershop_id = $1 AND i.provider = $2
      ORDER BY so.started_at DESC
      LIMIT $3
    `, [barbershopId, provider, limit])
    
    return result.rows.map(row => ({
      id: row.id,
      barbershopId,
      provider,
      syncType: row.sync_type,
      status: row.status,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      duration: row.duration_seconds,
      summary: row.summary,
      recordsProcessed: row.records_processed,
      recordsSuccess: row.records_success,
      recordsFailed: row.records_failed,
      errors: row.errors
    }))
    
  } catch (error) {
    console.error('Error getting sync history:', error)
    throw error
  } finally {
    client.release()
  }
}

// ==========================================
// EXTERNAL DATA STORAGE
// ==========================================

/**
 * Store external appointments
 */
export async function storeExternalAppointments(integrationId, barbershopId, appointments) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let successCount = 0
    let failedCount = 0
    const errors = []
    
    for (const appointment of appointments) {
      try {
        const syncHash = generateSyncHash(appointment)
        
        await client.query(`
          INSERT INTO external_appointments (
            integration_id, barbershop_id, external_id, external_data,
            client_name, client_email, client_phone, employee_name, service_name,
            scheduled_at, duration_minutes, price, status, sync_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (integration_id, external_id) 
          DO UPDATE SET
            external_data = $4,
            client_name = $5,
            client_email = $6,
            client_phone = $7,
            employee_name = $8,
            service_name = $9,
            scheduled_at = $10,
            duration_minutes = $11,
            price = $12,
            status = $13,
            sync_hash = $14,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          integrationId,
          barbershopId,
          appointment.id,
          JSON.stringify(appointment),
          appointment.clientName || appointment.customerName,
          appointment.clientEmail || appointment.customerEmail,
          appointment.clientPhone || appointment.customerPhone,
          appointment.employeeName || appointment.barberName,
          appointment.serviceName,
          appointment.dateTime || appointment.scheduledAt,
          appointment.duration || 60,
          parseFloat(appointment.price || 0),
          appointment.status,
          syncHash
        ])
        
        successCount++
      } catch (error) {
        failedCount++
        errors.push({
          appointmentId: appointment.id,
          error: error.message
        })
      }
    }
    
    await client.query('COMMIT')
    
    return {
      total: appointments.length,
      success: successCount,
      failed: failedCount,
      errors
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error storing external appointments:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Store external customers
 */
export async function storeExternalCustomers(integrationId, barbershopId, customers) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let successCount = 0
    let failedCount = 0
    const errors = []
    
    for (const customer of customers) {
      try {
        const syncHash = generateSyncHash(customer)
        
        await client.query(`
          INSERT INTO external_customers (
            integration_id, barbershop_id, external_id, external_data,
            first_name, last_name, email, phone,
            total_appointments, total_spent, sync_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (integration_id, external_id)
          DO UPDATE SET
            external_data = $4,
            first_name = $5,
            last_name = $6,
            email = $7,
            phone = $8,
            total_appointments = $9,
            total_spent = $10,
            sync_hash = $11,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          integrationId,
          barbershopId,
          customer.id,
          JSON.stringify(customer),
          customer.firstName,
          customer.lastName,
          customer.email,
          customer.phone,
          customer.totalAppointments || 0,
          parseFloat(customer.totalSpent || 0),
          syncHash
        ])
        
        successCount++
      } catch (error) {
        failedCount++
        errors.push({
          customerId: customer.id,
          error: error.message
        })
      }
    }
    
    await client.query('COMMIT')
    
    return {
      total: customers.length,
      success: successCount,
      failed: failedCount,
      errors
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error storing external customers:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Store external services
 */
export async function storeExternalServices(integrationId, barbershopId, services) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let successCount = 0
    let failedCount = 0
    const errors = []
    
    for (const service of services) {
      try {
        const syncHash = generateSyncHash(service)
        
        await client.query(`
          INSERT INTO external_services (
            integration_id, barbershop_id, external_id, external_data,
            name, description, duration_minutes, price, category, is_active, sync_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (integration_id, external_id)
          DO UPDATE SET
            external_data = $4,
            name = $5,
            description = $6,
            duration_minutes = $7,
            price = $8,
            category = $9,
            is_active = $10,
            sync_hash = $11,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          integrationId,
          barbershopId,
          service.id,
          JSON.stringify(service),
          service.name,
          service.description,
          service.duration || 60,
          parseFloat(service.price || 0),
          service.category,
          service.isActive !== false,
          syncHash
        ])
        
        successCount++
      } catch (error) {
        failedCount++
        errors.push({
          serviceId: service.id,
          error: error.message
        })
      }
    }
    
    await client.query('COMMIT')
    
    return {
      total: services.length,
      success: successCount,
      failed: failedCount,
      errors
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error storing external services:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Store external employees
 */
export async function storeExternalEmployees(integrationId, barbershopId, employees) {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    let successCount = 0
    let failedCount = 0
    const errors = []
    
    for (const employee of employees) {
      try {
        const syncHash = generateSyncHash(employee)
        
        await client.query(`
          INSERT INTO external_employees (
            integration_id, barbershop_id, external_id, external_data,
            first_name, last_name, email, phone, specialties, sync_hash
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (integration_id, external_id)
          DO UPDATE SET
            external_data = $4,
            first_name = $5,
            last_name = $6,
            email = $7,
            phone = $8,
            specialties = $9,
            sync_hash = $10,
            last_synced_at = NOW(),
            updated_at = NOW()
        `, [
          integrationId,
          barbershopId,
          employee.id,
          JSON.stringify(employee),
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.phone,
          employee.specialties || [],
          syncHash
        ])
        
        successCount++
      } catch (error) {
        failedCount++
        errors.push({
          employeeId: employee.id,
          error: error.message
        })
      }
    }
    
    await client.query('COMMIT')
    
    return {
      total: employees.length,
      success: successCount,
      failed: failedCount,
      errors
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error storing external employees:', error)
    throw error
  } finally {
    client.release()
  }
}

// ==========================================
// ANALYTICS STORAGE
// ==========================================

/**
 * Store integration analytics
 */
export async function storeIntegrationAnalytics(integrationId, barbershopId, analytics, date = new Date()) {
  const client = await pool.connect()
  
  try {
    const dateStr = date.toISOString().split('T')[0]
    
    await client.query(`
      INSERT INTO integration_analytics (
        integration_id, barbershop_id, date, period_type,
        external_appointments, external_completed, external_cancelled,
        external_revenue, external_avg_ticket,
        external_new_clients, external_returning_clients,
        capacity_utilization, peak_hours, popular_services,
        ai_insights, recommendations, alerts, growth_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (integration_id, date, period_type)
      DO UPDATE SET
        external_appointments = $5,
        external_completed = $6,
        external_cancelled = $7,
        external_revenue = $8,
        external_avg_ticket = $9,
        external_new_clients = $10,
        external_returning_clients = $11,
        capacity_utilization = $12,
        peak_hours = $13,
        popular_services = $14,
        ai_insights = $15,
        recommendations = $16,
        alerts = $17,
        growth_metrics = $18
    `, [
      integrationId,
      barbershopId,
      dateStr,
      'daily',
      analytics.appointments?.total || 0,
      analytics.appointments?.total || 0, // Assuming completed for now
      0, // Cancelled - would need to be calculated
      analytics.revenue?.total || 0,
      analytics.revenue?.avgTicket || 0,
      analytics.clients?.new || 0,
      analytics.clients?.returning || 0,
      analytics.businessInsights?.capacityUtilization?.utilizationRate || 0,
      JSON.stringify(analytics.scheduling?.peakHours || []),
      JSON.stringify(analytics.services?.popular || []),
      JSON.stringify(analytics.businessInsights || {}),
      JSON.stringify(analytics.businessInsights?.revenueGrowthPotential?.recommendations || []),
      JSON.stringify([]), // Alerts would be calculated separately
      JSON.stringify(analytics.businessInsights || {})
    ])
    
  } catch (error) {
    console.error('Error storing integration analytics:', error)
    throw error
  } finally {
    client.release()
  }
}

// ==========================================
// WEBHOOK EVENTS
// ==========================================

/**
 * Store webhook event
 */
export async function storeWebhookEvent(integrationId, barbershopId, eventType, payload, headers = {}) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      INSERT INTO webhook_events (
        integration_id, barbershop_id, event_type, event_id,
        payload, headers, received_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id
    `, [
      integrationId,
      barbershopId,
      eventType,
      payload.id || payload.event_id || null,
      JSON.stringify(payload),
      JSON.stringify(headers)
    ])
    
    return result.rows[0].id
    
  } catch (error) {
    console.error('Error storing webhook event:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Mark webhook event as processed
 */
export async function markWebhookProcessed(eventId, responseStatus = 200, responseData = null, error = null) {
  const client = await pool.connect()
  
  try {
    await client.query(`
      UPDATE webhook_events 
      SET processed = true, 
          processed_at = NOW(),
          response_status = $2,
          response_data = $3,
          processing_error = $4
      WHERE id = $1
    `, [eventId, responseStatus, JSON.stringify(responseData), error])
    
  } catch (error) {
    console.error('Error marking webhook as processed:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Get unprocessed webhook events
 */
export async function getUnprocessedWebhookEvents(integrationId, limit = 100) {
  const client = await pool.connect()
  
  try {
    const result = await client.query(`
      SELECT id, event_type, event_id, payload, headers, received_at
      FROM webhook_events
      WHERE integration_id = $1 AND processed = false
      ORDER BY received_at ASC
      LIMIT $2
    `, [integrationId, limit])
    
    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      eventId: row.event_id,
      payload: row.payload,
      headers: row.headers,
      receivedAt: row.received_at
    }))
    
  } catch (error) {
    console.error('Error getting unprocessed webhook events:', error)
    throw error
  } finally {
    client.release()
  }
}

// Export pool for advanced queries
export { pool }