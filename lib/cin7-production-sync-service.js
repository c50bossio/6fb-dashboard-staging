/**
 * Production-ready CIN7 Synchronization Service
 * 
 * This service provides comprehensive error handling, retry strategies,
 * rate limiting, and robust inventory synchronization for the barbershop platform.
 */

import { createClient } from '@/lib/supabase/server'
import { Cin7Client } from '@/lib/cin7-client.js'

class Cin7SyncService {
  constructor() {
    this.retryDelays = [1000, 2000, 5000, 10000, 30000] // Progressive delays
    this.rateLimitDelay = 334 // ~3 requests per second (CIN7 limit)
    this.batchSize = 50 // Process in batches to avoid memory issues
    this.maxConcurrentRequests = 3
    this.syncQueue = []
    this.isProcessing = false
  }

  /**
   * Main synchronization method with comprehensive error handling
   */
  async syncInventory(barbershopId, options = {}) {
    const {
      forceFullSync = false,
      syncStockOnly = false,
      retryFailedItems = true
    } = options

    console.log(`🔄 Starting CIN7 sync for barbershop: ${barbershopId}`)
    
    try {
      const supabase = createClient()
      
      // Get CIN7 connection for this barbershop
      const connection = await this.getConnection(supabase, barbershopId)
      if (!connection) {
        throw new Error('No active CIN7 connection found')
      }

      // Initialize CIN7 client
      const cin7Client = new Cin7Client(connection.accountId, connection.apiKey)
      
      // Test connection before proceeding
      const connectionTest = await this.testConnectionWithRetry(cin7Client)
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${connectionTest.error}`)
      }

      // Start sync transaction
      const syncLog = await this.startSyncLog(supabase, connection.id, syncStockOnly ? 'stock_only' : 'full')
      
      let results = {
        productsProcessed: 0,
        productsCreated: 0,
        productsUpdated: 0,
        stockUpdated: 0,
        errors: []
      }

      try {
        if (!syncStockOnly) {
          // Sync products first
          const productResults = await this.syncProducts(cin7Client, supabase, barbershopId, forceFullSync)
          results = { ...results, ...productResults }
        }

        // Sync stock levels
        const stockResults = await this.syncStockLevels(cin7Client, supabase, barbershopId)
        results.stockUpdated = stockResults.stockUpdated
        results.errors.push(...stockResults.errors)

        // Update sync log
        await this.completeSyncLog(supabase, syncLog.id, 'success', results)
        
        // Update connection last sync
        await this.updateConnectionLastSync(supabase, connection.id, 'success')

        console.log(`✅ CIN7 sync completed successfully:`, results)
        return { success: true, results }

      } catch (syncError) {
        console.error('❌ Sync process failed:', syncError)
        
        // Update sync log with error
        await this.completeSyncLog(supabase, syncLog.id, 'failed', results, syncError.message)
        
        // Update connection with error
        await this.updateConnectionLastSync(supabase, connection.id, 'failed', syncError.message)
        
        throw syncError
      }

    } catch (error) {
      console.error('❌ CIN7 sync failed:', error)
      return { 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Sync products with batch processing and error recovery
   */
  async syncProducts(cin7Client, supabase, barbershopId, forceFullSync = false) {
    console.log('📦 Syncing products...')
    
    const results = {
      productsProcessed: 0,
      productsCreated: 0,
      productsUpdated: 0,
      errors: []
    }

    try {
      // Get products with pagination and retry logic
      const allProducts = await this.getAllProductsWithRetry(cin7Client)
      
      if (!allProducts || allProducts.length === 0) {
        console.warn('⚠️ No products found in CIN7')
        return results
      }

      console.log(`📊 Processing ${allProducts.length} products in batches of ${this.batchSize}`)
      
      // Process products in batches
      for (let i = 0; i < allProducts.length; i += this.batchSize) {
        const batch = allProducts.slice(i, i + this.batchSize)
        
        try {
          const batchResults = await this.processBatch(batch, supabase, barbershopId, forceFullSync)
          
          results.productsProcessed += batchResults.processed
          results.productsCreated += batchResults.created
          results.productsUpdated += batchResults.updated
          results.errors.push(...batchResults.errors)
          
          // Rate limiting between batches
          await this.delay(this.rateLimitDelay)
          
        } catch (batchError) {
          console.error(`❌ Batch ${Math.floor(i / this.batchSize) + 1} failed:`, batchError)
          results.errors.push({
            type: 'batch_error',
            batch: Math.floor(i / this.batchSize) + 1,
            error: batchError.message
          })
        }
      }

      return results
      
    } catch (error) {
      console.error('❌ Product sync failed:', error)
      results.errors.push({
        type: 'sync_error',
        error: error.message
      })
      return results
    }
  }

  /**
   * Process a batch of products with individual error handling
   */
  async processBatch(products, supabase, barbershopId, forceFullSync) {
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      errors: []
    }

    const inventoryData = []

    for (const product of products) {
      try {
        // Map CIN7 product to inventory format
        const inventoryItem = await this.mapCin7ProductToInventory(product, barbershopId)
        
        // Skip if mapping failed
        if (!inventoryItem) {
          results.errors.push({
            type: 'mapping_error',
            cin7Id: product.ID,
            error: 'Failed to map product data'
          })
          continue
        }

        inventoryData.push(inventoryItem)
        results.processed++
        
      } catch (productError) {
        console.error(`❌ Error processing product ${product.ID}:`, productError)
        results.errors.push({
          type: 'product_error',
          cin7Id: product.ID,
          error: productError.message
        })
      }
    }

    // Bulk upsert with error handling
    if (inventoryData.length > 0) {
      try {
        const { data, error } = await supabase
          .from('inventory')
          .upsert(inventoryData, {
            onConflict: 'cin7_product_id',
            returning: 'representation'
          })

        if (error) {
          throw error
        }

        // Count created vs updated (simplified - all counted as updated for now)
        results.updated = data ? data.length : inventoryData.length
        
        console.log(`✅ Batch processed: ${results.processed} items, ${results.updated} upserted`)
        
      } catch (upsertError) {
        console.error('❌ Batch upsert failed:', upsertError)
        results.errors.push({
          type: 'upsert_error',
          error: upsertError.message,
          itemCount: inventoryData.length
        })
      }
    }

    return results
  }

  /**
   * Sync stock levels with robust error handling
   */
  async syncStockLevels(cin7Client, supabase, barbershopId) {
    console.log('📊 Syncing stock levels...')
    
    const results = {
      stockUpdated: 0,
      errors: []
    }

    try {
      const stockLevels = await this.getStockLevelsWithRetry(cin7Client)
      
      if (!stockLevels || stockLevels.length === 0) {
        console.warn('⚠️ No stock levels found in CIN7')
        return results
      }

      // Update stock levels in batches
      for (let i = 0; i < stockLevels.length; i += this.batchSize) {
        const batch = stockLevels.slice(i, i + this.batchSize)
        
        try {
          const updates = batch.map(stock => ({
            cin7_product_id: stock.ProductID,
            current_stock: parseFloat(stock.Available || 0),
            cin7_last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))

          const { data, error } = await supabase
            .from('inventory')
            .upsert(updates, {
              onConflict: 'cin7_product_id',
              returning: 'minimal'
            })

          if (error) {
            throw error
          }

          results.stockUpdated += batch.length
          
          // Rate limiting
          await this.delay(this.rateLimitDelay)
          
        } catch (batchError) {
          console.error(`❌ Stock batch update failed:`, batchError)
          results.errors.push({
            type: 'stock_batch_error',
            error: batchError.message,
            itemCount: batch.length
          })
        }
      }

      return results
      
    } catch (error) {
      console.error('❌ Stock sync failed:', error)
      results.errors.push({
        type: 'stock_sync_error',
        error: error.message
      })
      return results
    }
  }

  /**
   * Get all products with retry logic and pagination
   */
  async getAllProductsWithRetry(cin7Client) {
    let attempt = 0
    const maxRetries = 3

    while (attempt < maxRetries) {
      try {
        const allProducts = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          console.log(`📄 Fetching products page ${page}...`)
          
          const result = await this.executeWithRetry(
            () => cin7Client.getProducts(page, 100),
            `get products page ${page}`
          )

          if (result && result.products && result.products.length > 0) {
            allProducts.push(...result.products)
            console.log(`✅ Page ${page}: ${result.products.length} products (${allProducts.length} total)`)
            
            // Check if there are more pages
            hasMore = result.products.length === 100 && allProducts.length < (result.total || Infinity)
            page++
          } else {
            hasMore = false
          }

          // Rate limiting between pages
          await this.delay(this.rateLimitDelay)
        }

        console.log(`📦 Retrieved ${allProducts.length} total products`)
        return allProducts

      } catch (error) {
        attempt++
        console.error(`❌ Attempt ${attempt} failed:`, error.message)
        
        if (attempt >= maxRetries) {
          throw new Error(`Failed to get products after ${maxRetries} attempts: ${error.message}`)
        }
        
        // Exponential backoff
        await this.delay(this.retryDelays[attempt - 1] || 30000)
      }
    }
  }

  /**
   * Get stock levels with retry logic
   */
  async getStockLevelsWithRetry(cin7Client) {
    return await this.executeWithRetry(
      () => cin7Client.getStockLevels(),
      'get stock levels'
    )
  }

  /**
   * Test connection with retry logic
   */
  async testConnectionWithRetry(cin7Client) {
    return await this.executeWithRetry(
      () => cin7Client.testConnection(),
      'test connection'
    )
  }

  /**
   * Generic retry execution wrapper
   */
  async executeWithRetry(operation, operationName, maxRetries = 3) {
    let attempt = 0
    
    while (attempt < maxRetries) {
      try {
        return await operation()
      } catch (error) {
        attempt++
        console.error(`❌ ${operationName} attempt ${attempt} failed:`, error.message)
        
        // Check if it's a rate limit error (429)
        if (error.message.includes('429') || error.message.includes('rate limit')) {
          console.log('⏳ Rate limit detected, waiting longer...')
          await this.delay(60000) // Wait 1 minute for rate limit
        } else if (attempt >= maxRetries) {
          throw new Error(`${operationName} failed after ${maxRetries} attempts: ${error.message}`)
        } else {
          // Exponential backoff for other errors
          await this.delay(this.retryDelays[attempt - 1] || 30000)
        }
      }
    }
  }

  /**
   * Map CIN7 product to local inventory format with comprehensive data handling
   */
  async mapCin7ProductToInventory(product, barbershopId) {
    try {
      return {
        barbershop_id: barbershopId,
        name: product.Name || '',
        sku: product.SKU || '',
        barcode: product.Barcode || '',
        description: product.ShortDescription || product.Description || '',
        category: this.mapCategoryForBarbershop(product.Category),
        brand: product.Brand || '',
        supplier: product.DefaultSupplier?.Name || '',
        unit_cost: parseFloat(product.AverageCost || 0),
        retail_price: parseFloat(product.PriceTier1 || 0),
        current_stock: parseFloat(product.QuantityOnHand || 0),
        min_stock: parseFloat(product.MinimumBeforeReorder || 0),
        max_stock: parseFloat(product.MaximumStock || 0),
        location: product.BinLocation || '',
        professional_use: this.detectProfessionalUse(product),
        usage_instructions: this.extractUsageInstructions(product),
        cin7_product_id: product.ID,
        cin7_sku: product.SKU,
        cin7_barcode: product.Barcode,
        cin7_last_sync: new Date().toISOString(),
        cin7_sync_enabled: true,
        status: product.Status === 'Active' ? 'active' : 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } catch (error) {
      console.error(`❌ Error mapping product ${product.ID}:`, error)
      return null
    }
  }

  // Helper methods (same as in browser sync)
  mapCategoryForBarbershop(cin7Category) {
    if (!cin7Category) return 'other'
    
    const category = cin7Category.toLowerCase()
    
    if (category.includes('shampoo') || category.includes('conditioner') || 
        category.includes('hair') && category.includes('care')) {
      return 'hair_care'
    }
    if (category.includes('beard') || category.includes('mustache')) {
      return 'beard_care'
    }
    if (category.includes('clipper') || category.includes('trimmer') || 
        category.includes('razor') || category.includes('scissors')) {
      return 'tools'
    }
    if (category.includes('cape') || category.includes('towel') || 
        category.includes('apron') || category.includes('accessory')) {
      return 'accessories'
    }
    if (category.includes('styling') || category.includes('gel') || 
        category.includes('pomade') || category.includes('wax')) {
      return 'styling'
    }
    
    return 'other'
  }

  detectProfessionalUse(product) {
    const name = (product.Name || '').toLowerCase()
    const description = (product.Description || '').toLowerCase()
    const brand = (product.Brand || '').toLowerCase()
    
    const professionalBrands = [
      'wahl', 'andis', 'oster', 'babyliss', 'conair', 'remington',
      'redken', 'matrix', 'paul mitchell', 'tigi', 'american crew'
    ]
    
    const professionalKeywords = [
      'professional', 'salon', 'barber', 'stylist', 'commercial',
      'heavy duty', 'industrial', 'pro grade'
    ]
    
    return professionalBrands.some(brand_name => brand.includes(brand_name)) ||
           professionalKeywords.some(keyword => name.includes(keyword) || description.includes(keyword))
  }

  extractUsageInstructions(product) {
    const description = product.Description || ''
    const longDescription = product.LongDescription || ''
    
    const usagePattern = /(?:directions|instructions|how to use|usage):\s*(.+?)(?:\.|$)/i
    const match = (description + ' ' + longDescription).match(usagePattern)
    
    return match ? match[1].trim() : ''
  }

  // Database helper methods
  async getConnection(supabase, barbershopId) {
    try {
      const { data: connection, error } = await supabase
        .from('cin7_connections')
        .select('id, account_id, api_key_encrypted')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .single()

      if (error || !connection) {
        return null
      }

      // Decrypt credentials
      const { decrypt } = await import('@/lib/cin7-client.js')
      const accountId = decrypt(JSON.parse(connection.api_key_encrypted))
      const apiKey = decrypt(JSON.parse(connection.account_id))

      return {
        id: connection.id,
        accountId,
        apiKey
      }
    } catch (error) {
      console.error('❌ Error getting connection:', error)
      return null
    }
  }

  async startSyncLog(supabase, connectionId, syncType) {
    const { data, error } = await supabase
      .from('cin7_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: 'automatic',
        sync_direction: 'pull',
        status: 'running',
        details: { sync_type: syncType }
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`)
    }

    return data
  }

  async completeSyncLog(supabase, logId, status, results, errorMessage = null) {
    const updates = {
      status,
      completed_at: new Date().toISOString(),
      items_synced: results.productsProcessed + results.stockUpdated,
      items_created: results.productsCreated,
      items_updated: results.productsUpdated,
      items_failed: results.errors.length,
      details: { results },
      error_message: errorMessage
    }

    const { error } = await supabase
      .from('cin7_sync_logs')
      .update(updates)
      .eq('id', logId)

    if (error) {
      console.error('❌ Error updating sync log:', error)
    }
  }

  async updateConnectionLastSync(supabase, connectionId, status, errorMessage = null) {
    const updates = {
      last_sync: new Date().toISOString(),
      last_sync_status: status,
      last_error: errorMessage
    }

    const { error } = await supabase
      .from('cin7_connections')
      .update(updates)
      .eq('id', connectionId)

    if (error) {
      console.error('❌ Error updating connection:', error)
    }
  }

  // Utility methods
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Queue management for preventing concurrent syncs
  async queueSync(barbershopId, operation) {
    return new Promise((resolve, reject) => {
      this.syncQueue.push({
        barbershopId,
        operation,
        resolve,
        reject
      })
      
      this.processQueue()
    })
  }

  async processQueue() {
    if (this.isProcessing || this.syncQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.syncQueue.length > 0) {
      const item = this.syncQueue.shift()
      
      try {
        const result = await item.operation()
        item.resolve(result)
      } catch (error) {
        item.reject(error)
      }

      // Small delay between queue items
      await this.delay(1000)
    }

    this.isProcessing = false
  }
}

export default Cin7SyncService