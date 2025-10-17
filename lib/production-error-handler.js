/**
 * Production Error Handler
 * Centralized error handling for production environment
 */

export class ProductionErrorHandler {
  static handle(error, context = {}) {
    // Log to monitoring service (e.g., Sentry)
    console.error('[Production Error]', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Return user-friendly error
    return {
      error: 'An error occurred. Please try again later.',
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };
  }
  
  static handleApiError(error, statusCode = 500) {
    const handled = this.handle(error);
    return {
      ...handled,
      status: statusCode
    };
  }
}

export default ProductionErrorHandler;
