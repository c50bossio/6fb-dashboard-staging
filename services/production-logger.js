// Production Logger Service
// Centralized logging with different levels and destinations

const fs = require('fs');
const path = require('path');
const { config } = require('./production-config');

// Log levels
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

// Map string levels to numeric
const levelMap = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'fatal': LogLevel.FATAL
};

// Colors for console output
const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  fatal: '\x1b[35m', // Magenta
  reset: '\x1b[0m'
};

class ProductionLogger {
  constructor(options = {}) {
    this.name = options.name || 'app';
    this.minLevel = levelMap[process.env.LOG_LEVEL || 'info'];
    this.enableConsole = options.console !== false;
    this.enableFile = options.file !== false;
    this.enableRemote = options.remote !== false;
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.maxLogSize = options.maxLogSize || 10 * 1024 * 1024; // 10MB
    this.metadata = options.metadata || {};
    
    // Create log directory if it doesn't exist
    if (this.enableFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  // Format log message
  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      logger: this.name,
      message,
      ...this.metadata,
      ...data,
      environment: process.env.NODE_ENV,
      pid: process.pid
    };

    // Add stack trace for errors
    if (data.error && data.error.stack) {
      logEntry.stack = data.error.stack;
    }

    return logEntry;
  }

  // Console output
  logToConsole(level, logEntry) {
    if (!this.enableConsole) return;

    const color = colors[level] || colors.reset;
    const prefix = `${color}[${level.toUpperCase()}]${colors.reset}`;
    const timestamp = logEntry.timestamp.split('T')[1].split('.')[0];
    
    if (config.environment.isDevelopment) {
      // Pretty print in development
      console.log(`${timestamp} ${prefix} [${this.name}] ${logEntry.message}`);
      if (Object.keys(logEntry).length > 4) {
        const { timestamp, level, logger, message, ...rest } = logEntry;
        if (Object.keys(rest).length > 0) {
          console.log('  ', JSON.stringify(rest, null, 2));
        }
      }
    } else {
      // JSON format in production
      console.log(JSON.stringify(logEntry));
    }
  }

  // File logging
  logToFile(level, logEntry) {
    if (!this.enableFile) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `${this.name}-${date}.log`;
    const filepath = path.join(this.logDir, filename);

    // Check file size and rotate if needed
    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.maxLogSize) {
        const rotatedFile = `${filepath}.${Date.now()}`;
        fs.renameSync(filepath, rotatedFile);
      }
    } catch (err) {
      // File doesn't exist yet, that's ok
    }

    // Append to log file
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(filepath, logLine);
  }

  // Remote logging (e.g., to logging service)
  async logToRemote(level, logEntry) {
    if (!this.enableRemote) return;

    // Send to remote logging service (Datadog, Loggly, etc.)
    if (config.monitoring.logs === 'datadog' && process.env.DATADOG_API_KEY) {
      try {
        // In production, you would send to Datadog API
        // await fetch('https://http-intake.logs.datadoghq.com/v1/input', {
        //   method: 'POST',
        //   headers: {
        //     'DD-API-KEY': process.env.DATADOG_API_KEY,
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify(logEntry)
        // });
      } catch (error) {
        console.error('Failed to send log to remote service:', error);
      }
    }
  }

  // Main logging method
  log(level, message, data = {}) {
    const numericLevel = levelMap[level] || LogLevel.INFO;
    
    // Skip if below minimum level
    if (numericLevel < this.minLevel) {
      return;
    }

    const logEntry = this.formatMessage(level, message, data);

    // Log to different destinations
    this.logToConsole(level, logEntry);
    this.logToFile(level, logEntry);
    this.logToRemote(level, logEntry);

    return logEntry;
  }

  // Convenience methods
  debug(message, data) {
    return this.log('debug', message, data);
  }

  info(message, data) {
    return this.log('info', message, data);
  }

  warn(message, data) {
    return this.log('warn', message, data);
  }

  error(message, data) {
    return this.log('error', message, data);
  }

  fatal(message, data) {
    return this.log('fatal', message, data);
  }

  // Create child logger with additional metadata
  child(metadata) {
    return new ProductionLogger({
      name: this.name,
      console: this.enableConsole,
      file: this.enableFile,
      remote: this.enableRemote,
      logDir: this.logDir,
      maxLogSize: this.maxLogSize,
      metadata: { ...this.metadata, ...metadata }
    });
  }

  // Performance logging
  time(label) {
    const start = Date.now();
    return {
      end: (metadata = {}) => {
        const duration = Date.now() - start;
        this.info(`${label} completed`, {
          duration,
          ...metadata
        });
        return duration;
      }
    };
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || 
                       `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to request object
      req.requestId = requestId;

      // Log request
      this.info('Request received', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - start;
        
        this.info('Request completed', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Audit logging for sensitive operations
  audit(action, details) {
    return this.info(`AUDIT: ${action}`, {
      audit: true,
      action,
      ...details,
      timestamp: new Date().toISOString(),
      userId: details.userId || 'system'
    });
  }

  // Clean up old log files
  cleanup(daysToKeep = 30) {
    if (!this.enableFile) return;

    const cutoff = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    
    fs.readdirSync(this.logDir).forEach(file => {
      const filepath = path.join(this.logDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime.getTime() < cutoff) {
        fs.unlinkSync(filepath);
        this.info('Deleted old log file', { file });
      }
    });
  }
}

// Create default logger instances
const logger = new ProductionLogger({ name: 'app' });
const apiLogger = new ProductionLogger({ name: 'api' });
const auditLogger = new ProductionLogger({ name: 'audit' });
const performanceLogger = new ProductionLogger({ name: 'performance' });

// Export logger factory
function createLogger(name, options = {}) {
  return new ProductionLogger({ name, ...options });
}

module.exports = {
  ProductionLogger,
  logger,
  apiLogger,
  auditLogger,
  performanceLogger,
  createLogger,
  LogLevel
};