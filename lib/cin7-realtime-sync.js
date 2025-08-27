/**
 * CIN7 Real-time Inventory Synchronization Service
 * 
 * This service handles real-time inventory updates, webhook processing,
 * and integration with the barbershop booking system.
 */

import { createClient } from '@/lib/supabase/server'
import EventEmitter from 'events'

class Cin7RealtimeSync extends EventEmitter {
  constructor() {
    super()
    this.syncQueue = new Map() // barbershopId -> sync operations
    this.webhookRetryQueue = []
    this.isProcessing = false
    this.syncInterval = null
    this.retryAttempts = new Map() // webhook id -> attempt count
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds base delay
  }

  /**
   * Initialize the real-time sync service
   */
  async initialize() {
    // // Debug log removed for production
try {
      // Set up periodic sync check (every 15 minutes)
      this.startPeriodicSync()
      
      // Set up webhook retry processing
      this.startWebhookRetryProcessor()
      
      // Set up database listeners for real-time updates
      await this.setupRealtimeListeners()
      
      // // Debug log removed for production
return true
    } catch (error) {
      console.error('❌ Failed to initialize CIN7 Real-time Sync:', error)
      return false
    }
  }

  /**
   * Process incoming webhook from CIN7
   */
  async processWebhook(webhookData, signature) {
    try {
      // // Debug log removed for production
// Verify webhook signature
      if (!this.verifyWebhookSignature(webhookData, signature)) {
        throw new Error('Invalid webhook signature')
      }

      // Process based on webhook type
      switch (webhookData.Type) {
        case 'Stock.Updated':
          await this.handleStockUpdate(webhookData)
          break
        case 'Product.Modified':
          await this.handleProductUpdate(webhookData)
          break
        case 'Sale.Completed':
          await this.handleSaleCompleted(webhookData)
          break
        default:
          console.warn(`⚠️ Unknown webhook type: ${webhookData.Type}`)
      }

      // Emit success event
      this.emit('webhookProcessed', {
        type: webhookData.Type,
        productId: webhookData.ProductID,
        success: true,
        timestamp: new Date().toISOString()
      })

      return { success: true }

    } catch (error) {
      console.error('❌ Webhook processing failed:', error)
      
      // Add to retry queue
      this.addToWebhookRetryQueue(webhookData, signature, error.message)
      
      // Emit error event
      this.emit('webhookError', {
        type: webhookData.Type,
        error: error.message,
        timestamp: new Date().toISOString()
      })

      return { success: false, error: error.message }
    }
  }

  /**
   * Handle stock level updates from CIN7
   */
  async handleStockUpdate(webhookData) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Update inventory in database
      const { data, error } = await supabase
        .from('inventory')
        .update({
          current_stock: parseFloat(webhookData.Available || 0),
          on_hand: parseFloat(webhookData.OnHand || webhookData.Available || 0),
          allocated: parseFloat(webhookData.Allocated || 0),
          incoming: parseFloat(webhookData.Incoming || 0),
          cin7_last_sync: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('cin7_product_id', webhookData.ProductID)
        .select('id, barbershop_id, name, current_stock, min_stock_level')

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        const product = data[0]
        // // Debug log removed for production
// Check for low stock alerts
        if (product.current_stock <= product.min_stock_level) {
          await this.triggerLowStockAlert(product)
        }

        // Update booking system availability
        await this.updateBookingAvailability(product)

        // Broadcast real-time update to connected clients
        await this.broadcastInventoryUpdate(product)
      }

    } catch (error) {
      console.error('❌ Stock update failed:', error)
      throw error
    }
  }

  /**
   * Handle product information updates from CIN7
   */
  async handleProductUpdate(webhookData) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Get current product data from CIN7 API to sync latest info
      const connection = await this.getConnectionByProductId(supabase, webhookData.ProductID)
      if (!connection) {
        throw new Error('No active CIN7 connection found for product')
      }

      const { Cin7Client } = await import('@/lib/cin7-client.js')
      const cin7Client = new Cin7Client(connection.accountId, connection.apiKey)
      
      // Fetch updated product data
      const productData = await cin7Client.getProduct(webhookData.ProductID)
      
      // Map and update in database
      const mappedProduct = await this.mapCin7ProductToInventory(productData, connection.barbershopId)
      
      const { data, error } = await supabase
        .from('inventory')
        .upsert(mappedProduct, {
          onConflict: 'cin7_product_id',
          returning: 'representation'
        })
        .select()

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        // // Debug log removed for production
// Broadcast update to connected clients
        await this.broadcastInventoryUpdate(data[0])
      }

    } catch (error) {
      console.error('❌ Product update failed:', error)
      throw error
    }
  }

  /**
   * Handle completed sales from CIN7
   */
  async handleSaleCompleted(webhookData) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Process each line item in the sale
      if (webhookData.Lines && Array.isArray(webhookData.Lines)) {
        for (const lineItem of webhookData.Lines) {
          // Update stock levels based on quantity sold
          const { data, error } = await supabase
            .from('inventory')
            .update({
              current_stock: supabase.raw(`current_stock - ${parseFloat(lineItem.Quantity || 0)}`),
              cin7_last_sync: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('cin7_product_id', lineItem.ProductID)
            .select('id, barbershop_id, name, current_stock, min_stock_level')

          if (error) {
            console.error(`❌ Failed to update stock for product ${lineItem.ProductID}:`, error)
            continue
          }

          if (data && data.length > 0) {
            const product = data[0]
            // // Debug log removed for production
// Check for low stock alerts
            if (product.current_stock <= product.min_stock_level) {
              await this.triggerLowStockAlert(product)
            }

            // Update booking availability
            await this.updateBookingAvailability(product)

            // Broadcast update
            await this.broadcastInventoryUpdate(product)
          }
        }
      }

      // Log the sale transaction
      await this.logSaleTransaction(supabase, webhookData)

    } catch (error) {
      console.error('❌ Sale processing failed:', error)
      throw error
    }
  }

  /**
   * Trigger low stock alert for barbershop
   */
  async triggerLowStockAlert(product) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Insert low stock alert
      const { error } = await supabase
        .from('inventory_alerts')
        .insert({
          barbershop_id: product.barbershop_id,
          product_id: product.id,
          product_name: product.name,
          current_stock: product.current_stock,
          min_stock_level: product.min_stock_level,
          alert_type: 'low_stock',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('❌ Failed to create low stock alert:', error)
      } else {
        // Emit alert event for real-time notifications
        this.emit('lowStockAlert', {
          barbershopId: product.barbershop_id,
          productName: product.name,
          currentStock: product.current_stock,
          minStockLevel: product.min_stock_level
        })
      }

    } catch (error) {
      console.error('❌ Low stock alert failed:', error)
    }
  }

  /**
   * Update booking system availability based on inventory
   */
  async updateBookingAvailability(product) {
    // // Debug log removed for production
const supabase = createClient()
    
    try {
      // Check if this product is used in any services
      const { data: serviceProducts } = await supabase
        .from('service_products')
        .select('service_id, quantity_required')
        .eq('product_id', product.id)

      if (serviceProducts && serviceProducts.length > 0) {
        for (const serviceProduct of serviceProducts) {
          // Calculate how many services can be provided with current stock
          const maxServices = Math.floor(product.current_stock / serviceProduct.quantity_required)
          
          // Update service availability
          await supabase
            .from('services')
            .update({
              max_bookings_per_day: Math.max(0, Math.min(maxServices, 20)), // Cap at 20 per day
              is_available: maxServices > 0,
              updated_at: new Date().toISOString()
            })
            .eq('id', serviceProduct.service_id)
        }
      }

    } catch (error) {
      console.error('❌ Booking availability update failed:', error)
    }
  }

  /**
   * Broadcast inventory update to connected clients
   */
  async broadcastInventoryUpdate(product) {
    const supabase = createClient()
    
    try {
      // Use Supabase real-time to broadcast update
      await supabase.channel('inventory-updates')
        .send({
          type: 'broadcast',
          event: 'inventory-update',
          payload: {
            productId: product.id,
            barbershopId: product.barbershop_id,
            name: product.name,
            currentStock: product.current_stock,
            isLowStock: product.current_stock <= product.min_stock_level,
            timestamp: new Date().toISOString()
          }
        })

    } catch (error) {
      console.error('❌ Broadcast failed:', error)
    }
  }

  /**
   * Start periodic sync for all connected barbershops
   */
  startPeriodicSync() {
    // Run every 15 minutes
    this.syncInterval = setInterval(async () => {
      // // Debug log removed for production
await this.performPeriodicSync()
    }, 15 * 60 * 1000)

    // // Debug log removed for production
}

  /**
   * Perform periodic sync for all active connections
   */
  async performPeriodicSync() {
    const supabase = createClient()
    
    try {
      // Get all active CIN7 connections with auto-sync enabled
      const { data: connections } = await supabase
        .from('cin7_connections')
        .select('id, barbershop_id, sync_settings')
        .eq('is_active', true)
        .filter('sync_settings->auto_sync', 'eq', true)

      if (!connections || connections.length === 0) {
        // // Debug log removed for production
return
      }

      // // Debug log removed for production
// Import sync service
      const Cin7SyncService = (await import('@/lib/cin7-production-sync-service.js')).default
      const syncService = new Cin7SyncService()

      // Sync each barbershop (with rate limiting)
      for (const connection of connections) {
        try {
          await syncService.syncInventory(connection.barbershop_id, {
            syncStockOnly: true, // Only sync stock levels for periodic updates
            retryFailedItems: false
          })

          // Wait 2 seconds between barbershops to avoid overwhelming CIN7 API
          await new Promise(resolve => setTimeout(resolve, 2000))

        } catch (syncError) {
          console.error(`❌ Periodic sync failed for barbershop ${connection.barbershop_id}:`, syncError)
        }
      }

    } catch (error) {
      console.error('❌ Periodic sync error:', error)
    }
  }

  /**
   * Start webhook retry processor
   */
  startWebhookRetryProcessor() {
    setInterval(async () => {
      if (this.webhookRetryQueue.length > 0) {
        // // Debug log removed for production
await this.processWebhookRetries()
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Process webhook retry queue
   */
  async processWebhookRetries() {
    const retries = [...this.webhookRetryQueue]
    this.webhookRetryQueue = []

    for (const retry of retries) {
      const attemptCount = this.retryAttempts.get(retry.id) || 0

      if (attemptCount >= this.maxRetries) {
        console.error(`❌ Max retries exceeded for webhook ${retry.id}`)
        this.retryAttempts.delete(retry.id)
        continue
      }

      try {
        // Wait with exponential backoff
        const delay = this.retryDelay * Math.pow(2, attemptCount)
        await new Promise(resolve => setTimeout(resolve, delay))

        // Retry webhook processing
        await this.processWebhook(retry.webhookData, retry.signature)
        
        // Success - remove from retry tracking
        this.retryAttempts.delete(retry.id)
        // // Debug log removed for production
} catch (error) {
        console.error(`❌ Webhook retry ${attemptCount + 1} failed for ${retry.id}:`, error)
        
        // Increment retry count and re-queue if under limit
        this.retryAttempts.set(retry.id, attemptCount + 1)
        if (attemptCount + 1 < this.maxRetries) {
          this.webhookRetryQueue.push(retry)
        } else {
          this.retryAttempts.delete(retry.id)
        }
      }
    }
  }

  /**
   * Add webhook to retry queue
   */
  addToWebhookRetryQueue(webhookData, signature, error) {
    const retryId = `${webhookData.Type}_${webhookData.ProductID}_${Date.now()}`
    
    this.webhookRetryQueue.push({
      id: retryId,
      webhookData,
      signature,
      error,
      addedAt: new Date().toISOString()
    })

    // // Debug log removed for production
}

  /**
   * Set up real-time database listeners
   */
  async setupRealtimeListeners() {
    const supabase = createClient()
    
    // Listen for inventory changes
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'inventory' },
        (payload) => {
          this.emit('inventoryChanged', payload.new)
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_alerts' },
        (payload) => {
          this.emit('alertCreated', payload.new)
        }
      )
      .subscribe()

    // // Debug log removed for production
return inventoryChannel
  }

  /**
   * Verify webhook signature from CIN7
   */
  verifyWebhookSignature(webhookData, signature) {
    // For now, return true - implement actual signature verification
    // based on CIN7's webhook signature algorithm when available
    return true
  }

  /**
   * Helper methods
   */
  async getConnectionByProductId(supabase, productId) {
    const { data: inventory } = await supabase
      .from('inventory')
      .select('barbershop_id')
      .eq('cin7_product_id', productId)
      .single()

    if (!inventory) return null

    const { data: connection } = await supabase
      .from('cin7_connections')
      .select('id, account_id, api_key_encrypted')
      .eq('barbershop_id', inventory.barbershop_id)
      .eq('is_active', true)
      .single()

    if (!connection) return null

    // Decrypt credentials
    const { decrypt } = await import('@/lib/cin7-client.js')
    return {
      id: connection.id,
      barbershopId: inventory.barbershop_id,
      accountId: decrypt(JSON.parse(connection.account_id)),
      apiKey: decrypt(JSON.parse(connection.api_key_encrypted))
    }
  }

  async mapCin7ProductToInventory(product, barbershopId) {
    // Use the same mapping logic as the sync service
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
      updated_at: new Date().toISOString()
    }
  }

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

  async logSaleTransaction(supabase, saleData) {
    try {
      await supabase
        .from('sale_syncs')
        .insert({
          cin7_sale_id: saleData.SaleID,
          sale_data: saleData,
          sync_status: 'completed',
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('❌ Failed to log sale transaction:', error)
    }
  }

  /**
   * Shutdown the service gracefully
   */
  shutdown() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }
    
    // // Debug log removed for production
}
}

// Export singleton instance
const cin7RealtimeSync = new Cin7RealtimeSync()
export default cin7RealtimeSync