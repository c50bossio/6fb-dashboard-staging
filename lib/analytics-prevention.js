/**
 * Analytics Prevention Utility
 * Prevents phantom analytics script loading errors
 */

// Prevent any automatic Vercel Analytics injection
if (typeof window !== 'undefined') {
  // Block any attempts to load va.vercel-scripts.com
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (typeof url === 'string' && url.includes('va.vercel-scripts.com')) {
      if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS) {
        console.warn('Blocked phantom Vercel Analytics request:', url);
      }
      return Promise.reject(new Error('Vercel Analytics not configured'));
    }
    return originalFetch.call(this, url, options);
  };

  // Block script element creation for Vercel Analytics
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && typeof value === 'string' && value.includes('va.vercel-scripts.com')) {
          if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS) {
            console.warn('Blocked phantom Vercel Analytics script:', value);
          }
          return;
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };

  // Prevent any global analytics object creation
  Object.defineProperty(window, 'va', {
    get() {
      return undefined;
    },
    set() {
      if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS) {
        console.warn('Attempted to set global va (Vercel Analytics) - blocked');
      }
    }
  });
}

export default function preventAnalyticsErrors() {
  // This function is called to initialize the prevention measures
  // All the work is done in the module execution above
  return true;
}