export class SecurityLogger {
  static log(level, type, message, metadata = {}) {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      level,
      type,
      message,
      metadata,
      source: '6fb-ai-agent-system'
    }
    
    console.log(`[SECURITY:${level}] ${timestamp} - ${type}: ${message}`, metadata)
    
    if (level === 'CRITICAL') {
      this.sendAlert(logEntry)
    }
  }
  
  static info(type, message, metadata) {
    this.log('INFO', type, message, metadata)
  }
  
  static warning(type, message, metadata) {
    this.log('WARNING', type, message, metadata)
  }
  
  static error(type, message, metadata) {
    this.log('ERROR', type, message, metadata)
  }
  
  static critical(type, message, metadata) {
    this.log('CRITICAL', type, message, metadata)
  }
  
  static sendAlert(logEntry) {
    // - Slack webhook
    // - Email notifications
    // - SMS alerts
    // - Security monitoring service
    
    console.error('🚨 SECURITY ALERT:', logEntry)
  }
  
  static logFailedLogin(ip, email, userAgent) {
    this.warning('FAILED_LOGIN', 'Failed login attempt', {
      ip,
      email,
      userAgent,
      timestamp: new Date().toISOString()
    })
  }
  
  static logSuspiciousActivity(type, ip, details) {
    this.error('SUSPICIOUS_ACTIVITY', `${type} detected`, {
      ip,
      activityType: type,
      details,
      timestamp: new Date().toISOString()
    })
  }
  
  static logSecurityViolation(type, ip, endpoint, details) {
    this.critical('SECURITY_VIOLATION', `${type} violation`, {
      ip,
      endpoint,
      violationType: type,
      details,
      timestamp: new Date().toISOString()
    })
  }
}
