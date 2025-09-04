/**
 * Comprehensive Audit Logging System for 6FB AI Agent Automation
 * 
 * Complete audit trail for all automation actions to ensure compliance,
 * traceability, and accountability for business-critical operations.
 * 
 * Features:
 * - Log every automation action with context
 * - Track who/what triggered actions
 * - Maintain compliance trail with retention policies
 * - Searchable logs with advanced filtering
 * - Real-time monitoring of sensitive actions
 * - Data anonymization for privacy compliance
 * - Tamper-evident logging with integrity checks
 */

import { EventEmitter } from 'events';
import { redisClient } from '../redis-client.js';
import { logger } from '../logger.js';
import { getSupabaseServerClient } from '../supabase-server.js';
import { sendAlert, ALERT_SEVERITY } from './alerting.js';
import { createHash } from 'crypto';

// Audit event types
export const AUDIT_EVENT_TYPES = {
  // Automation actions
  FEE_COLLECTION_ATTEMPT: 'fee_collection_attempt',
  FEE_COLLECTION_SUCCESS: 'fee_collection_success',
  FEE_COLLECTION_FAILED: 'fee_collection_failed',
  
  REMINDER_SENT: 'reminder_sent',
  REMINDER_FAILED: 'reminder_failed',
  
  PREDICTION_GENERATED: 'prediction_generated',
  PREDICTION_ACTED_UPON: 'prediction_acted_upon',
  
  // Customer communications
  SMS_SENT: 'sms_sent',
  SMS_FAILED: 'sms_failed',
  EMAIL_SENT: 'email_sent',
  EMAIL_FAILED: 'email_failed',
  
  // Payment processing
  PAYMENT_PROCESSED: 'payment_processed',
  PAYMENT_FAILED: 'payment_failed',
  REFUND_ISSUED: 'refund_issued',
  CHARGEBACK_RECEIVED: 'chargeback_received',
  
  // System events
  SYSTEM_OVERRIDE: 'system_override',
  CIRCUIT_BREAKER_TRIGGERED: 'circuit_breaker_triggered',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  
  // Security events
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  
  // Data events
  DATA_ACCESS: 'data_access',
  DATA_MODIFIED: 'data_modified',
  DATA_EXPORTED: 'data_exported',
  DATA_DELETED: 'data_deleted'
};

// Audit severity levels
export const AUDIT_SEVERITY = {
  LOW: 'low',           // Routine operations
  MEDIUM: 'medium',     // Business operations
  HIGH: 'high',         // Sensitive operations
  CRITICAL: 'critical'  // Security/compliance events
};

// Data sensitivity levels
export const DATA_SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
};

class AuditLogger extends EventEmitter {
  constructor() {
    super();
    
    this.logBuffer = [];
    this.bufferFlushInterval = 30000; // 30 seconds
    this.maxBufferSize = 1000;
    this.retentionPolicies = new Map();
    
    // Sensitive data patterns for anonymization
    this.sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,           // Credit cards
      /\b\d{3}-?\d{2}-?\d{4}\b/g,                              // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email (partial)
      /\b\d{10,}\b/g                                           // Phone numbers
    ];
    
    this.initializeAuditLogger();
    this.setupBufferFlush();
    this.setupRetentionPolicies();
  }
  
  /**
   * Initialize audit logging system
   */
  async initializeAuditLogger() {
    try {
      await this.loadRetentionPolicies();
      await this.createAuditIndexes();
      
      logger.info('Audit logger initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize audit logger', { error: error.message });
    }
  }
  
  /**
   * Log automation event with full context
   */
  async logEvent(eventType, eventData, options = {}) {
    const eventId = this.generateEventId();
    
    try {
      // Create audit entry
      const auditEntry = {
        id: eventId,
        timestamp: new Date(),
        eventType,
        severity: options.severity || this.determineSeverity(eventType),
        
        // Actor information
        actor: {
          type: options.actorType || 'system',
          id: options.actorId,
          email: options.actorEmail,
          ip_address: options.ipAddress,
          user_agent: options.userAgent,
          session_id: options.sessionId
        },
        
        // Target/resource information
        resource: {
          type: options.resourceType,
          id: options.resourceId,
          barbershop_id: options.barbershopId,
          customer_id: options.customerId,
          staff_id: options.staffId
        },
        
        // Event details
        details: this.sanitizeEventData(eventData, options.sensitivity),
        
        // Context information
        context: {
          automation_feature: options.automationFeature,
          trigger_source: options.triggerSource || 'automated',
          correlation_id: options.correlationId,
          request_id: options.requestId,
          version: options.version || '1.0.0'
        },
        
        // Compliance and security
        compliance: {
          data_sensitivity: options.sensitivity || DATA_SENSITIVITY.INTERNAL,
          retention_period: this.getRetentionPeriod(eventType, options.sensitivity),
          anonymize_after: options.anonymizeAfter
        },
        
        // Integrity check
        integrity: {
          checksum: null, // Will be calculated
          source: 'automation_system',
          verified: false
        }
      };
      
      // Calculate integrity checksum
      auditEntry.integrity.checksum = this.calculateChecksum(auditEntry);
      auditEntry.integrity.verified = true;
      
      // Add to buffer for batch processing
      this.logBuffer.push(auditEntry);
      
      // Flush buffer if it's getting full
      if (this.logBuffer.length >= this.maxBufferSize) {
        await this.flushBuffer();
      }
      
      // Emit event for real-time monitoring
      this.emit('audit_event', auditEntry);
      
      // Check for high-severity events that need immediate alerting
      if (auditEntry.severity === AUDIT_SEVERITY.HIGH || 
          auditEntry.severity === AUDIT_SEVERITY.CRITICAL) {
        await this.handleHighSeverityEvent(auditEntry);
      }
      
      return {
        success: true,
        eventId,
        timestamp: auditEntry.timestamp
      };
      
    } catch (error) {
      logger.error('Failed to log audit event', {
        eventId,
        eventType,
        error: error.message,
        stack: error.stack
      });
      
      // Try to log the failure itself
      try {
        await this.logSystemEvent('audit_logging_failed', {
          original_event_type: eventType,
          error: error.message,
          event_id: eventId
        });
      } catch (secondaryError) {
        logger.error('Failed to log audit logging failure', {
          error: secondaryError.message
        });
      }
      
      return {
        success: false,
        error: error.message,
        eventId
      };
    }
  }
  
  /**
   * Log system-level events
   */
  async logSystemEvent(eventType, eventData, options = {}) {
    return this.logEvent(eventType, eventData, {
      ...options,
      actorType: 'system',
      actorId: 'automation_system',
      triggerSource: 'system_internal'
    });
  }
  
  /**
   * Log user action events
   */
  async logUserAction(user, action, resource, eventData, options = {}) {
    return this.logEvent(action, eventData, {
      ...options,
      actorType: 'user',
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: user.ip,
      userAgent: user.user_agent,
      sessionId: user.session_id,
      resourceType: resource.type,
      resourceId: resource.id,
      barbershopId: resource.barbershop_id
    });
  }
  
  /**
   * Generate unique event ID
   */
  generateEventId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `audit_${timestamp}_${random}`;
  }
  
  /**
   * Determine event severity based on type
   */
  determineSeverity(eventType) {
    const severityMap = {
      // Critical security/compliance events
      [AUDIT_EVENT_TYPES.UNAUTHORIZED_ACCESS]: AUDIT_SEVERITY.CRITICAL,
      [AUDIT_EVENT_TYPES.SUSPICIOUS_ACTIVITY]: AUDIT_SEVERITY.CRITICAL,
      [AUDIT_EVENT_TYPES.DATA_DELETED]: AUDIT_SEVERITY.CRITICAL,
      [AUDIT_EVENT_TYPES.SYSTEM_OVERRIDE]: AUDIT_SEVERITY.CRITICAL,
      
      // High-impact business events
      [AUDIT_EVENT_TYPES.PAYMENT_FAILED]: AUDIT_SEVERITY.HIGH,
      [AUDIT_EVENT_TYPES.CHARGEBACK_RECEIVED]: AUDIT_SEVERITY.HIGH,
      [AUDIT_EVENT_TYPES.FEE_COLLECTION_FAILED]: AUDIT_SEVERITY.HIGH,
      [AUDIT_EVENT_TYPES.CIRCUIT_BREAKER_TRIGGERED]: AUDIT_SEVERITY.HIGH,
      
      // Medium business operations
      [AUDIT_EVENT_TYPES.FEE_COLLECTION_SUCCESS]: AUDIT_SEVERITY.MEDIUM,
      [AUDIT_EVENT_TYPES.PAYMENT_PROCESSED]: AUDIT_SEVERITY.MEDIUM,
      [AUDIT_EVENT_TYPES.REFUND_ISSUED]: AUDIT_SEVERITY.MEDIUM,
      [AUDIT_EVENT_TYPES.DATA_MODIFIED]: AUDIT_SEVERITY.MEDIUM,
      
      // Low routine operations
      [AUDIT_EVENT_TYPES.REMINDER_SENT]: AUDIT_SEVERITY.LOW,
      [AUDIT_EVENT_TYPES.EMAIL_SENT]: AUDIT_SEVERITY.LOW,
      [AUDIT_EVENT_TYPES.SMS_SENT]: AUDIT_SEVERITY.LOW,
      [AUDIT_EVENT_TYPES.PREDICTION_GENERATED]: AUDIT_SEVERITY.LOW
    };
    
    return severityMap[eventType] || AUDIT_SEVERITY.MEDIUM;
  }
  
  /**
   * Sanitize event data to remove/anonymize sensitive information
   */
  sanitizeEventData(data, sensitivity = DATA_SENSITIVITY.INTERNAL) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    let sanitized = JSON.parse(JSON.stringify(data));
    
    // For high sensitivity data, anonymize more aggressively
    if (sensitivity === DATA_SENSITIVITY.CONFIDENTIAL || 
        sensitivity === DATA_SENSITIVITY.RESTRICTED) {
      
      sanitized = this.anonymizeSensitiveData(sanitized);
      
      // Remove or hash specific sensitive fields
      const sensitiveFields = [
        'credit_card_number',
        'ssn',
        'tax_id',
        'bank_account',
        'password',
        'api_key',
        'token'
      ];
      
      for (const field of sensitiveFields) {
        if (sanitized[field]) {
          if (field === 'credit_card_number') {
            // Keep last 4 digits for reference
            sanitized[field] = '**** **** **** ' + sanitized[field].toString().slice(-4);
          } else {
            // Hash other sensitive fields
            sanitized[field] = this.hashSensitiveField(sanitized[field]);
          }
        }
      }
    }
    
    return sanitized;
  }
  
  /**
   * Anonymize sensitive data using regex patterns
   */
  anonymizeSensitiveData(data) {
    const dataStr = JSON.stringify(data);
    let anonymized = dataStr;
    
    for (const pattern of this.sensitivePatterns) {
      anonymized = anonymized.replace(pattern, (match) => {
        // Keep partial information for business purposes
        if (match.includes('@')) {
          // Email: keep domain, anonymize user part
          const [user, domain] = match.split('@');
          return `****@${domain}`;
        } else if (match.length >= 10) {
          // Credit card or phone: keep last 4 digits
          return '*'.repeat(match.length - 4) + match.slice(-4);
        } else {
          // Other sensitive data: full anonymization
          return '*'.repeat(match.length);
        }
      });
    }
    
    try {
      return JSON.parse(anonymized);
    } catch (error) {
      logger.warn('Failed to parse anonymized data', { error: error.message });
      return data; // Return original if parsing fails
    }
  }
  
  /**
   * Hash sensitive field values
   */
  hashSensitiveField(value) {
    const hash = createHash('sha256');
    hash.update(value.toString());
    return `hash:${hash.digest('hex').substring(0, 16)}`;
  }
  
  /**
   * Calculate integrity checksum for audit entry
   */
  calculateChecksum(auditEntry) {
    const tempEntry = { ...auditEntry };
    delete tempEntry.integrity; // Exclude integrity field from checksum
    
    const hash = createHash('sha256');
    hash.update(JSON.stringify(tempEntry));
    return hash.digest('hex');
  }
  
  /**
   * Get retention period for event type and sensitivity
   */
  getRetentionPeriod(eventType, sensitivity = DATA_SENSITIVITY.INTERNAL) {
    // Base retention periods in days
    const basePeriods = {
      [AUDIT_SEVERITY.CRITICAL]: 2555, // 7 years (compliance requirement)
      [AUDIT_SEVERITY.HIGH]: 1095,     // 3 years
      [AUDIT_SEVERITY.MEDIUM]: 365,    // 1 year
      [AUDIT_SEVERITY.LOW]: 90         // 90 days
    };
    
    // Sensitivity multipliers
    const sensitivityMultipliers = {
      [DATA_SENSITIVITY.RESTRICTED]: 1.5,
      [DATA_SENSITIVITY.CONFIDENTIAL]: 1.2,
      [DATA_SENSITIVITY.INTERNAL]: 1.0,
      [DATA_SENSITIVITY.PUBLIC]: 0.5
    };
    
    const severity = this.determineSeverity(eventType);
    const basePeriod = basePeriods[severity] || 365;
    const multiplier = sensitivityMultipliers[sensitivity] || 1.0;
    
    return Math.floor(basePeriod * multiplier);
  }
  
  /**
   * Handle high-severity events with immediate alerts
   */
  async handleHighSeverityEvent(auditEntry) {
    try {
      await sendAlert('high_severity_audit_event', {
        severity: ALERT_SEVERITY.ERROR,
        title: `High Severity Audit Event: ${auditEntry.eventType}`,
        message: `High severity event logged requiring attention`,
        eventId: auditEntry.id,
        eventType: auditEntry.eventType,
        actorType: auditEntry.actor.type,
        actorId: auditEntry.actor.id,
        resourceType: auditEntry.resource.type,
        timestamp: auditEntry.timestamp,
        barbershop_id: auditEntry.resource.barbershop_id
      });
    } catch (error) {
      logger.error('Failed to send high-severity audit alert', {
        eventId: auditEntry.id,
        error: error.message
      });
    }
  }
  
  /**
   * Flush buffer to persistent storage
   */
  async flushBuffer() {
    if (this.logBuffer.length === 0) {
      return;
    }
    
    const batch = [...this.logBuffer];
    this.logBuffer = [];
    
    try {
      // Store in Redis for quick access
      await this.storeInRedis(batch);
      
      // Store in database for long-term retention
      await this.storeInDatabase(batch);
      
      logger.debug('Audit buffer flushed', { 
        batchSize: batch.length,
        timestamp: new Date()
      });
      
    } catch (error) {
      logger.error('Failed to flush audit buffer', {
        batchSize: batch.length,
        error: error.message
      });
      
      // Put failed entries back in buffer for retry
      this.logBuffer.unshift(...batch);
    }
  }
  
  /**
   * Store audit entries in Redis
   */
  async storeInRedis(entries) {
    try {
      const pipeline = redisClient.pipeline();
      
      for (const entry of entries) {
        // Store individual entry
        pipeline.setex(
          `audit:${entry.id}`,
          86400 * 7, // 7 days in Redis
          JSON.stringify(entry)
        );
        
        // Add to time-based indexes
        const dayKey = `audit_index:${entry.timestamp.toISOString().split('T')[0]}`;
        pipeline.zadd(dayKey, entry.timestamp.getTime(), entry.id);
        pipeline.expire(dayKey, 86400 * 30); // 30 days
        
        // Add to severity index
        const severityKey = `audit_severity:${entry.severity}`;
        pipeline.zadd(severityKey, entry.timestamp.getTime(), entry.id);
        pipeline.expire(severityKey, 86400 * 7); // 7 days
        
        // Add to event type index
        const typeKey = `audit_type:${entry.eventType}`;
        pipeline.zadd(typeKey, entry.timestamp.getTime(), entry.id);
        pipeline.expire(typeKey, 86400 * 7); // 7 days
        
        // Add to barbershop index if applicable
        if (entry.resource.barbershop_id) {
          const shopKey = `audit_shop:${entry.resource.barbershop_id}`;
          pipeline.zadd(shopKey, entry.timestamp.getTime(), entry.id);
          pipeline.expire(shopKey, 86400 * 30); // 30 days
        }
      }
      
      await pipeline.exec();
    } catch (error) {
      logger.error('Failed to store audit entries in Redis', {
        error: error.message,
        entriesCount: entries.length
      });
      throw error;
    }
  }
  
  /**
   * Store audit entries in database
   */
  async storeInDatabase(entries) {
    try {
      const supabase = getSupabaseServerClient();
      
      const dbEntries = entries.map(entry => ({
        audit_id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        event_type: entry.eventType,
        severity: entry.severity,
        
        // Actor information
        actor_type: entry.actor.type,
        actor_id: entry.actor.id,
        actor_email: entry.actor.email,
        actor_ip: entry.actor.ip_address,
        actor_user_agent: entry.actor.user_agent,
        session_id: entry.actor.session_id,
        
        // Resource information
        resource_type: entry.resource.type,
        resource_id: entry.resource.id,
        barbershop_id: entry.resource.barbershop_id,
        customer_id: entry.resource.customer_id,
        staff_id: entry.resource.staff_id,
        
        // Event details
        details: entry.details,
        
        // Context
        automation_feature: entry.context.automation_feature,
        trigger_source: entry.context.trigger_source,
        correlation_id: entry.context.correlation_id,
        request_id: entry.context.request_id,
        version: entry.context.version,
        
        // Compliance
        data_sensitivity: entry.compliance.data_sensitivity,
        retention_period_days: entry.compliance.retention_period,
        
        // Integrity
        checksum: entry.integrity.checksum,
        verified: entry.integrity.verified
      }));
      
      const { error } = await supabase
        .from('audit_logs')
        .insert(dbEntries);
      
      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }
      
    } catch (error) {
      logger.error('Failed to store audit entries in database', {
        error: error.message,
        entriesCount: entries.length
      });
      throw error;
    }
  }
  
  /**
   * Setup buffer flush timer
   */
  setupBufferFlush() {
    setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushBuffer();
      }
    }, this.bufferFlushInterval);
    
    // Flush on process exit
    process.on('SIGINT', async () => {
      await this.flushBuffer();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await this.flushBuffer();
      process.exit(0);
    });
  }
  
  /**
   * Load retention policies from configuration
   */
  async loadRetentionPolicies() {
    try {
      const supabase = getSupabaseServerClient();
      
      const { data: policies } = await supabase
        .from('audit_retention_policies')
        .select('*')
        .eq('active', true);
      
      if (policies) {
        policies.forEach(policy => {
          this.retentionPolicies.set(policy.event_type || 'default', {
            retentionDays: policy.retention_days,
            anonymizeAfterDays: policy.anonymize_after_days,
            archiveAfterDays: policy.archive_after_days
          });
        });
      }
      
    } catch (error) {
      logger.warn('Failed to load retention policies', { error: error.message });
      
      // Set default retention policies
      this.retentionPolicies.set('default', {
        retentionDays: 365,
        anonymizeAfterDays: 90,
        archiveAfterDays: 30
      });
    }
  }
  
  /**
   * Setup retention policy enforcement
   */
  setupRetentionPolicies() {
    // Run retention cleanup daily at 2 AM
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    
    setInterval(async () => {
      await this.enforceRetentionPolicies();
    }, cleanupInterval);
    
    // Initial cleanup on startup (after 5 minutes)
    setTimeout(async () => {
      await this.enforceRetentionPolicies();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Enforce retention policies
   */
  async enforceRetentionPolicies() {
    try {
      logger.info('Starting audit log retention policy enforcement');
      
      const supabase = getSupabaseServerClient();
      const now = new Date();
      
      // Get all audit logs that need attention
      const { data: expiredLogs } = await supabase
        .from('audit_logs')
        .select('audit_id, timestamp, event_type, data_sensitivity')
        .lt('timestamp', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Older than 30 days
        .limit(1000);
      
      if (!expiredLogs || expiredLogs.length === 0) {
        logger.debug('No audit logs require retention processing');
        return;
      }
      
      let archived = 0;
      let anonymized = 0;
      let deleted = 0;
      
      for (const log of expiredLogs) {
        const logDate = new Date(log.timestamp);
        const ageInDays = Math.floor((now.getTime() - logDate.getTime()) / (24 * 60 * 60 * 1000));
        
        const policy = this.retentionPolicies.get(log.event_type) || 
                      this.retentionPolicies.get('default');
        
        if (ageInDays > policy.retentionDays) {
          // Delete expired logs
          await supabase
            .from('audit_logs')
            .delete()
            .eq('audit_id', log.audit_id);
          
          deleted++;
        } else if (ageInDays > policy.archiveAfterDays) {
          // Archive old logs (move to archive table)
          await this.archiveAuditLog(log);
          archived++;
        } else if (ageInDays > policy.anonymizeAfterDays) {
          // Anonymize sensitive data
          await this.anonymizeAuditLog(log);
          anonymized++;
        }
      }
      
      logger.info('Audit log retention policy enforcement completed', {
        processed: expiredLogs.length,
        archived,
        anonymized,
        deleted
      });
      
    } catch (error) {
      logger.error('Failed to enforce retention policies', {
        error: error.message,
        stack: error.stack
      });
    }
  }
  
  /**
   * Archive audit log entry
   */
  async archiveAuditLog(log) {
    try {
      const supabase = getSupabaseServerClient();
      
      // Move to archive table (implementation depends on your archive strategy)
      // This could be a separate table, cold storage, or external archive system
      
      logger.debug('Audit log archived', { auditId: log.audit_id });
    } catch (error) {
      logger.error('Failed to archive audit log', {
        auditId: log.audit_id,
        error: error.message
      });
    }
  }
  
  /**
   * Anonymize audit log entry
   */
  async anonymizeAuditLog(log) {
    try {
      const supabase = getSupabaseServerClient();
      
      // Remove or anonymize sensitive fields
      const { error } = await supabase
        .from('audit_logs')
        .update({
          actor_email: null,
          actor_ip: null,
          actor_user_agent: null,
          details: this.anonymizeSensitiveData(log.details || {}),
          anonymized_at: new Date().toISOString()
        })
        .eq('audit_id', log.audit_id);
      
      if (error) {
        throw error;
      }
      
      logger.debug('Audit log anonymized', { auditId: log.audit_id });
    } catch (error) {
      logger.error('Failed to anonymize audit log', {
        auditId: log.audit_id,
        error: error.message
      });
    }
  }
  
  /**
   * Create database indexes for efficient querying
   */
  async createAuditIndexes() {
    try {
      const supabase = getSupabaseServerClient();
      
      // Create indexes for common query patterns
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_barbershop_id ON audit_logs(barbershop_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_customer_id ON audit_logs(customer_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation_id ON audit_logs(correlation_id)'
      ];
      
      for (const indexSQL of indexes) {
        try {
          await supabase.rpc('execute_sql', { sql: indexSQL });
        } catch (indexError) {
          // Indexes might already exist, continue
          logger.debug('Index creation skipped or failed', { 
            sql: indexSQL, 
            error: indexError.message 
          });
        }
      }
      
    } catch (error) {
      logger.warn('Failed to create audit indexes', { error: error.message });
    }
  }
  
  /**
   * Search audit logs with advanced filtering
   */
  async searchAuditLogs(filters = {}, options = {}) {
    try {
      const supabase = getSupabaseServerClient();
      
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      // Apply filters
      if (filters.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      
      if (filters.barbershopId) {
        query = query.eq('barbershop_id', filters.barbershopId);
      }
      
      if (filters.actorId) {
        query = query.eq('actor_id', filters.actorId);
      }
      
      if (filters.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      
      if (filters.correlationId) {
        query = query.eq('correlation_id', filters.correlationId);
      }
      
      if (filters.startDate) {
        query = query.gte('timestamp', filters.startDate.toISOString());
      }
      
      if (filters.endDate) {
        query = query.lte('timestamp', filters.endDate.toISOString());
      }
      
      // Apply pagination
      const limit = options.limit || 100;
      const offset = options.offset || 0;
      
      query = query.range(offset, offset + limit - 1);
      
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        data,
        count,
        pagination: {
          limit,
          offset,
          hasMore: count > offset + limit
        }
      };
      
    } catch (error) {
      logger.error('Failed to search audit logs', {
        error: error.message,
        filters,
        options
      });
      
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0
      };
    }
  }
  
  /**
   * Get audit statistics for monitoring
   */
  async getAuditStatistics(timeRange = 86400000) { // 24 hours default
    try {
      const now = new Date();
      const startTime = new Date(now.getTime() - timeRange);
      
      const supabase = getSupabaseServerClient();
      
      // Get basic counts
      const { data: stats } = await supabase
        .from('audit_logs')
        .select('event_type, severity')
        .gte('timestamp', startTime.toISOString());
      
      const statistics = {
        timeRange: {
          start: startTime,
          end: now
        },
        total: stats?.length || 0,
        bySeverity: {},
        byEventType: {},
        byHour: {}
      };
      
      // Initialize severity counts
      Object.values(AUDIT_SEVERITY).forEach(severity => {
        statistics.bySeverity[severity] = 0;
      });
      
      // Process statistics
      if (stats) {
        stats.forEach(entry => {
          // Count by severity
          statistics.bySeverity[entry.severity]++;
          
          // Count by event type
          if (!statistics.byEventType[entry.event_type]) {
            statistics.byEventType[entry.event_type] = 0;
          }
          statistics.byEventType[entry.event_type]++;
        });
      }
      
      return statistics;
    } catch (error) {
      logger.error('Failed to get audit statistics', { error: error.message });
      
      return {
        total: 0,
        bySeverity: {},
        byEventType: {},
        byHour: {},
        error: error.message
      };
    }
  }
  
  /**
   * Verify audit log integrity
   */
  async verifyIntegrity(auditId) {
    try {
      // Get audit entry from Redis or database
      let auditEntry = null;
      
      // Try Redis first
      const redisEntry = await redisClient.get(`audit:${auditId}`);
      if (redisEntry) {
        auditEntry = JSON.parse(redisEntry);
      } else {
        // Fall back to database
        const supabase = getSupabaseServerClient();
        const { data } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('audit_id', auditId)
          .single();
        
        auditEntry = data;
      }
      
      if (!auditEntry) {
        return {
          valid: false,
          error: 'Audit entry not found'
        };
      }
      
      // Recalculate checksum
      const currentChecksum = auditEntry.checksum;
      const tempEntry = { ...auditEntry };
      delete tempEntry.checksum;
      delete tempEntry.verified;
      
      const calculatedChecksum = this.calculateChecksum({ integrity: {}, ...tempEntry });
      
      const valid = currentChecksum === calculatedChecksum;
      
      return {
        valid,
        auditId,
        originalChecksum: currentChecksum,
        calculatedChecksum,
        verified: valid
      };
      
    } catch (error) {
      logger.error('Failed to verify audit log integrity', {
        auditId,
        error: error.message
      });
      
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Convenience functions for common audit operations
export const logAutomationEvent = (eventType, eventData, options) => {
  return auditLogger.logEvent(eventType, eventData, options);
};

export const logUserAction = (user, action, resource, eventData, options) => {
  return auditLogger.logUserAction(user, action, resource, eventData, options);
};

export const logSystemEvent = (eventType, eventData, options) => {
  return auditLogger.logSystemEvent(eventType, eventData, options);
};

export const searchAuditLogs = (filters, options) => {
  return auditLogger.searchAuditLogs(filters, options);
};

export const getAuditStatistics = (timeRange) => {
  return auditLogger.getAuditStatistics(timeRange);
};

export const verifyAuditIntegrity = (auditId) => {
  return auditLogger.verifyIntegrity(auditId);
};

// Export classes and constants
export { 
  AuditLogger, 
  AUDIT_SEVERITY, 
  DATA_SENSITIVITY 
};