/**
 * Unified POS Response Handler
 * Standardizes response formats across all payment methods
 * Ensures consistent error handling and success responses
 */

/**
 * Standard success response format for POS operations
 */
export function createSuccessResponse(data, message = 'Operation completed successfully') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  }
}

/**
 * Standard error response format for POS operations
 */
export function createErrorResponse(error, details = null, statusCode = 500) {
  return {
    success: false,
    error: typeof error === 'string' ? error : error.message,
    details: details || (process.env.NODE_ENV === 'development' ? error.stack : null),
    timestamp: new Date().toISOString(),
    statusCode
  }
}

/**
 * Payment method specific response formatters
 */
export const PaymentResponseFormatters = {
  /**
   * Payment Link response format
   */
  paymentLink: (paymentLinkData) => {
    return createSuccessResponse({
      paymentLink: {
        id: paymentLinkData.id,
        url: paymentLinkData.url || paymentLinkData.payment_link_url,
        expiresAt: paymentLinkData.expiresAt || paymentLinkData.expires_at,
        amount: paymentLinkData.amount,
        currency: paymentLinkData.currency || 'usd',
        customer_contact: paymentLinkData.customer_contact,
        contact_method: paymentLinkData.contact_method,
        status: paymentLinkData.status || 'pending',
        send_result: paymentLinkData.send_result
      },
      metadata: {
        payment_method: 'payment_link',
        barberbarberbarbershop_id: paymentLinkData.barberbarberbarbershop_id,
        barber_id: paymentLinkData.barber_id,
        created_at: paymentLinkData.created_at
      }
    }, 'Payment link created and sent successfully')
  },

  /**
   * QR Code Payment response format
   */
  qrPayment: (qrSessionData) => {
    return createSuccessResponse({
      qrPayment: {
        sessionId: qrSessionData.sessionId || qrSessionData.session_id,
        checkoutUrl: qrSessionData.checkoutUrl || qrSessionData.stripe_session_url,
        qrSessionId: qrSessionData.qrSessionId || qrSessionData.id,
        expiresAt: qrSessionData.expiresAt || qrSessionData.expires_at,
        totalAmount: qrSessionData.totalAmount || qrSessionData.total_amount,
        currency: 'usd',
        status: qrSessionData.status || 'pending'
      },
      metadata: {
        payment_method: 'qr_code',
        barberbarberbarbershop_id: qrSessionData.barberbarberbarbershop_id,
        barber_id: qrSessionData.barber_id,
        customer_id: qrSessionData.customer_id,
        created_at: qrSessionData.created_at
      }
    }, 'QR payment session created successfully')
  },

  /**
   * Terminal Payment response format
   */
  terminalPayment: (terminalData) => {
    return createSuccessResponse({
      terminalPayment: {
        payment_intent: {
          id: terminalData.payment_intent?.id,
          client_secret: terminalData.payment_intent?.client_secret,
          amount: terminalData.payment_intent?.amount,
          currency: terminalData.payment_intent?.currency || 'usd',
          status: terminalData.payment_intent?.status
        },
        reader: {
          id: terminalData.reader?.id,
          stripe_reader_id: terminalData.reader?.stripe_reader_id,
          status: terminalData.reader?.status || 'busy'
        }
      },
      metadata: {
        payment_method: 'terminal',
        barberbarberbarbershop_id: terminalData.barberbarberbarbershop_id,
        barber_id: terminalData.barber_id,
        customer_id: terminalData.customer_id,
        connected_account: terminalData.metadata?.connected_account || false,
        subtotal: terminalData.metadata?.subtotal,
        tax: terminalData.metadata?.tax,
        total: terminalData.metadata?.total,
        items_count: terminalData.metadata?.items_count
      }
    }, 'Terminal payment intent created successfully')
  }
}

/**
 * Payment status check response format
 */
export function formatPaymentStatusResponse(paymentData, paymentMethod) {
  const baseResponse = {
    status: paymentData.status,
    amount: paymentData.amount || paymentData.total_amount || paymentData.payment_intent?.amount,
    currency: paymentData.currency || 'usd',
    payment_method: paymentMethod,
    created_at: paymentData.created_at,
    updated_at: paymentData.updated_at || paymentData.processed_at,
    barberbarberbarbershop_id: paymentData.barberbarberbarbershop_id,
    barber_id: paymentData.barber_id
  }

  // Add method-specific data
  switch (paymentMethod) {
    case 'payment_link':
      return createSuccessResponse({
        ...baseResponse,
        payment_link_url: paymentData.payment_link_url,
        customer_contact: paymentData.customer_contact,
        contact_method: paymentData.contact_method,
        expires_at: paymentData.expires_at,
        paid_at: paymentData.paid_at
      })
    
    case 'qr_code':
      return createSuccessResponse({
        ...baseResponse,
        session_id: paymentData.session_id,
        checkout_url: paymentData.stripe_session_url,
        expires_at: paymentData.expires_at,
        processed_at: paymentData.processed_at
      })
    
    case 'terminal':
      return createSuccessResponse({
        ...baseResponse,
        stripe_payment_intent_id: paymentData.stripe_payment_intent_id,
        reader_id: paymentData.reader_id,
        charges: paymentData.charges
      })
    
    default:
      return createSuccessResponse(baseResponse)
  }
}

/**
 * Validation error response format
 */
export function createValidationErrorResponse(errors) {
  return createErrorResponse('Validation failed', {
    validation_errors: Array.isArray(errors) ? errors : [errors]
  }, 400)
}

/**
 * Authentication error response format
 */
export function createAuthErrorResponse(message = 'Authentication required') {
  return createErrorResponse(message, null, 401)
}

/**
 * Authorization error response format
 */
export function createAuthorizationErrorResponse(message = 'Insufficient permissions') {
  return createErrorResponse(message, null, 403)
}

/**
 * Resource not found error response format
 */
export function createNotFoundErrorResponse(resource = 'Resource') {
  return createErrorResponse(`${resource} not found`, null, 404)
}

/**
 * Service unavailable error response format
 */
export function createServiceUnavailableResponse(service = 'Service') {
  return createErrorResponse(`${service} is currently unavailable`, null, 503)
}

/**
 * Rate limit error response format
 */
export function createRateLimitErrorResponse(limit, resetTime) {
  return createErrorResponse('Rate limit exceeded', {
    limit,
    reset_time: resetTime,
    retry_after: Math.ceil((resetTime - Date.now()) / 1000)
  }, 429)
}

/**
 * Unified error handler for POS endpoints
 * Automatically formats common error types
 */
export function handlePOSError(error, context = {}) {
  console.error('POS Error:', error, context)

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return createValidationErrorResponse(error.message)
  }
  
  if (error.name === 'AuthenticationError') {
    return createAuthErrorResponse(error.message)
  }
  
  if (error.name === 'AuthorizationError') {
    return createAuthorizationErrorResponse(error.message)
  }
  
  if (error.name === 'NotFoundError') {
    return createNotFoundErrorResponse(error.resource)
  }
  
  if (error.type === 'StripeCardError') {
    return createErrorResponse('Card processing error', error.message, 402)
  }
  
  if (error.type === 'StripeInvalidRequestError') {
    return createErrorResponse('Invalid payment request', error.message, 400)
  }
  
  if (error.code === 'PGRST116') {
    return createNotFoundErrorResponse('Database record')
  }

  // Handle database connection errors
  if (error.message?.includes('connection') || error.message?.includes('timeout')) {
    return createServiceUnavailableResponse('Database')
  }

  // Generic error response
  return createErrorResponse(
    error.message || 'An unexpected error occurred',
    process.env.NODE_ENV === 'development' ? error.stack : null,
    500
  )
}

/**
 * Success response helper for cart operations
 */
export function createCartOperationResponse(operation, data) {
  const operations = {
    add: 'Item added to cart successfully',
    update: 'Cart updated successfully',
    remove: 'Item removed from cart successfully',
    clear: 'Cart cleared successfully'
  }

  return createSuccessResponse(data, operations[operation] || 'Cart operation completed')
}

/**
 * Success response helper for inventory operations
 */
export function createInventoryOperationResponse(operation, data) {
  const operations = {
    update: 'Inventory updated successfully',
    reserve: 'Inventory reserved successfully',
    release: 'Inventory reservation released',
    adjust: 'Inventory adjustment completed'
  }

  return createSuccessResponse(data, operations[operation] || 'Inventory operation completed')
}

/**
 * Middleware for standardizing all POS endpoint responses
 */
export function standardizePOSResponse(handler) {
  return async (request, context) => {
    try {
      const result = await handler(request, context)
      
      // If result is already a Response object, return it
      if (result instanceof Response) {
        return result
      }
      
      // If result has success property, it's already formatted
      if (result && typeof result === 'object' && 'success' in result) {
        return Response.json(result, { 
          status: result.statusCode || (result.success ? 200 : 500)
        })
      }
      
      // Otherwise, wrap in success format
      return Response.json(createSuccessResponse(result))
      
    } catch (error) {
      const errorResponse = handlePOSError(error)
      return Response.json(errorResponse, { 
        status: errorResponse.statusCode 
      })
    }
  }
}

/**
 * Helper to extract and validate common POS request parameters
 */
export function extractPOSParams(body) {
  const {
    barberbarberbarbershopId,
    barberId,
    customerId,
    cartItems = [],
    customerContact,
    contactMethod = 'sms'
  } = body

  // Validation
  const errors = []
  
  if (!barberbarberbarbershopId) {
    errors.push('barberbarberbarbershopId is required')
  }
  
  if (!Array.isArray(cartItems)) {
    errors.push('cartItems must be an array')
  } else if (cartItems.length === 0) {
    errors.push('cartItems cannot be empty')
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`)
  }

  return {
    barberbarberbarbershopId,
    barberId,
    customerId,
    cartItems,
    customerContact,
    contactMethod
  }
}

export default {
  createSuccessResponse,
  createErrorResponse,
  PaymentResponseFormatters,
  formatPaymentStatusResponse,
  handlePOSError,
  standardizePOSResponse,
  extractPOSParams,
  createValidationErrorResponse,
  createAuthErrorResponse,
  createAuthorizationErrorResponse,
  createNotFoundErrorResponse,
  createServiceUnavailableResponse,
  createRateLimitErrorResponse,
  createCartOperationResponse,
  createInventoryOperationResponse
}