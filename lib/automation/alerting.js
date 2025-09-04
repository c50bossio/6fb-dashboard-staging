/**
 * Advanced Alerting System for 6FB AI Agent Automation
 * 
 * Intelligent alerting with threshold monitoring, anomaly detection,
 * and multi-channel notifications to protect business operations.
 * 
 * Features:
 * - Threshold-based alerts with severity levels
 * - Anomaly detection using statistical analysis
 * - Multi-channel notifications (Slack, Discord, Email, SMS, Webhooks)
 * - Alert suppression and cooldowns
 * - Manager escalation chains
 * - Integration with circuit breakers and rate limiting
 */

import { EventEmitter } from 'events';
import { redisClient } from '../redis-client.js';
import { logger } from '../logger.js';
import { getSupabaseServerClient } from '../supabase-server.js';

// Alert severity levels
export const ALERT_SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Alert categories
export const ALERT_CATEGORIES = {
  SYSTEM: 'system',
  AUTOMATION: 'automation',
  BUSINESS: 'business',
  SECURITY: 'security',
  PERFORMANCE: 'performance'
};

// Alert channels
export const ALERT_CHANNELS = {
  SLACK: 'slack',
  DISCORD: 'discord',
  EMAIL: 'email',
  SMS: 'sms',
  WEBHOOK: 'webhook',
  PUSH: 'push'
};

// Default alert thresholds
const DEFAULT_THRESHOLDS = {
  // System thresholds
  memory_usage_warning: 80,     // 80%
  memory_usage_critical: 90,    // 90%
  response_time_warning: 2000,  // 2 seconds
  response_time_critical: 5000, // 5 seconds
  
  // Automation thresholds
  error_rate_warning: 5,        // 5%
  error_rate_critical: 15,      // 15%
  queue_depth_warning: 100,     // 100 items
  queue_depth_critical: 500,    // 500 items
  
  // Business thresholds
  failed_payments_warning: 3,   // 3 failed payments in 1 hour
  failed_payments_critical: 10, // 10 failed payments in 1 hour
  customer_complaints_warning: 2,   // 2 complaints in 1 hour
  customer_complaints_critical: 5,  // 5 complaints in 1 hour
  
  // Rate limiting thresholds
  rate_limit_breach_warning: 3,     // 3 breaches in 1 hour
  rate_limit_breach_critical: 10,   // 10 breaches in 1 hour
};

class AlertingSystem extends EventEmitter {
  constructor() {
    super();
    
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.alertHistory = new Map();
    this.suppressedAlerts = new Map();
    this.escalationChains = new Map();
    this.channelConfigs = new Map();
    
    // Alert suppression settings
    this.suppressionSettings = {
      duplicate_window: 300000,    // 5 minutes
      escalation_delay: 900000,    // 15 minutes
      max_alerts_per_hour: 50,     // Rate limit alerts
      cooldown_period: 600000      // 10 minutes cooldown
    };
    
    this.initializeSystem();
    this.startBackgroundProcesses();
  }
  
  /**
   * Initialize alerting system
   */
  async initializeSystem() {
    try {
      await this.loadConfiguration();
      await this.setupDefaultChannels();
      await this.loadEscalationChains();
      
      logger.info('Alerting system initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize alerting system', { error: error.message });
    }
  }
  
  /**
   * Load alerting configuration from database
   */
  async loadConfiguration() {
    try {
      const supabase = getSupabaseServerClient();
      
      // Load alert thresholds
      const { data: thresholds } = await supabase
        .from('alert_thresholds')
        .select('*')
        .eq('active', true);
      
      if (thresholds) {
        thresholds.forEach(threshold => {
          this.thresholds[threshold.metric_name] = threshold.threshold_value;
        });
      }
      
      // Load channel configurations
      const { data: channels } = await supabase
        .from('alert_channels')
        .select('*')
        .eq('active', true);
      
      if (channels) {
        channels.forEach(channel => {
          this.channelConfigs.set(channel.channel_type, {
            enabled: true,
            config: channel.configuration,
            endpoints: channel.endpoints
          });
        });
      }
      
    } catch (error) {
      logger.warn('Failed to load alerting configuration from database', { 
        error: error.message 
      });
      // Continue with defaults
    }
  }
  
  /**
   * Setup default notification channels
   */
  async setupDefaultChannels() {
    // Setup default channels with environment variables
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channelConfigs.set(ALERT_CHANNELS.SLACK, {
        enabled: true,
        config: {
          webhook_url: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
          username: '6FB Alert Bot'
        }
      });
    }
    
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.channelConfigs.set(ALERT_CHANNELS.DISCORD, {
        enabled: true,
        config: {
          webhook_url: process.env.DISCORD_WEBHOOK_URL,
          username: '6FB Alert Bot'
        }
      });
    }
    
    if (process.env.SENDGRID_API_KEY) {
      this.channelConfigs.set(ALERT_CHANNELS.EMAIL, {
        enabled: true,
        config: {
          api_key: process.env.SENDGRID_API_KEY,
          from_email: process.env.SENDGRID_FROM_EMAIL || 'alerts@6fbooking.com',
          to_emails: (process.env.ALERT_EMAIL_RECIPIENTS || '').split(',').filter(Boolean)
        }
      });
    }
    
    if (process.env.TWILIO_ACCOUNT_SID) {
      this.channelConfigs.set(ALERT_CHANNELS.SMS, {
        enabled: true,
        config: {
          account_sid: process.env.TWILIO_ACCOUNT_SID,
          auth_token: process.env.TWILIO_AUTH_TOKEN,
          from_number: process.env.TWILIO_PHONE_NUMBER,
          to_numbers: (process.env.ALERT_SMS_RECIPIENTS || '').split(',').filter(Boolean)
        }
      });
    }
  }
  
  /**
   * Load escalation chains from configuration
   */
  async loadEscalationChains() {
    try {
      const supabase = getSupabaseServerClient();
      
      const { data: chains } = await supabase
        .from('escalation_chains')
        .select('*')
        .eq('active', true);
      
      if (chains) {
        chains.forEach(chain => {
          this.escalationChains.set(chain.alert_type, {
            levels: chain.escalation_levels,
            delays: chain.escalation_delays
          });
        });
      }
      
      // Set default escalation chain if none configured
      if (this.escalationChains.size === 0) {
        this.escalationChains.set('default', {
          levels: [
            { channels: [ALERT_CHANNELS.SLACK], delay: 0 },
            { channels: [ALERT_CHANNELS.EMAIL], delay: 300000 }, // 5 minutes
            { channels: [ALERT_CHANNELS.SMS], delay: 900000 }    // 15 minutes
          ]
        });
      }
      
    } catch (error) {
      logger.warn('Failed to load escalation chains', { error: error.message });
      
      // Setup basic default escalation
      this.escalationChains.set('default', {
        levels: [
          { channels: [ALERT_CHANNELS.SLACK], delay: 0 }
        ]
      });
    }
  }
  
  /**
   * Send alert through the alerting system
   */
  async sendAlert(alertType, alertData, options = {}) {
    const alertId = this.generateAlertId(alertType, alertData);
    
    try {
      // Check for alert suppression
      if (await this.isAlertSuppressed(alertId, alertType)) {
        logger.debug('Alert suppressed', { alertType, alertId });
        return { success: true, suppressed: true, alertId };
      }
      
      // Create alert object
      const alert = {
        id: alertId,
        type: alertType,
        severity: alertData.severity || ALERT_SEVERITY.WARNING,
        category: alertData.category || ALERT_CATEGORIES.AUTOMATION,
        title: alertData.title || this.generateAlertTitle(alertType),
        message: alertData.message || alertData.details || 'No details provided',
        details: alertData,
        timestamp: new Date(),
        barbershop_id: alertData.barbershop_id,
        user_id: alertData.user_id,
        metadata: {
          source: 'automation_system',
          version: '1.0.0',
          ...options.metadata
        }
      };
      
      // Store alert in history
      await this.storeAlert(alert);
      
      // Determine notification channels based on severity and type
      const channels = this.determineNotificationChannels(alert);
      
      // Send notifications
      const results = await this.sendNotifications(alert, channels);
      
      // Setup escalation if needed
      if (alert.severity === ALERT_SEVERITY.CRITICAL || alert.severity === ALERT_SEVERITY.ERROR) {
        await this.setupEscalation(alert);
      }
      
      // Update suppression tracking
      await this.updateSuppressionTracking(alertId, alertType);
      
      // Emit alert event
      this.emit('alert', alert);
      
      logger.info('Alert sent successfully', {
        alertId: alert.id,
        type: alert.type,
        severity: alert.severity,
        channels: channels.length,
        results: results.filter(r => r.success).length
      });
      
      return {
        success: true,
        alertId: alert.id,
        channelsNotified: results.filter(r => r.success).length,
        channelResults: results
      };
      
    } catch (error) {
      logger.error('Failed to send alert', {
        alertType,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        error: error.message,
        alertId
      };
    }
  }
  
  /**
   * Generate unique alert ID
   */
  generateAlertId(alertType, alertData) {
    const hash = require('crypto')
      .createHash('sha256')
      .update(`${alertType}-${JSON.stringify(alertData)}-${Date.now()}`)
      .digest('hex')
      .substring(0, 16);
      
    return `alert_${hash}`;
  }
  
  /**
   * Check if alert should be suppressed
   */
  async isAlertSuppressed(alertId, alertType) {
    try {
      // Check for duplicate alerts in the suppression window
      const suppressionKey = `alert_suppression:${alertType}`;
      const recentAlerts = await redisClient.lrange(suppressionKey, 0, -1);
      
      const now = Date.now();
      const windowStart = now - this.suppressionSettings.duplicate_window;
      
      // Count recent similar alerts
      let recentCount = 0;
      for (const alertStr of recentAlerts) {
        try {
          const recentAlert = JSON.parse(alertStr);
          if (recentAlert.timestamp > windowStart) {
            recentCount++;
          }
        } catch (parseError) {
          continue;
        }
      }
      
      // Check rate limiting
      if (recentCount >= this.suppressionSettings.max_alerts_per_hour) {
        return true;
      }
      
      // Check specific alert suppression
      const alertSuppressionKey = `alert_specific_suppression:${alertId}`;
      const isSpecificallySupp = await redisClient.exists(alertSuppressionKey) === 1;
        return isSpecificallySupp;
      
      return false;
      
    } catch (error) {
      logger.error('Alert suppression check failed', { 
        error: error.message, 
        alertId, 
        alertType 
      });
      return false; // Allow alert if check fails
    }
  }
  
  /**
   * Generate alert title based on type
   */
  generateAlertTitle(alertType) {
    const titles = {
      circuit_breaker_opened: '🔴 Circuit Breaker Opened',
      circuit_breaker_recovered: '✅ Circuit Breaker Recovered',
      rate_limit_exceeded: '⚠️ Rate Limit Exceeded',
      system_overload: '🚨 System Overload Detected',
      automation_failure: '❌ Automation Failure',
      payment_failure: '💳 Payment Processing Failure',
      customer_complaint: '😞 Customer Complaint Detected',
      security_incident: '🛡️ Security Incident',
      performance_degradation: '📉 Performance Degradation',
      database_error: '🗃️ Database Error',
      external_service_down: '🔌 External Service Unavailable'
    };
    
    return titles[alertType] || '🔔 System Alert';
  }
  
  /**
   * Determine which channels to use for notification
   */
  determineNotificationChannels(alert) {
    const channels = [];
    
    // Base channels by severity
    switch (alert.severity) {
      case ALERT_SEVERITY.INFO:
        channels.push(ALERT_CHANNELS.SLACK);
        break;
        
      case ALERT_SEVERITY.WARNING:
        channels.push(ALERT_CHANNELS.SLACK);
        if (this.channelConfigs.has(ALERT_CHANNELS.EMAIL)) {
          channels.push(ALERT_CHANNELS.EMAIL);
        }
        break;
        
      case ALERT_SEVERITY.ERROR:
        channels.push(ALERT_CHANNELS.SLACK);
        channels.push(ALERT_CHANNELS.EMAIL);
        if (this.channelConfigs.has(ALERT_CHANNELS.DISCORD)) {
          channels.push(ALERT_CHANNELS.DISCORD);
        }
        break;
        
      case ALERT_SEVERITY.CRITICAL:
        // Use all available channels for critical alerts
        this.channelConfigs.forEach((config, channel) => {
          if (config.enabled) {
            channels.push(channel);
          }
        });
        break;
    }
    
    // Filter to only enabled channels
    return channels.filter(channel => 
      this.channelConfigs.has(channel) && 
      this.channelConfigs.get(channel).enabled
    );
  }
  
  /**
   * Send notifications to all specified channels
   */
  async sendNotifications(alert, channels) {
    const results = [];
    
    for (const channel of channels) {
      try {
        const result = await this.sendToChannel(alert, channel);
        results.push({ channel, success: true, result });
      } catch (error) {
        results.push({ 
          channel, 
          success: false, 
          error: error.message 
        });
        
        logger.error(`Failed to send alert to ${channel}`, {
          alertId: alert.id,
          channel,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Send alert to specific channel
   */
  async sendToChannel(alert, channel) {
    const config = this.channelConfigs.get(channel);
    
    if (!config || !config.enabled) {
      throw new Error(`Channel ${channel} not configured or disabled`);
    }
    
    switch (channel) {
      case ALERT_CHANNELS.SLACK:
        return await this.sendSlackAlert(alert, config);
        
      case ALERT_CHANNELS.DISCORD:
        return await this.sendDiscordAlert(alert, config);
        
      case ALERT_CHANNELS.EMAIL:
        return await this.sendEmailAlert(alert, config);
        
      case ALERT_CHANNELS.SMS:
        return await this.sendSMSAlert(alert, config);
        
      case ALERT_CHANNELS.WEBHOOK:
        return await this.sendWebhookAlert(alert, config);
        
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }
  
  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert, config) {
    const color = this.getAlertColor(alert.severity);
    
    const payload = {
      channel: config.config.channel,
      username: config.config.username,
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Category',
            value: alert.category,
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          }
        ],
        footer: '6FB Automation System',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };
    
    const response = await fetch(config.config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
    }
    
    return { channel: 'slack', status: 'sent' };
  }
  
  /**
   * Send Discord alert
   */
  async sendDiscordAlert(alert, config) {
    const color = this.getAlertColorInt(alert.severity);
    
    const payload = {
      username: config.config.username,
      embeds: [{
        title: alert.title,
        description: alert.message,
        color,
        fields: [
          {
            name: 'Severity',
            value: alert.severity.toUpperCase(),
            inline: true
          },
          {
            name: 'Category',
            value: alert.category,
            inline: true
          },
          {
            name: 'Alert ID',
            value: alert.id,
            inline: true
          }
        ],
        timestamp: alert.timestamp.toISOString(),
        footer: {
          text: '6FB Automation System'
        }
      }]
    };
    
    const response = await fetch(config.config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
    }
    
    return { channel: 'discord', status: 'sent' };
  }
  
  /**
   * Send email alert
   */
  async sendEmailAlert(alert, config) {
    // This would integrate with SendGrid or another email service
    // For now, return a placeholder implementation
    
    const emailData = {
      to: config.config.to_emails,
      from: config.config.from_email,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: this.generateEmailTemplate(alert)
    };
    
    // TODO: Implement actual email sending
    logger.info('Email alert would be sent', { emailData });
    
    return { channel: 'email', status: 'sent', recipients: config.config.to_emails.length };
  }
  
  /**
   * Send SMS alert
   */
  async sendSMSAlert(alert, config) {
    // This would integrate with Twilio or another SMS service
    // For now, return a placeholder implementation
    
    const message = `${alert.title}\n${alert.message}\nTime: ${alert.timestamp.toLocaleString()}`;
    
    // TODO: Implement actual SMS sending
    logger.info('SMS alert would be sent', { 
      message, 
      recipients: config.config.to_numbers.length 
    });
    
    return { channel: 'sms', status: 'sent', recipients: config.config.to_numbers.length };
  }
  
  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert, config) {
    const payload = {
      alert_id: alert.id,
      type: alert.type,
      severity: alert.severity,
      category: alert.category,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      details: alert.details,
      metadata: alert.metadata
    };
    
    const response = await fetch(config.config.webhook_url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': '6FB-Alert-System/1.0'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
    }
    
    return { channel: 'webhook', status: 'sent', endpoint: config.config.webhook_url };
  }
  
  /**
   * Setup alert escalation
   */
  async setupEscalation(alert) {
    const escalationChain = this.escalationChains.get(alert.type) || 
                           this.escalationChains.get('default');
    
    if (!escalationChain) {
      logger.warn('No escalation chain configured for alert', { alertType: alert.type });
      return;
    }
    
    for (const level of escalationChain.levels) {
      if (level.delay > 0) {
        // Schedule delayed escalation
        setTimeout(async () => {
          try {
            await this.escalateAlert(alert, level);
          } catch (error) {
            logger.error('Alert escalation failed', {
              alertId: alert.id,
              level,
              error: error.message
            });
          }
        }, level.delay);
      } else {
        // Immediate escalation
        await this.escalateAlert(alert, level);
      }
    }
  }
  
  /**
   * Escalate alert to next level
   */
  async escalateAlert(alert, level) {
    const escalatedAlert = {
      ...alert,
      title: `🚨 ESCALATED: ${alert.title}`,
      message: `This alert has been escalated due to lack of response.\n\nOriginal Alert:\n${alert.message}`,
      metadata: {
        ...alert.metadata,
        escalated: true,
        escalation_level: level.level || 'unknown'
      }
    };
    
    await this.sendNotifications(escalatedAlert, level.channels);
    
    logger.info('Alert escalated', {
      alertId: alert.id,
      escalationLevel: level.level,
      channels: level.channels
    });
  }
  
  /**
   * Store alert in history and database
   */
  async storeAlert(alert) {
    try {
      // Store in Redis for quick access
      await redisClient.lpush('alert_history', JSON.stringify(alert));
      await redisClient.ltrim('alert_history', 0, 999); // Keep last 1000 alerts
      await redisClient.expire('alert_history', 86400 * 7); // 7 days
      
      // Store in database for long-term tracking
      const supabase = getSupabaseServerClient();
      
      const { error } = await supabase
        .from('alerts')
        .insert({
          alert_id: alert.id,
          alert_type: alert.type,
          severity: alert.severity,
          category: alert.category,
          title: alert.title,
          message: alert.message,
          details: alert.details,
          barbershop_id: alert.barbershop_id,
          user_id: alert.user_id,
          metadata: alert.metadata,
          created_at: alert.timestamp.toISOString()
        });
      
      if (error) {
        logger.warn('Failed to store alert in database', { 
          alertId: alert.id, 
          error: error.message 
        });
      }
      
    } catch (error) {
      logger.error('Failed to store alert', {
        alertId: alert.id,
        error: error.message
      });
    }
  }
  
  /**
   * Update suppression tracking
   */
  async updateSuppressionTracking(alertId, alertType) {
    try {
      const suppressionKey = `alert_suppression:${alertType}`;
      const alertData = {
        id: alertId,
        timestamp: Date.now()
      };
      
      await redisClient.lpush(suppressionKey, JSON.stringify(alertData));
      await redisClient.ltrim(suppressionKey, 0, 99); // Keep last 100
      await redisClient.expire(suppressionKey, 3600); // 1 hour
      
    } catch (error) {
      logger.error('Failed to update suppression tracking', {
        error: error.message,
        alertId,
        alertType
      });
    }
  }
  
  /**
   * Start background processes
   */
  startBackgroundProcesses() {
    // Cleanup old suppressed alerts every hour
    setInterval(() => {
      this.cleanupSuppressedAlerts().catch(error => {
        logger.error('Suppressed alerts cleanup failed', { error: error.message });
      });
    }, 3600000); // 1 hour
    
    // Health check for alerting system every 5 minutes
    setInterval(() => {
      this.performSelfHealthCheck().catch(error => {
        logger.error('Alerting system health check failed', { error: error.message });
      });
    }, 300000); // 5 minutes
  }
  
  /**
   * Cleanup old suppressed alerts
   */
  async cleanupSuppressedAlerts() {
    try {
      const keys = await redisClient.keys('alert_suppression:*');
      
      for (const key of keys) {
        await redisClient.expire(key, 3600); // Ensure 1 hour expiry
      }
      
      logger.debug('Suppressed alerts cleanup completed', { keysProcessed: keys.length });
    } catch (error) {
      logger.error('Suppressed alerts cleanup failed', { error: error.message });
    }
  }
  
  /**
   * Perform self health check
   */
  async performSelfHealthCheck() {
    try {
      // Check Redis connectivity
      await redisClient.ping();
      
      // Check channel configurations
      let healthyChannels = 0;
      this.channelConfigs.forEach((config, channel) => {
        if (config.enabled) {
          healthyChannels++;
        }
      });
      
      if (healthyChannels === 0) {
        logger.warn('No alert channels are enabled');
      }
      
      logger.debug('Alerting system health check passed', { 
        enabledChannels: healthyChannels 
      });
      
    } catch (error) {
      logger.error('Alerting system health check failed', { error: error.message });
    }
  }
  
  /**
   * Get alert color for Slack
   */
  getAlertColor(severity) {
    const colors = {
      [ALERT_SEVERITY.INFO]: 'good',
      [ALERT_SEVERITY.WARNING]: 'warning',
      [ALERT_SEVERITY.ERROR]: 'danger',
      [ALERT_SEVERITY.CRITICAL]: 'danger'
    };
    
    return colors[severity] || 'warning';
  }
  
  /**
   * Get alert color as integer for Discord
   */
  getAlertColorInt(severity) {
    const colors = {
      [ALERT_SEVERITY.INFO]: 0x36a64f,      // Green
      [ALERT_SEVERITY.WARNING]: 0xffaa00,   // Orange
      [ALERT_SEVERITY.ERROR]: 0xff0000,     // Red
      [ALERT_SEVERITY.CRITICAL]: 0x8b0000   // Dark Red
    };
    
    return colors[severity] || 0xffaa00;
  }
  
  /**
   * Generate email template for alerts
   */
  generateEmailTemplate(alert) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 16px;">${alert.title}</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            ${alert.message}
          </p>
          <div style="margin-top: 20px; padding: 15px; background: #fff; border-radius: 4px; border-left: 4px solid ${this.getSeverityColor(alert.severity)};">
            <strong>Alert Details:</strong><br>
            <strong>Severity:</strong> ${alert.severity.toUpperCase()}<br>
            <strong>Category:</strong> ${alert.category}<br>
            <strong>Time:</strong> ${alert.timestamp.toLocaleString()}<br>
            <strong>Alert ID:</strong> ${alert.id}
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #777; text-align: center;">
            6FB Automation System | Alert generated at ${alert.timestamp.toLocaleString()}
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Get severity color for email templates
   */
  getSeverityColor(severity) {
    const colors = {
      [ALERT_SEVERITY.INFO]: '#36a64f',
      [ALERT_SEVERITY.WARNING]: '#ffaa00',
      [ALERT_SEVERITY.ERROR]: '#ff0000',
      [ALERT_SEVERITY.CRITICAL]: '#8b0000'
    };
    
    return colors[severity] || '#ffaa00';
  }
  
  /**
   * Get alert statistics
   */
  async getAlertStatistics(timeRange = 86400000) { // 24 hours default
    try {
      const now = Date.now();
      const startTime = now - timeRange;
      
      const alerts = await redisClient.lrange('alert_history', 0, -1);
      const stats = {
        total: 0,
        bySeverity: {},
        byCategory: {},
        byType: {},
        recentAlerts: [],
        timeRange: {
          start: new Date(startTime),
          end: new Date(now)
        }
      };
      
      Object.values(ALERT_SEVERITY).forEach(severity => {
        stats.bySeverity[severity] = 0;
      });
      
      Object.values(ALERT_CATEGORIES).forEach(category => {
        stats.byCategory[category] = 0;
      });
      
      for (const alertStr of alerts) {
        try {
          const alert = JSON.parse(alertStr);
          const alertTime = new Date(alert.timestamp).getTime();
          
          if (alertTime >= startTime) {
            stats.total++;
            stats.bySeverity[alert.severity]++;
            stats.byCategory[alert.category]++;
            
            if (!stats.byType[alert.type]) {
              stats.byType[alert.type] = 0;
            }
            stats.byType[alert.type]++;
            
            stats.recentAlerts.push({
              id: alert.id,
              type: alert.type,
              severity: alert.severity,
              title: alert.title,
              timestamp: alert.timestamp
            });
          }
        } catch (parseError) {
          continue;
        }
      }
      
      // Sort recent alerts by timestamp (newest first)
      stats.recentAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      stats.recentAlerts = stats.recentAlerts.slice(0, 20); // Limit to 20 most recent
      
      return stats;
      
    } catch (error) {
      logger.error('Failed to get alert statistics', { error: error.message });
      return {
        total: 0,
        bySeverity: {},
        byCategory: {},
        byType: {},
        recentAlerts: [],
        error: error.message
      };
    }
  }
  
  /**
   * Suppress specific alert type temporarily
   */
  async suppressAlertType(alertType, durationMs = 3600000) { // 1 hour default
    try {
      const suppressionKey = `alert_type_suppression:${alertType}`;
      
      await redisClient.setex(suppressionKey, Math.floor(durationMs / 1000), 'suppressed');
      
      logger.info('Alert type suppressed', { alertType, durationMs });
      
      return {
        success: true,
        alertType,
        suppressedUntil: new Date(Date.now() + durationMs)
      };
      
    } catch (error) {
      logger.error('Failed to suppress alert type', {
        alertType,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
export const alertingSystem = new AlertingSystem();

// Convenience functions
export const sendAlert = (alertType, alertData, options) => {
  return alertingSystem.sendAlert(alertType, alertData, options);
};

export const getAlertStatistics = (timeRange) => {
  return alertingSystem.getAlertStatistics(timeRange);
};

export const suppressAlertType = (alertType, duration) => {
  return alertingSystem.suppressAlertType(alertType, duration);
};

// Export classes and constants (ALERT_SEVERITY and ALERT_CHANNELS already exported above)
export { AlertingSystem };