/**
 * Cin7 Core API Client
 * Handles all interactions with Cin7 inventory management system
 */

import crypto from 'crypto'

// Encryption helpers for storing API credentials
const algorithm = 'aes-256-gcm'
const salt = 'cin7-salt-2024'

export function encrypt(text) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-dev-key', salt, 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  }
}

export function decrypt(encryptedData) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-dev-key', salt, 32)
  const decipher = crypto.createDecipheriv(
    algorithm, 
    key, 
    Buffer.from(encryptedData.iv, 'hex')
  )
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

class Cin7Client {
  constructor(accountId, apiKey) {
    this.accountId = accountId
    this.apiKey = apiKey
    this.baseUrl = 'https://inventory.dearsystems.com/externalapi/v2'
  }

  /**
   * Make authenticated request to Cin7 API
   */
  async makeRequest(endpoint, method = 'GET', body = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`
      
      const options = {
        method,
        headers: {
          'api-auth-accountid': this.accountId,
          'api-auth-applicationkey': this.apiKey,
          'Content-Type': 'application/json'
        }
      }

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body)
      }

      const response = await fetch(url, options)
      
      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Cin7 API Error: ${response.status} - ${error}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Cin7 API Request Failed:', error)
      throw error
    }
  }

  /**
   * Test connection with provided credentials
   */
  async testConnection() {
    try {
      // Try to fetch account details as a connection test
      const result = await this.makeRequest('/me')
      return { 
        success: true, 
        accountName: result.Company || 'Connected',
        message: 'Successfully connected to Cin7'
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        message: 'Failed to connect to Cin7. Please check your credentials.'
      }
    }
  }

  /**
   * Get all products from Cin7
   */
  async getProducts(page = 1, limit = 100) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      const result = await this.makeRequest(`/products?${params}`)
      
      return {
        products: result.Products || [],
        total: result.Total || 0,
        page: result.Page || 1
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
      throw error
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    try {
      return await this.makeRequest(`/products/${productId}`)
    } catch (error) {
      console.error('Failed to fetch product:', error)
      throw error
    }
  }

  /**
   * Get current stock levels
   */
  async getStockLevels() {
    try {
      const result = await this.makeRequest('/stock')
      
      return result.StockItems || []
    } catch (error) {
      console.error('Failed to fetch stock levels:', error)
      throw error
    }
  }

  /**
   * Get low stock items (below minimum threshold)
   */
  async getLowStockItems() {
    try {
      const stock = await this.getStockLevels()
      
      return stock.filter(item => {
        const available = item.Available || 0
        const minStock = item.MinimumBeforeReorder || 0
        return available <= minStock && minStock > 0
      })
    } catch (error) {
      console.error('Failed to fetch low stock items:', error)
      throw error
    }
  }

  /**
   * Sync inventory with local database
   */
  async syncInventory() {
    try {
      const products = await this.getProducts()
      const stockLevels = await this.getStockLevels()
      
      // Merge product data with stock levels
      const inventory = products.products.map(product => {
        const stock = stockLevels.find(s => s.ProductID === product.ID)
        
        return {
          cin7_id: product.ID,
          name: product.Name,
          sku: product.SKU,
          barcode: product.Barcode,
          description: product.Description,
          category: product.Category,
          brand: product.Brand,
          supplier: product.DefaultSupplier,
          unit_cost: product.AverageCost || 0,
          retail_price: product.PriceTier1 || 0,
          current_stock: stock?.Available || 0,
          min_stock: stock?.MinimumBeforeReorder || 0,
          max_stock: stock?.MaximumStock || 0,
          location: stock?.BinLocation || '',
          last_updated: new Date().toISOString()
        }
      })
      
      return {
        success: true,
        itemsSynced: inventory.length,
        inventory
      }
    } catch (error) {
      console.error('Inventory sync failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Create a purchase order for low stock items
   */
  async createPurchaseOrder(items) {
    try {
      const purchaseOrder = {
        Supplier: items[0]?.supplier || 'Default Supplier',
        Status: 'DRAFT',
        Lines: items.map(item => ({
          ProductID: item.cin7_id,
          SKU: item.sku,
          Name: item.name,
          Quantity: item.quantity_to_order,
          Price: item.unit_cost
        }))
      }
      
      const result = await this.makeRequest('/purchase', 'POST', purchaseOrder)
      
      return {
        success: true,
        orderId: result.ID,
        orderNumber: result.OrderNumber
      }
    } catch (error) {
      console.error('Failed to create purchase order:', error)
      throw error
    }
  }

  /**
   * Subscribe to webhooks for real-time updates
   */
  async subscribeToWebhooks(webhookUrl) {
    try {
      const webhooks = [
        {
          Type: 'Stock.Updated',
          URL: `${webhookUrl}/stock-updated`
        },
        {
          Type: 'Product.Modified',
          URL: `${webhookUrl}/product-modified`
        },
        {
          Type: 'Sale.Completed',
          URL: `${webhookUrl}/sale-completed`
        }
      ]
      
      const results = []
      for (const webhook of webhooks) {
        const result = await this.makeRequest('/webhooks', 'POST', webhook)
        results.push(result)
      }
      
      return {
        success: true,
        webhooksCreated: results.length
      }
    } catch (error) {
      console.error('Failed to subscribe to webhooks:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// Export the class (encrypt and decrypt are already exported above)
export { Cin7Client }

// Default export for backwards compatibility
export default Cin7Client