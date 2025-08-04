import * as Sentry from '@sentry/nextjs';

/**
 * Capture and log exceptions with additional context
 */
export function captureException(error, context = {}) {
  console.error('Error captured:', error);
  
  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the exception
    Sentry.captureException(error);
  });
}

/**
 * Log a message to Sentry
 */
export function captureMessage(message, level = 'info', context = {}) {
  Sentry.withScope((scope) => {
    // Add custom context
    Object.keys(context).forEach(key => {
      scope.setContext(key, context[key]);
    });
    
    // Capture the message
    Sentry.captureMessage(message, level);
  });
}

/**
 * Add user context to Sentry
 */
export function setUser(user) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.shop_name || user.full_name,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add custom tags to help filter issues
 */
export function setTag(key, value) {
  Sentry.setTag(key, value);
}

/**
 * Wrap async functions with error handling
 */
export function withSentry(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      captureException(error, {
        function: fn.name,
        arguments: args,
        ...context,
      });
      throw error;
    }
  };
}