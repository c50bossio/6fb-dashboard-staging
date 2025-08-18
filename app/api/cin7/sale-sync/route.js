/**
 * CIN7 Sale Synchronization API
 * 
 * Implements best practices from CIN7 API documentation:
 * - Real-time inventory updates when sales occur
 * - Stock availability checks before allowing sales
 * - Webhook integration for bidirectional sync
 */

import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/cin7-client.js'
import { createClient } from '@/lib/supabase/server'

// CIN7 API endpoints (from documentation)
const CIN7_BASE_URL = 'https://inventory.dearsystems.com/ExternalAPI/v2'

/**
 * Check inventory availability before allowing a sale
 * Best Practice: Always verify stock before processing POS transactions
 */
async function checkInventoryAvailability(productSku, quantity, credentials) {
  try {
    // Get real-time stock level from CIN7
    const response = await fetch(`${CIN7_BASE_URL}/stock?sku=${productSku}`, {
      headers: {
        'api-auth-accountid': credentials.accountId,
        'api-auth-applicationkey': credentials.apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Stock check failed: ${response.status}`)
    }

    const data = await response.json()
    const stockItem = data.StockItems?.[0]
    
    if (!stockItem) {
      return {
        available: false,
        message: 'Product not found in inventory',
        currentStock: 0
      }
    }

    const availableStock = stockItem.Available || 0
    const isAvailable = availableStock >= quantity

    return {
      available: isAvailable,
      currentStock: availableStock,
      message: isAvailable 
        ? `Stock available (${availableStock} units)` 
        : `Insufficient stock (only ${availableStock} available, need ${quantity})`
    }
  } catch (error) {
    console.error('Inventory check error:', error)
    return {
      available: false,
      message: 'Unable to verify inventory',
      error: error.message
    }
  }
}

/**
 * Record a sale in CIN7 when BookBarber POS completes a transaction
 * Best Practice: Use CIN7 Sale API for proper inventory tracking
 */
async function recordSaleInCin7(saleData, credentials) {
  try {
    // Create sale record in CIN7 format
    const cin7Sale = {
      Customer: saleData.customerName || 'Walk-in Customer',
      Location: saleData.location || 'Main Store',
      Status: 'AUTHORISED', // Immediately confirm the sale
      InvoiceDate: new Date().toISOString(),
      InvoiceNumber: saleData.invoiceNumber,
      Lines: saleData.items.map(item => ({
        ProductID: item.productId,
        SKU: item.sku,
        Name: item.name,
        Quantity: item.quantity,
        Price: item.price,
        Tax: item.tax || 0,
        Total: item.quantity * item.price
      }))
    }

    // Post sale to CIN7
    const response = await fetch(`${CIN7_BASE_URL}/sale`, {
      method: 'POST',
      headers: {
        'api-auth-accountid': credentials.accountId,
        'api-auth-applicationkey': credentials.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cin7Sale)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to record sale: ${error}`)
    }

    const result = await response.json()
    
    return {
      success: true,
      cin7SaleId: result.ID,
      message: 'Sale recorded and inventory updated'
    }
  } catch (error) {
    console.error('Sale recording error:', error)
    return {
      success: false,
      message: 'Failed to record sale in CIN7',
      error: error.message
    }
  }
}

/**
 * Main API endpoint for BookBarber POS integration
 */
export async function POST(request) {
  try {
    const supabase = createClient()
    
    // Get request data
    const { action, ...data } = await request.json()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get barbershop
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    
    if (!barbershop) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }
    
    // Get CIN7 credentials
    const { data: credentials } = await supabase
      .from('cin7_credentials')
      .select('encrypted_api_key, encrypted_account_id')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true)
      .single()
    
    if (!credentials) {
      return NextResponse.json({ 
        error: 'CIN7 not configured', 
        requiresSetup: true 
      }, { status: 404 })
    }
    
    // Decrypt credentials
    const accountId = decrypt(JSON.parse(credentials.encrypted_account_id))
    const apiKey = decrypt(JSON.parse(credentials.encrypted_api_key))
    const cin7Creds = { accountId, apiKey }
    
    // Handle different actions
    switch (action) {
      case 'CHECK_INVENTORY':
        // Before allowing sale in POS
        const availability = await checkInventoryAvailability(
          data.sku,
          data.quantity,
          cin7Creds
        )
        
        // Log inventory check
        await supabase.from('inventory_checks').insert({
          barbershop_id: barbershop.id,
          product_sku: data.sku,
          requested_quantity: data.quantity,
          available_stock: availability.currentStock,
          check_result: availability.available,
          timestamp: new Date().toISOString()
        })
        
        return NextResponse.json(availability)
      
      case 'RECORD_SALE':
        // After POS sale completion
        const saleResult = await recordSaleInCin7(data, cin7Creds)
        
        // Log sale sync
        await supabase.from('sale_syncs').insert({
          barbershop_id: barbershop.id,
          bookbarber_sale_id: data.saleId,
          cin7_sale_id: saleResult.cin7SaleId,
          sync_status: saleResult.success ? 'success' : 'failed',
          error_message: saleResult.error,
          timestamp: new Date().toISOString()
        })
        
        // Update local inventory cache
        if (saleResult.success) {
          for (const item of data.items) {
            await supabase.rpc('decrement_stock', {
              p_sku: item.sku,
              p_quantity: item.quantity,
              p_barbershop_id: barbershop.id
            })
          }
        }
        
        return NextResponse.json(saleResult)
      
      case 'SYNC_ALL':
        // Full inventory sync (use existing sync logic)
        return NextResponse.json({ 
          message: 'Use /api/cin7/sync endpoint for full sync' 
        })
      
      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 })
    }
    
  } catch (error) {
    console.error('CIN7 sale sync error:', error)
    return NextResponse.json({ 
      error: 'Sale sync failed',
      message: error.message 
    }, { status: 500 })
  }
}