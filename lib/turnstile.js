// Cloudflare Turnstile CAPTCHA Integration

let turnstileScriptLoaded = false;
const turnstileInstance = null;

// Load Turnstile script dynamically
export function loadTurnstileScript() {
  if (turnstileScriptLoaded || typeof window === 'undefined') {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      turnstileScriptLoaded = true;
      resolve();
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load Turnstile script'));
    };
    
    document.head.appendChild(script);
  });
}

// Render Turnstile widget
export async function renderTurnstile(container, options = {}) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    console.warn('Turnstile not available - missing site key or running on server');
    return null;
  }

  try {
    await loadTurnstileScript();
    
    if (!window.turnstile) {
      throw new Error('Turnstile script failed to load');
    }

    const widgetId = window.turnstile.render(container, {
      sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      theme: options.theme || 'auto',
      size: options.size || 'normal',
      callback: options.callback || function(token) {
        console.log('Turnstile token:', token);
      },
      'error-callback': options.errorCallback || function() {
        console.error('Turnstile error');
      },
      'expired-callback': options.expiredCallback || function() {
        console.log('Turnstile token expired');
      },
      'timeout-callback': options.timeoutCallback || function() {
        console.log('Turnstile timeout');
      },
      ...options
    });

    return widgetId;
  } catch (error) {
    console.error('Turnstile render error:', error);
    return null;
  }
}

// Reset Turnstile widget
export function resetTurnstile(widgetId) {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      window.turnstile.reset(widgetId);
    } catch (error) {
      console.error('Turnstile reset error:', error);
    }
  }
}

// Get Turnstile response token
export function getTurnstileResponse(widgetId) {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      return window.turnstile.getResponse(widgetId);
    } catch (error) {
      console.error('Turnstile get response error:', error);
      return null;
    }
  }
  return null;
}

// Remove Turnstile widget
export function removeTurnstile(widgetId) {
  if (typeof window !== 'undefined' && window.turnstile) {
    try {
      window.turnstile.remove(widgetId);
    } catch (error) {
      console.error('Turnstile remove error:', error);
    }
  }
}

// Verify Turnstile token on backend
export async function verifyTurnstileToken(token) {
  try {
    const response = await fetch('/api/turnstile/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// React hook for Turnstile
export function useTurnstile(options = {}) {
  const [widgetId, setWidgetId] = React.useState(null);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [token, setToken] = React.useState(null);

  const render = React.useCallback(async (container) => {
    if (!container) return;

    try {
      const id = await renderTurnstile(container, {
        ...options,
        callback: (token) => {
          setToken(token);
          if (options.callback) {
            options.callback(token);
          }
        },
        'error-callback': () => {
          setToken(null);
          if (options.errorCallback) {
            options.errorCallback();
          }
        },
        'expired-callback': () => {
          setToken(null);
          if (options.expiredCallback) {
            options.expiredCallback();
          }
        },
      });
      
      setWidgetId(id);
      setIsLoaded(true);
    } catch (error) {
      console.error('useTurnstile render error:', error);
    }
  }, [options]);

  const reset = React.useCallback(() => {
    if (widgetId) {
      resetTurnstile(widgetId);
      setToken(null);
    }
  }, [widgetId]);

  const remove = React.useCallback(() => {
    if (widgetId) {
      removeTurnstile(widgetId);
      setWidgetId(null);
      setIsLoaded(false);
      setToken(null);
    }
  }, [widgetId]);

  return {
    render,
    reset,
    remove,
    widgetId,
    isLoaded,
    token,
  };
}

// Default export
export default {
  loadScript: loadTurnstileScript,
  render: renderTurnstile,
  reset: resetTurnstile,
  getResponse: getTurnstileResponse,
  remove: removeTurnstile,
  verify: verifyTurnstileToken,
  useTurnstile,
};