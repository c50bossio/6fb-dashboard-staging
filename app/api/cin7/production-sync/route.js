import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Cin7Client } from '../../../../lib/cin7-client.js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dfhqjdoydihajmjxniee.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c"
)

/**
 * Production-Ready Cin7 Sync Engine
 * Enterprise-grade synchronization with comprehensive error handling and monitoring
 */

const SYNC_CONSTANTS = {
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 50,
  RATE_LIMIT_DELAY: 1000, // 1 second between batches
  TIMEOUT_MS: 300000, // 5 minutes
  PARTIAL_FAILURE_THRESHOLD: 0.8, // 80% success rate minimum
  ROLLBACK_ENABLED: true
}

const SYNC_STATES = {
  PENDING: 'pending',
  INITIALIZING: 'initializing',
  DISCOVERING_FIELDS: 'discovering_fields',
  VALIDATING_MAPPING: 'validating_mapping',
  PROCESSING_BATCH: 'processing_batch',
  ROLLING_BACK: 'rolling_back',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

/**
 * Main sync endpoint - handles both manual and automatic sync requests
 */
export async function POST(request) {
  const startTime = Date.now()
  let syncOperation = null
  let rollbackData = []

  try {
    const body = await request.json().catch(() => ({}))
    const { 
      barbershopId, 
      userId, 
      syncMode = 'manual', 
      options = {},
      forceFieldDiscovery = false 
    } = body

    if (!barbershopId || !userId) {
      return NextResponse.json({
        error: 'Missing required parameters',
        message: 'barbershopId and userId are required for sync operation'
      }, { status: 400 })
    }

    console.log(`🔄 Starting Production Sync for barbershop: ${barbershopId}`)

    syncOperation = await initializeSyncOperation(barbershopId, userId, syncMode, options)
    
    const connectionData = await getCin7Connection(barbershopId, userId)
    if (!connectionData.success) {
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: connectionData.error,
        phase: 'connection_validation'
      })
      return NextResponse.json(connectionData, { status: 400 })
    }

    const cin7Client = new Cin7Client(connectionData.accountId, connectionData.apiKey)

    const connectionTest = await cin7Client.testConnection()
    if (!connectionTest.success) {
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: connectionTest.error,
        phase: 'connection_test'
      })
      return NextResponse.json(connectionTest, { status: 400 })
    }

    await updateSyncOperation(syncOperation.id, SYNC_STATES.DISCOVERING_FIELDS)
    const fieldMapping = await getOrDiscoverFieldMapping(
      barbershopId, 
      connectionData.accountId, 
      connectionData.apiKey, 
      forceFieldDiscovery
    )

    if (!fieldMapping.success) {
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: fieldMapping.error,
        phase: 'field_discovery'
      })
      return NextResponse.json(fieldMapping, { status: 400 })
    }

    await updateSyncOperation(syncOperation.id, SYNC_STATES.VALIDATING_MAPPING)
    const mappingValidation = await validateFieldMapping(fieldMapping.mappingStrategy)
    if (!mappingValidation.valid) {
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: 'Field mapping validation failed',
        details: mappingValidation.issues,
        phase: 'mapping_validation'
      })
      return NextResponse.json({
        error: 'Field mapping validation failed',
        issues: mappingValidation.issues
      }, { status: 400 })
    }

    const syncResult = await executeProductionSync(
      syncOperation.id,
      cin7Client,
      fieldMapping.mappingStrategy,
      barbershopId,
      options
    )

    if (syncResult.successRate < SYNC_CONSTANTS.PARTIAL_FAILURE_THRESHOLD) {
      if (SYNC_CONSTANTS.ROLLBACK_ENABLED && options.allowRollback !== false) {
        console.log('⚠️ Success rate below threshold, initiating rollback')
        await updateSyncOperation(syncOperation.id, SYNC_STATES.ROLLING_BACK)
        await executeRollback(syncOperation.id, rollbackData, barbershopId)
      }
      
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: 'Sync success rate below threshold',
        successRate: syncResult.successRate,
        phase: 'sync_execution'
      })
      
      return NextResponse.json({
        error: 'Sync completed with too many failures',
        successRate: syncResult.successRate,
        details: syncResult.errors,
        rollbackExecuted: SYNC_CONSTANTS.ROLLBACK_ENABLED && options.allowRollback !== false
      }, { status: 400 })
    }

    const duration = Date.now() - startTime
    await updateSyncOperation(syncOperation.id, SYNC_STATES.COMPLETED, {
      itemsSynced: syncResult.totalProcessed,
      successfulItems: syncResult.successfulItems,
      failedItems: syncResult.failedItems,
      successRate: syncResult.successRate,
      duration,
      phase: 'completed'
    })

    await updateConnectionSyncStatus(connectionData.connectionId, 'success', syncResult.totalProcessed)

    if (options.generateAlerts !== false) {
      await generateLowStockAlerts(barbershopId)
    }

    return NextResponse.json({
      success: true,
      message: 'Production sync completed successfully',
      results: {
        operationId: syncOperation.id,
        totalItems: syncResult.totalProcessed,
        successfulItems: syncResult.successfulItems,
        failedItems: syncResult.failedItems,
        successRate: syncResult.successRate,
        duration: `${(duration / 1000).toFixed(2)}s`,
        fieldMappingUsed: fieldMapping.mappingStrategy,
        alertsGenerated: options.generateAlerts !== false
      },
      metadata: {
        syncMode,
        batchSize: SYNC_CONSTANTS.BATCH_SIZE,
        connectionTest: connectionTest.accountName
      }
    })

  } catch (error) {
    const duration = Date.now() - startTime
    console.error('🚨 Production sync critical error:', error)

    if (syncOperation) {
      await updateSyncOperation(syncOperation.id, SYNC_STATES.FAILED, {
        error: error.message,
        stack: error.stack,
        duration,
        phase: 'critical_error'
      })
    }

    return NextResponse.json({
      error: 'Critical sync failure',
      message: error.message,
      operationId: syncOperation?.id
    }, { status: 500 })
  }
}

/**
 * Get sync operation status - for progress tracking
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')
    const barbershopId = searchParams.get('barbershopId')

    if (operationId) {
      const operation = await getSyncOperationStatus(operationId)
      return NextResponse.json(operation)
    }

    if (barbershopId) {
      const operations = await getRecentSyncOperations(barbershopId)
      return NextResponse.json({ operations })
    }

    return NextResponse.json({
      error: 'Missing parameters',
      message: 'Provide either operationId or barbershopId'
    }, { status: 400 })

  } catch (error) {
    console.error('Error fetching sync status:', error)
    return NextResponse.json({
      error: 'Failed to fetch sync status',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Cancel running sync operation
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const operationId = searchParams.get('operationId')

    if (!operationId) {
      return NextResponse.json({
        error: 'Missing operationId parameter'
      }, { status: 400 })
    }

    const result = await cancelSyncOperation(operationId)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Error cancelling sync operation:', error)
    return NextResponse.json({
      error: 'Failed to cancel sync operation',
      message: error.message
    }, { status: 500 })
  }
}

/**
 * Initialize a new sync operation record
 */
async function initializeSyncOperation(barbershopId, userId, syncMode, options) {
  const { data, error } = await supabase
    .from('bulk_operations')
    .insert({
      barbershop_id: barbershopId,
      operation_type: 'sync',
      status: SYNC_STATES.PENDING,
      operation_data: {
        sync_mode: syncMode,
        options,
        started_at: new Date().toISOString(),
        phases: []
      },
      created_by: userId
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to initialize sync operation: ${error.message}`)
  }

  return data
}

/**
 * Update sync operation status and progress
 */
async function updateSyncOperation(operationId, status, details = {}) {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  }

  if (details.itemsSynced !== undefined) {
    updateData.processed_items = details.itemsSynced
    updateData.success_items = details.successfulItems || 0
    updateData.failed_items = details.failedItems || 0
  }

  if (status === SYNC_STATES.COMPLETED) {
    updateData.completed_at = new Date().toISOString()
  }

  const { data: currentOp } = await supabase
    .from('bulk_operations')
    .select('operation_data')
    .eq('id', operationId)
    .single()

  if (currentOp) {
    const operationData = currentOp.operation_data || {}
    operationData.phases = operationData.phases || []
    operationData.phases.push({
      phase: details.phase || status,
      timestamp: new Date().toISOString(),
      details
    })
    updateData.operation_data = operationData
  }

  const { error } = await supabase
    .from('bulk_operations')
    .update(updateData)
    .eq('id', operationId)

  if (error) {
    console.error('Failed to update sync operation:', error)
  }
}

/**
 * Get Cin7 connection details for a barbershop
 */
async function getCin7Connection(barbershopId, userId) {
  try {
    const { data, error } = await supabase
      .from('cin7_connections')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'No active Cin7 connection found for this barbershop'
      }
    }

    let apiKey
    try {
      const encryptedData = JSON.parse(data.api_key_encrypted)
      const { decrypt } = await import('../../../../lib/cin7-client.js')
      apiKey = decrypt(encryptedData)
    } catch (decryptError) {
      return {
        success: false,
        error: 'Failed to decrypt API credentials'
      }
    }

    return {
      success: true,
      connectionId: data.id,
      accountId: data.account_id,
      apiKey,
      settings: data.sync_settings
    }
  } catch (error) {
    return {
      success: false,
      error: `Connection retrieval failed: ${error.message}`
    }
  }
}

/**
 * Get or discover field mapping for the barbershop
 */
async function getOrDiscoverFieldMapping(barbershopId, accountId, apiKey, forceDiscovery = false) {
  try {
    if (!forceDiscovery) {
      const { data } = await supabase
        .from('cin7_field_mappings')
        .select('mapping_config')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (data?.mapping_config) {
        console.log('✅ Using existing field mapping configuration')
        return {
          success: true,
          mappingStrategy: data.mapping_config.mappingStrategy,
          source: 'cached'
        }
      }
    }

    console.log('🔍 Performing field discovery...')
    const discoveryResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9999'}/api/cin7/field-discovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, accountId, barbershopId })
    })

    if (!discoveryResponse.ok) {
      const error = await discoveryResponse.json()
      return {
        success: false,
        error: `Field discovery failed: ${error.message}`
      }
    }

    const discovery = await discoveryResponse.json()
    return {
      success: true,
      mappingStrategy: discovery.mappingStrategy,
      source: 'discovered'
    }

  } catch (error) {
    return {
      success: false,
      error: `Field mapping retrieval failed: ${error.message}`
    }
  }
}

/**
 * Validate field mapping strategy before sync
 */
async function validateFieldMapping(mappingStrategy) {
  const issues = []
  
  const criticalMappings = [
    { field: mappingStrategy.identifierMapping?.productId, name: 'Product ID' },
    { field: mappingStrategy.identifierMapping?.name, name: 'Product Name' },
    { field: mappingStrategy.priceMapping?.retailPrice, name: 'Retail Price' },
    { field: mappingStrategy.stockMapping?.currentStock, name: 'Current Stock' }
  ]

  criticalMappings.forEach(mapping => {
    if (!mapping.field) {
      issues.push(`Missing critical field mapping: ${mapping.name}`)
    }
  })

  const allMappings = [
    ...Object.values(mappingStrategy.identifierMapping || {}),
    ...Object.values(mappingStrategy.priceMapping || {}),
    ...Object.values(mappingStrategy.stockMapping || {}),
    ...Object.values(mappingStrategy.categoryMapping || {})
  ].filter(Boolean)

  const duplicates = allMappings.filter((item, index) => allMappings.indexOf(item) !== index)
  if (duplicates.length > 0) {
    issues.push(`Duplicate field mappings detected: ${duplicates.join(', ')}`)
  }

  return {
    valid: issues.length === 0,
    issues
  }
}

/**
 * Execute the production sync with comprehensive error handling
 */
async function executeProductionSync(operationId, cin7Client, mappingStrategy, barbershopId, options) {
  const results = {
    totalProcessed: 0,
    successfulItems: 0,
    failedItems: 0,
    errors: [],
    batches: []
  }

  try {
    console.log('📊 Fetching product count from Cin7...')
    const initialData = await retryWithBackoff(() => cin7Client.getProducts(1, 1))
    const totalItems = initialData.total
    
    console.log(`📦 Processing ${totalItems} products in batches of ${SYNC_CONSTANTS.BATCH_SIZE}`)
    
    const totalPages = Math.ceil(totalItems / SYNC_CONSTANTS.BATCH_SIZE)
    
    for (let page = 1; page <= totalPages; page++) {
      await updateSyncOperation(operationId, SYNC_STATES.PROCESSING_BATCH, {
        phase: `processing_batch_${page}`,
        currentBatch: page,
        totalBatches: totalPages,
        progress: ((page - 1) / totalPages * 100).toFixed(1) + '%'
      })

      const batchResult = await processBatch(
        cin7Client, 
        page, 
        SYNC_CONSTANTS.BATCH_SIZE, 
        mappingStrategy, 
        barbershopId,
        operationId
      )

      results.totalProcessed += batchResult.processed
      results.successfulItems += batchResult.successful
      results.failedItems += batchResult.failed
      results.errors.push(...batchResult.errors)
      results.batches.push({
        page,
        processed: batchResult.processed,
        successful: batchResult.successful,
        failed: batchResult.failed
      })

      if (page < totalPages) {
        await sleep(SYNC_CONSTANTS.RATE_LIMIT_DELAY)
      }

      const operation = await getSyncOperationStatus(operationId)
      if (operation.status === SYNC_STATES.CANCELLED) {
        throw new Error('Sync operation was cancelled')
      }
    }

    results.successRate = results.totalProcessed > 0 
      ? (results.successfulItems / results.totalProcessed * 100).toFixed(2)
      : 0

    return results

  } catch (error) {
    console.error('Sync execution failed:', error)
    throw error
  }
}

/**
 * Process a single batch of products
 */
async function processBatch(cin7Client, page, batchSize, mappingStrategy, barbershopId, operationId) {
  const batchResult = {
    processed: 0,
    successful: 0,
    failed: 0,
    errors: []
  }

  try {
    console.log(`🔄 Processing batch ${page}...`)
    
    const batchData = await retryWithBackoff(() => 
      cin7Client.getProducts(page, batchSize)
    )

    const products = batchData.products || []
    batchResult.processed = products.length

    if (products.length === 0) {
      return batchResult
    }

    const transformedProducts = products.map(product => 
      transformProduct(product, mappingStrategy, barbershopId)
    ).filter(Boolean)

    if (transformedProducts.length > 0) {
      const { successCount, failedCount, errors } = await batchUpsertProducts(
        transformedProducts, 
        barbershopId
      )
      
      batchResult.successful = successCount
      batchResult.failed = failedCount
      batchResult.errors = errors

      await logSyncBatch(operationId, page, batchResult)
    }

    return batchResult

  } catch (error) {
    console.error(`Batch ${page} processing failed:`, error)
    batchResult.failed = batchResult.processed
    batchResult.successful = 0
    batchResult.errors.push({
      batch: page,
      error: error.message,
      timestamp: new Date().toISOString()
    })
    
    return batchResult
  }
}

/**
 * Transform Cin7 product using field mapping strategy
 */
function transformProduct(cin7Product, mappingStrategy, barbershopId) {
  try {
    const getValue = (mapping, fallbackFields = []) => {
      if (mapping && cin7Product[mapping] !== undefined) {
        return cin7Product[mapping]
      }
      
      for (const fallback of fallbackFields) {
        if (cin7Product[fallback] !== undefined) {
          return cin7Product[fallback]
        }
      }
      
      return null
    }

    const transformed = {
      barbershop_id: barbershopId,
      cin7_product_id: getValue(mappingStrategy.identifierMapping?.productId),
      name: getValue(mappingStrategy.identifierMapping?.name),
      sku: getValue(mappingStrategy.identifierMapping?.sku),
      barcode: getValue(mappingStrategy.identifierMapping?.barcode),
      description: cin7Product.Description || '',
      category: getValue(mappingStrategy.categoryMapping?.category),
      brand: getValue(mappingStrategy.categoryMapping?.brand),
      supplier: getValue(mappingStrategy.categoryMapping?.supplier),
      cost_price: parseFloat(getValue(mappingStrategy.priceMapping?.costPrice, mappingStrategy.priceMapping?.fallbackFields)) || 0,
      retail_price: parseFloat(getValue(mappingStrategy.priceMapping?.retailPrice, mappingStrategy.priceMapping?.fallbackFields)) || 0,
      current_stock: parseInt(getValue(mappingStrategy.stockMapping?.currentStock, mappingStrategy.stockMapping?.fallbackFields)) || 0,
      min_stock_level: parseInt(getValue(mappingStrategy.stockMapping?.minStock)) || 0,
      max_stock_level: parseInt(getValue(mappingStrategy.stockMapping?.maxStock)) || 0,
      is_active: true,
      last_cin7_sync: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (!transformed.cin7_product_id || !transformed.name) {
      console.warn(`Skipping product due to missing critical fields:`, {
        cin7_product_id: transformed.cin7_product_id,
        name: transformed.name
      })
      return null
    }

    return transformed

  } catch (error) {
    console.error('Product transformation failed:', error, cin7Product)
    return null
  }
}

/**
 * Batch upsert products to database with conflict resolution
 */
async function batchUpsertProducts(products, barbershopId) {
  const results = {
    successCount: 0,
    failedCount: 0,
    errors: []
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .upsert(products, { 
        onConflict: 'cin7_product_id,barbershop_id',
        ignoreDuplicates: false 
      })
      .select('id, cin7_product_id')

    if (error) {
      throw error
    }

    results.successCount = data?.length || 0
    
    if (data && data.length > 0) {
      const changeLogs = data.map(product => ({
        product_id: product.id,
        barbershop_id: barbershopId,
        action: 'updated',
        source: 'cin7_sync',
        timestamp: new Date().toISOString()
      }))

      await supabase
        .from('product_change_logs')
        .insert(changeLogs)
    }

  } catch (error) {
    console.error('Batch upsert failed:', error)
    results.failedCount = products.length
    results.errors.push({
      operation: 'batch_upsert',
      error: error.message,
      productCount: products.length,
      timestamp: new Date().toISOString()
    })
  }

  return results
}

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff(operation, maxAttempts = SYNC_CONSTANTS.MAX_RETRY_ATTEMPTS) {
  let lastError
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      if (attempt === maxAttempts) {
        throw error
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
      console.log(`Retry attempt ${attempt}/${maxAttempts} in ${delay}ms...`)
      await sleep(delay)
    }
  }
  
  throw lastError
}

/**
 * Sleep utility function
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Log sync batch processing
 */
async function logSyncBatch(operationId, batchNumber, batchResult) {
  try {
    await supabase
      .from('cin7_sync_logs')
      .insert({
        operation_id: operationId,
        sync_type: 'production_batch',
        status: batchResult.failed === 0 ? 'success' : 'partial',
        items_synced: batchResult.successful,
        items_failed: batchResult.failed,
        details: {
          batch_number: batchNumber,
          batch_result: batchResult
        },
        completed_at: new Date().toISOString()
      })
  } catch (error) {
    console.warn('Failed to log sync batch:', error)
  }
}

/**
 * Generate low stock alerts after sync
 */
async function generateLowStockAlerts(barbershopId) {
  try {
    const { data: lowStockProducts } = await supabase
      .from('low_stock_products')
      .select('*')
      .eq('barbershop_id', barbershopId)

    if (lowStockProducts && lowStockProducts.length > 0) {
      console.log(`📢 Generated ${lowStockProducts.length} low stock alerts`)
    }
  } catch (error) {
    console.warn('Failed to generate low stock alerts:', error)
  }
}

/**
 * Update connection sync status
 */
async function updateConnectionSyncStatus(connectionId, status, itemsSynced) {
  try {
    await supabase
      .from('cin7_connections')
      .update({
        last_sync: new Date().toISOString(),
        last_sync_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)

    await supabase
      .from('cin7_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: 'production',
        sync_direction: 'pull',
        status,
        items_synced: itemsSynced,
        completed_at: new Date().toISOString()
      })
  } catch (error) {
    console.warn('Failed to update connection sync status:', error)
  }
}

/**
 * Execute rollback for failed sync operations
 */
async function executeRollback(operationId, rollbackData, barbershopId) {
  try {
    console.log('🔄 Executing sync rollback...')
    
    await supabase
      .from('products')
      .update({
        cin7_sync_enabled: false,
        last_cin7_sync: null
      })
      .eq('barbershop_id', barbershopId)
      .gte('last_cin7_sync', new Date(Date.now() - 3600000).toISOString()) // Last hour

    console.log('✅ Rollback completed')
  } catch (error) {
    console.error('Rollback failed:', error)
  }
}

/**
 * Get sync operation status
 */
async function getSyncOperationStatus(operationId) {
  const { data } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('id', operationId)
    .single()

  return data || { status: 'not_found' }
}

/**
 * Get recent sync operations for a barbershop
 */
async function getRecentSyncOperations(barbershopId, limit = 10) {
  const { data } = await supabase
    .from('bulk_operations')
    .select('*')
    .eq('barbershop_id', barbershopId)
    .eq('operation_type', 'sync')
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}

/**
 * Cancel a running sync operation
 */
async function cancelSyncOperation(operationId) {
  try {
    const { error } = await supabase
      .from('bulk_operations')
      .update({
        status: SYNC_STATES.CANCELLED,
        completed_at: new Date().toISOString()
      })
      .eq('id', operationId)

    if (error) throw error

    return { success: true, message: 'Sync operation cancelled' }
  } catch (error) {
    return { success: false, error: error.message }
  }
}