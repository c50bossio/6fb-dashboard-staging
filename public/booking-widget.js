/**
 * Booking Widget Loader
 * Dynamically creates an iframe-based booking widget for external websites
 * 
 * Usage:
 * <div id="booking-widget-container"></div>
 * <script src="https://yourdomain.com/booking-widget.js" data-config='{"barberId":"123"}'></script>
 * 
 * Or programmatically:
 * <script>
 *   window.BookingWidget.init({
 *     container: 'my-widget-container',
 *     barberId: '123',
 *     theme: 'light'
 *   });
 * </script>
 */

(function() {
  'use strict';
  
  // Default configuration
  const DEFAULT_CONFIG = {
    width: '100%',
    height: '600px',
    theme: 'light',
    primaryColor: '#3B82F6',
    hideHeader: false,
    hideFooter: false,
    autoResize: true,
    shadow: true,
    borderRadius: 8,
    services: [],
    className: 'booking-widget',
    onReady: null,
    onBookingComplete: null,
    onError: null
  };

  // Get the current script tag
  const currentScript = document.currentScript || 
    (function() {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  // Extract base URL from script source
  const scriptSrc = currentScript ? currentScript.src : '';
  const BASE_URL = scriptSrc ? 
    scriptSrc.replace('/booking-widget.js', '') : 
    window.location.origin;

  /**
   * BookingWidget Constructor
   */
  function BookingWidget(config) {
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
    this.iframe = null;
    this.container = null;
    this.resizeObserver = null;
    
    this.init();
  }

  BookingWidget.prototype.init = function() {
    // Find container
    const containerId = this.config.container || 'booking-widget-container';
    this.container = typeof containerId === 'string' ? 
      document.getElementById(containerId) : 
      containerId;

    if (!this.container) {
      this.handleError('Container element not found: ' + containerId);
      return;
    }

    // Validate required config
    if (!this.config.barberId) {
      this.handleError('barberId is required');
      return;
    }

    this.createWidget();
    this.setupEventListeners();
    this.trackAnalytics('widget-init');
  };

  BookingWidget.prototype.createWidget = function() {
    // Create iframe wrapper for responsive behavior
    const wrapper = document.createElement('div');
    wrapper.className = this.config.className + '-wrapper';
    wrapper.style.cssText = this.getWrapperStyles();

    // Create iframe
    this.iframe = document.createElement('iframe');
    this.iframe.src = this.buildEmbedUrl();
    this.iframe.className = this.config.className;
    this.iframe.style.cssText = this.getIframeStyles();
    this.iframe.setAttribute('frameborder', '0');
    this.iframe.setAttribute('allowfullscreen', '');
    this.iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-popups');
    
    // Accessibility attributes
    this.iframe.setAttribute('role', 'application');
    this.iframe.setAttribute('aria-label', 'Booking appointment form');
    this.iframe.setAttribute('title', 'Book an appointment');

    wrapper.appendChild(this.iframe);
    this.container.appendChild(wrapper);

    // Setup auto-resize if enabled
    if (this.config.autoResize) {
      this.setupAutoResize();
    }
  };

  BookingWidget.prototype.buildEmbedUrl = function() {
    const params = new URLSearchParams();
    
    // Add theme and styling parameters
    if (this.config.theme !== 'light') params.append('theme', this.config.theme);
    if (this.config.hideHeader) params.append('hideHeader', 'true');
    if (this.config.hideFooter) params.append('hideFooter', 'true');
    if (this.config.primaryColor !== DEFAULT_CONFIG.primaryColor) {
      params.append('color', this.config.primaryColor.replace('#', ''));
    }
    
    // Add service selection
    if (this.config.services && this.config.services.length > 0) {
      params.append('services', this.config.services.join(','));
    }
    
    // Add tracking parameters
    params.append('widget', 'true');
    params.append('ref', window.location.hostname);
    
    const baseUrl = `${BASE_URL}/book/${this.config.barberId}/embed`;
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  };

  BookingWidget.prototype.getWrapperStyles = function() {
    if (this.config.autoResize) {
      return `
        position: relative;
        width: ${this.config.width};
        transition: height 0.3s ease;
        ${this.config.shadow ? 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);' : ''}
        border-radius: ${this.config.borderRadius}px;
        overflow: hidden;
      `.replace(/\s+/g, ' ').trim();
    }
    return `
      position: relative;
      width: ${this.config.width};
      height: ${this.config.height};
      ${this.config.shadow ? 'box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);' : ''}
      border-radius: ${this.config.borderRadius}px;
      overflow: hidden;
    `.replace(/\s+/g, ' ').trim();
  };

  BookingWidget.prototype.getIframeStyles = function() {
    return `
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      border-radius: ${this.config.borderRadius}px;
    `.replace(/\s+/g, ' ').trim();
  };

  BookingWidget.prototype.setupAutoResize = function() {
    // Listen for resize messages from iframe
    this.resizeHandler = (event) => {
      // Verify message origin
      const iframeSrc = this.iframe.src;
      const messageOrigin = event.origin;
      
      if (!iframeSrc.startsWith(messageOrigin) && messageOrigin !== BASE_URL.replace(/:\d+$/, '')) {
        return;
      }

      if (event.data && event.data.type === 'resize' && event.data.height) {
        const wrapper = this.iframe.parentNode;
        wrapper.style.height = event.data.height + 'px';
        this.trackAnalytics('widget-resize', { height: event.data.height });
      }
    };

    window.addEventListener('message', this.resizeHandler);
  };

  BookingWidget.prototype.setupEventListeners = function() {
    // Listen for messages from iframe
    this.messageHandler = (event) => {
      // Verify message origin
      const iframeSrc = this.iframe.src;
      const messageOrigin = event.origin;
      
      if (!iframeSrc.startsWith(messageOrigin) && messageOrigin !== BASE_URL.replace(/:\d+$/, '')) {
        return;
      }

      if (event.data) {
        switch (event.data.type) {
          case 'booking-complete':
            this.handleBookingComplete(event.data);
            break;
          case 'widget-ready':
            this.handleWidgetReady();
            break;
          case 'widget-error':
            this.handleError(event.data.message);
            break;
        }
      }
    };

    window.addEventListener('message', this.messageHandler);

    // Handle iframe load
    this.iframe.onload = () => {
      this.handleWidgetReady();
    };

    this.iframe.onerror = () => {
      this.handleError('Failed to load booking widget');
    };
  };

  BookingWidget.prototype.handleWidgetReady = function() {
    this.trackAnalytics('widget-ready');
    
    if (typeof this.config.onReady === 'function') {
      try {
        this.config.onReady(this);
      } catch (error) {
        console.error('Error in onReady callback:', error);
      }
    }

    // Dispatch custom event
    const event = new CustomEvent('bookingWidgetReady', {
      detail: { widget: this }
    });
    window.dispatchEvent(event);
  };

  BookingWidget.prototype.handleBookingComplete = function(data) {
    this.trackAnalytics('booking-complete', data);
    
    if (typeof this.config.onBookingComplete === 'function') {
      try {
        this.config.onBookingComplete(data);
      } catch (error) {
        console.error('Error in onBookingComplete callback:', error);
      }
    }

    // Dispatch custom event
    const event = new CustomEvent('bookingComplete', {
      detail: data
    });
    window.dispatchEvent(event);
  };

  BookingWidget.prototype.handleError = function(message) {
    console.error('Booking Widget Error:', message);
    
    if (typeof this.config.onError === 'function') {
      try {
        this.config.onError(message);
      } catch (error) {
        console.error('Error in onError callback:', error);
      }
    }

    // Show user-friendly error message
    if (this.container) {
      this.container.innerHTML = `
        <div style="
          padding: 40px 20px;
          text-align: center;
          border: 2px dashed #e5e5e5;
          border-radius: ${this.config.borderRadius}px;
          color: #666;
          font-family: system-ui, -apple-system, sans-serif;
        ">
          <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">Unable to load booking widget</div>
          <div style="font-size: 14px; color: #999;">${message}</div>
        </div>
      `;
    }
  };

  BookingWidget.prototype.trackAnalytics = function(event, data) {
    // Send analytics to the embed tracking API
    fetch(`${BASE_URL}/api/barber/embed-settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        linkId: this.config.barberId,
        event: event,
        referrer: window.location.href,
        userAgent: navigator.userAgent,
        data: data
      })
    }).catch(error => {
      console.debug('Analytics tracking failed:', error);
    });
  };

  BookingWidget.prototype.destroy = function() {
    // Cleanup event listeners
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
    if (this.resizeHandler) {
      window.removeEventListener('message', this.resizeHandler);
    }

    // Remove DOM elements
    if (this.iframe && this.iframe.parentNode && this.iframe.parentNode.parentNode) {
      this.iframe.parentNode.parentNode.removeChild(this.iframe.parentNode);
    }

    this.trackAnalytics('widget-destroy');
  };

  // Global BookingWidget object
  window.BookingWidget = {
    version: '1.0.0',
    
    init: function(config) {
      return new BookingWidget(config);
    },

    // Utility method to create widget from data attributes
    initFromScript: function(scriptElement) {
      const dataConfig = scriptElement.getAttribute('data-config');
      let config = {};
      
      if (dataConfig) {
        try {
          config = JSON.parse(dataConfig);
        } catch (error) {
          console.error('Invalid data-config JSON:', error);
          return null;
        }
      }

      // Extract individual data attributes as fallback
      const attributes = scriptElement.attributes;
      for (let i = 0; i < attributes.length; i++) {
        const attr = attributes[i];
        if (attr.name.startsWith('data-') && attr.name !== 'data-config') {
          const key = attr.name.substring(5); // Remove 'data-' prefix
          config[key] = attr.value;
        }
      }

      return this.init(config);
    }
  };

  // Auto-initialize if script has data-config attribute
  if (currentScript) {
    const autoInit = currentScript.getAttribute('data-auto-init');
    if (autoInit !== 'false') {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
          window.BookingWidget.initFromScript(currentScript);
        });
      } else {
        window.BookingWidget.initFromScript(currentScript);
      }
    }
  }

  // Expose constructor for advanced usage
  window.BookingWidget.Widget = BookingWidget;

})();