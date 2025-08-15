
const fs = require('fs');
const path = require('path');
const { config } = require('./production-config');

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

const levelMap = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'fatal': LogLevel.FATAL
};

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
    
    if (this.enableFile && !fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

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

    if (data.error && data.error.stack) {
      logEntry.stack = data.error.stack;
    }

    return logEntry;
  }

  logToConsole(level, logEntry) {
    if (!this.enableConsole) return;

    const color = colors[level] || colors.reset;
    const prefix = `${color}[${level.toUpperCase()}]${colors.reset}`;
    const timestamp = logEntry.timestamp.split('T')[1].split('.')[0];
    
    if (config.environment.isDevelopment) {
      console.log(`${timestamp} ${prefix} [${this.name}] ${logEntry.message}`);
      if (Object.keys(logEntry).length > 4) {
        const { timestamp, level, logger, message, ...rest } = logEntry;
        if (Object.keys(rest).length > 0) {
          console.log('  ', JSON.stringify(rest, null, 2));
        }
      }
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  logToFile(level, logEntry) {
    if (!this.enableFile) return;

    const date = new Date().toISOString().split('T')[0];
    const filename = `${this.name}-${date}.log`;
    const filepath = path.join(this.logDir, filename);

    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.maxLogSize) {
        const rotatedFile = `${filepath}.${Date.now()}`;
        fs.renameSync(filepath, rotatedFile);
      }
    } catch (err) {
    }

    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(filepath, logLine);
  }

  async logToRemote(level, logEntry) {
    if (!this.enableRemote) return;

    if (config.monitoring.logs === 'datadog' && process.env.DATADOG_API_KEY) {
      try {
        //     'DD-API-KEY': process.env.DATADOG_API_KEY,
        //     'Content-Type': 'application/json'
        //   },
        // });
      } catch (error) {
        console.error('Failed to send log to remote service:', error);
      }
    }
  }

  log(level, message, data = {}) {
    const numericLevel = levelMap[level] || LogLevel.INFO;
    
    if (numericLevel < this.minLevel) {
      return;
    }

    const logEntry = this.formatMessage(level, message, data);

    this.logToConsole(level, logEntry);
    this.logToFile(level, logEntry);
    this.logToRemote(level, logEntry);

    return logEntry;
  }

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

  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      const requestId = req.headers['x-request-id'] || 
                       `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      req.requestId = requestId;

      this.info('Request received', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

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

  audit(action, details) {
    return this.info(`AUDIT: ${action}`, {
      audit: true,
      action,
      ...details,
      timestamp: new Date().toISOString(),
      userId: details.userId || 'system'
    });
  }

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

const logger = new ProductionLogger({ name: 'app' });
const apiLogger = new ProductionLogger({ name: 'api' });
const auditLogger = new ProductionLogger({ name: 'audit' });
const performanceLogger = new ProductionLogger({ name: 'performance' });

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