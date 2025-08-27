/**
 * Product Commission Webhook Handler
 * Extends the existing webhook system to handle product sales commission calculations
 * Integrates seamlessly with the progressive tier system
 */

import financialService from './financial-service'

/**
 * Process product sale webhook event
 * @param {Object} productSaleData - Product sale event data
 * @param {Object} supabase - Supabase client instance
 * @returns {Object} Processing result
 */
export async function handleProductSaleWebhook(productSaleData, supabase) {
  const startTime = Date.now()
  
  try {
    const {
      product_sale_id,
      barbershop_id,
      barber_id,
      line_items,
      total_amount,
      payment_intent_id,
      metadata = {}
    } = productSaleData

    // Validate required fields
    if (!product_sale_id || !barbershop_id || !barber_id || !line_items || !total_amount) {
      throw new Error('Missing required product sale data fields')
    }

    // Get barber's financial arrangement to determine if product commissions are enabled
    const { data: arrangement } = await financialService.getArrangement(barber_id, barbershop_id)
    
    if (!arrangement) {
      
      return { 
        success: true, 
        reason: 'no_arrangement', 
        processing_time: Date.now() - startTime 
      }
    }

    // Check if product commissions are enabled for this barber
    if (!arrangement.product_commission_rate && 
        (!arrangement.product_category_overrides || Object.keys(arrangement.product_category_overrides).length === 0)) {
      
      return { 
        success: true, 
        reason: 'no_product_commission_config', 
        processing_time: Date.now() - startTime 
      }
    }

    // Prepare sale data for commission calculation
    const saleData = {
      product_sale_id,
      lineItems: line_items.map(item => ({
        product_id: item.product_id,
        product_name: item.name || 'Product',
        quantity: item.quantity || 1,
        unit_price: parseFloat(item.unit_price || 0),
        category: item.category || 'uncategorized'
      })),
      totalAmount: parseFloat(total_amount),
      metadata
    }

    // Calculate product commission with tier integration
    const commissionCalculation = await financialService.calculateProductCommission(
      saleData,
      barber_id,
      barbershop_id
    )

    if (!commissionCalculation.success) {
      console.error(`❌ Product commission calculation failed: ${commissionCalculation.error}`)
      await recordProductCommissionError(
        product_sale_id,
        'commission_calculation_failed',
        commissionCalculation.error,
        supabase
      )
      return { 
        success: false, 
        error: commissionCalculation.error,
        processing_time: Date.now() - startTime
      }
    }

    console.log(`Product commission calculated successfully`)

    // Record commission transactions
    const transactionResult = await financialService.recordProductCommissionTransactions(
      saleData,
      commissionCalculation,
      barber_id,
      barbershop_id
    )

    if (transactionResult.error) {
      console.error(`❌ Failed to record product commission transactions: ${transactionResult.error}`)
      await recordProductCommissionError(
        product_sale_id,
        'transaction_recording_failed',
        transactionResult.error,
        supabase
      )
      return { 
        success: false, 
        error: transactionResult.error,
        processing_time: Date.now() - startTime
      }
    }

    // Update barber commission balance
    await updateBarberBalanceForProduct(
      barber_id,
      barbershop_id,
      commissionCalculation.barberAmount,
      transactionResult.data,
      supabase
    )

    // Send product commission notification
    await sendProductCommissionNotification({
      barberId: barber_id,
      barbershopId: barbershop_id,
      productSaleId: product_sale_id,
      commissionAmount: commissionCalculation.barberAmount,
      products: line_items,
      tierInfo: commissionCalculation.tierInfo,
      timestamp: new Date().toISOString()
    })

    const processingTime = Date.now() - startTime

    // Log tier achievement if applicable
    if (commissionCalculation.tierInfo?.tierUpgrade) {
      
    }

    return {
      success: true,
      commission_amount: commissionCalculation.barberAmount,
      base_commission: commissionCalculation.baseCommissionAmount,
      tier_bonus: commissionCalculation.tierBonusAmount || 0,
      tier_contribution: commissionCalculation.tierContributionAmount,
      transaction_ids: transactionResult.data.map(tx => tx.id),
      tier_info: commissionCalculation.tierInfo,
      processing_time: processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ Product commission webhook processing failed:`, error)

    await recordProductCommissionError(
      productSaleData.product_sale_id,
      'webhook_processing_failed',
      error.message,
      supabase
    )

    return {
      success: false,
      error: error.message,
      processing_time: processingTime
    }
  }
}

/**
 * Process product return/refund webhook event
 * @param {Object} returnData - Product return event data
 * @param {Object} supabase - Supabase client instance
 * @returns {Object} Processing result
 */
export async function handleProductReturnWebhook(returnData, supabase) {
  const startTime = Date.now()
  
  try {
    const {
      original_product_sale_id,
      barbershop_id,
      barber_id,
      returned_items,
      return_reason,
      processed_by,
      total_refund_amount
    } = returnData

    // Process return through financial service
    const returnResult = await financialService.processProductReturn({
      original_product_sale_id,
      barbershopId: barbershop_id,
      barberId: barber_id,
      returned_items,
      adjustment_reason: return_reason || 'Product return',
      processed_by
    })

    if (returnResult.error) {
      console.error(`❌ Product return processing failed: ${returnResult.error}`)
      await recordProductCommissionError(
        original_product_sale_id,
        'return_processing_failed',
        returnResult.error,
        supabase
      )
      return { 
        success: false, 
        error: returnResult.error,
        processing_time: Date.now() - startTime
      }
    }

    // Send return notification
    await sendProductReturnNotification({
      barberId: barber_id,
      barbershopId: barbershop_id,
      originalSaleId: original_product_sale_id,
      commissionAdjustment: returnResult.data.total_commission_adjustment,
      tierAdjustment: returnResult.data.total_tier_adjustment,
      returnedItems: returned_items,
      refundAmount: total_refund_amount,
      timestamp: new Date().toISOString()
    })

    const processingTime = Date.now() - startTime

    return {
      success: true,
      commission_adjustment: returnResult.data.total_commission_adjustment,
      tier_adjustment: returnResult.data.total_tier_adjustment,
      adjustment_records: returnResult.data.adjustments,
      processing_time: processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error(`❌ Product return webhook processing failed:`, error)

    await recordProductCommissionError(
      returnData.original_product_sale_id,
      'return_webhook_processing_failed',
      error.message,
      supabase
    )

    return {
      success: false,
      error: error.message,
      processing_time: processingTime
    }
  }
}

/**
 * Update barber balance for product commission
 * @param {string} barberId - Barber ID
 * @param {string} barbershopId - Barbershop ID  
 * @param {number} commissionAmount - Commission amount
 * @param {Array} transactionRecords - Commission transaction records
 * @param {Object} supabase - Supabase client instance
 */
async function updateBarberBalanceForProduct(barberId, barbershopId, commissionAmount, transactionRecords, supabase) {
  try {
    // Get current balance
    const { data: balance } = await supabase
      .from('barber_commission_balances')
      .select('*')
      .eq('barber_id', barberId)
      .eq('barbershop_id', barbershopId)
      .single()

    if (balance) {
      // Update existing balance
      await supabase
        .from('barber_commission_balances')
        .update({
          pending_amount: balance.pending_amount + commissionAmount,
          total_earned: balance.total_earned + commissionAmount,
          product_commission_earned: (balance.product_commission_earned || 0) + commissionAmount,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', balance.id)
    } else {
      // Create new balance record
      await supabase
        .from('barber_commission_balances')
        .insert({
          barber_id: barberId,
          barbershop_id: barbershopId,
          pending_amount: commissionAmount,
          paid_amount: 0,
          total_earned: commissionAmount,
          product_commission_earned: commissionAmount,
          last_transaction_at: new Date().toISOString()
        })
    }

    console.log(`Updated barber balance for product commission`)
  } catch (error) {
    console.error('Error updating barber balance for product:', error)
    throw error
  }
}

/**
 * Send product commission notification
 * @param {Object} notificationData - Notification data
 */
async function sendProductCommissionNotification(notificationData) {
  try {
    const {
      barberId,
      barbershopId,
      productSaleId,
      commissionAmount,
      products,
      tierInfo,
      timestamp
    } = notificationData

    // TODO: Integrate with notification service
    console.log(`Product commission notification queued for barber ${barberId}`)

    if (tierInfo?.tierUpgrade) {
      
    }

    // Could integrate with:
    // - Email service (SendGrid, etc.)
    // - SMS service (Twilio, etc.)
    // - Push notifications
    // - In-app notifications
    // - Dashboard alerts

    return true
  } catch (error) {
    console.error('Failed to send product commission notification:', error)
    return false
  }
}

/**
 * Send product return notification
 * @param {Object} notificationData - Return notification data
 */
async function sendProductReturnNotification(notificationData) {
  try {
    const {
      barberId,
      barbershopId,
      originalSaleId,
      commissionAdjustment,
      tierAdjustment,
      returnedItems,
      refundAmount,
      timestamp
    } = notificationData

    if (Math.abs(tierAdjustment) > 0) {
      
    }

    // TODO: Integrate with notification service

    return true
  } catch (error) {
    console.error('Failed to send product return notification:', error)
    return false
  }
}

/**
 * Record product commission processing error for debugging
 * @param {string} productSaleId - Product sale ID
 * @param {string} errorType - Type of error
 * @param {string} errorMessage - Error message
 * @param {Object} supabase - Supabase client instance
 */
async function recordProductCommissionError(productSaleId, errorType, errorMessage, supabase) {
  try {
    await supabase
      .from('product_commission_processing_errors')
      .insert({
        product_sale_id: productSaleId,
        error_type: errorType,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      })

    console.error(`📝 Product commission error logged: ${errorType} - ${errorMessage}`)
  } catch (error) {
    console.error('Failed to record product commission error:', error.message)
  }
}

/**
 * Integrate product sales with existing Stripe payment_intent.succeeded handler
 * @param {Object} paymentIntent - Stripe PaymentIntent object
 * @param {Object} supabase - Supabase client instance
 * @returns {Object} Processing result
 */
export async function handleProductSalePayment(paymentIntent, supabase) {
  try {
    // Check if this payment includes product sales
    const productSaleId = paymentIntent.metadata?.product_sale_id
    if (!productSaleId) {
      return { success: true, reason: 'no_product_sale' }
    }

    // Get product sale details
    const { data: productSale, error } = await supabase
      .from('product_sales')
      .select('*')
      .eq('id', productSaleId)
      .single()

    if (error || !productSale) {
      console.error('Product sale not found for payment:', productSaleId)
      return { success: false, error: 'product_sale_not_found' }
    }

    // Skip if commission already calculated
    if (productSale.commission_calculated) {
      
      return { success: true, reason: 'already_calculated' }
    }

    // Process product sale commission
    const productSaleData = {
      product_sale_id: productSale.id,
      barbershop_id: productSale.barbershop_id,
      barber_id: productSale.barber_id,
      line_items: productSale.line_items || [],
      total_amount: productSale.total_amount,
      payment_intent_id: paymentIntent.id,
      metadata: {
        payment_method: 'stripe',
        customer_id: paymentIntent.customer,
        ...paymentIntent.metadata
      }
    }

    const result = await handleProductSaleWebhook(productSaleData, supabase)

    return result

  } catch (error) {
    console.error('Error handling product sale payment:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Handle product inventory updates after commission calculation
 * @param {Object} saleData - Product sale data
 * @param {Object} supabase - Supabase client instance
 */
export async function updateProductInventoryAfterSale(saleData, supabase) {
  try {
    const { line_items, barbershop_id, barber_id } = saleData

    // Update inventory for each product
    for (const item of line_items) {
      const { product_id, quantity } = item

      // Update product stock
      await supabase
        .from('products')
        .update({
          current_stock: supabase.raw(`current_stock - ${quantity}`)
        })
        .eq('id', product_id)
        .eq('barbershop_id', barbershop_id)

      // Record inventory adjustment
      await supabase
        .from('inventory_adjustments')
        .insert({
          product_id: product_id,
          barbershop_id: barbershop_id,
          adjusted_by: barber_id,
          adjustment_type: 'sale',
          quantity_change: -quantity,
          stock_before: supabase.raw(`(SELECT current_stock + ${quantity} FROM products WHERE id = '${product_id}')`),
          stock_after: supabase.raw(`(SELECT current_stock FROM products WHERE id = '${product_id}')`),
          reference_type: 'product_sale',
          reference_id: saleData.product_sale_id,
          reason: 'Product sold to customer'
        })
    }

  } catch (error) {
    console.error('Error updating product inventory:', error)
    // Don't throw - commission processing should still succeed
  }
}

export default {
  handleProductSaleWebhook,
  handleProductReturnWebhook,
  handleProductSalePayment,
  updateProductInventoryAfterSale
}