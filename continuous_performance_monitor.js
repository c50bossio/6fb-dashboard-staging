#!/usr/bin/env node

/**
 * 6FB AI Agent System - Continuous Performance Monitor
 * Lightweight monitoring script for ongoing performance tracking
 */

const fs = require('fs');
const path = require('path');

class ContinuousPerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            interval: options.interval || 60000, // 1 minute default
            frontend_url: options.frontend_url || 'http://localhost:9999',
            backend_url: options.backend_url || 'http://localhost:8001',
            log_file: options.log_file || path.join(__dirname, 'performance_monitor.log'),
            metrics_file: options.metrics_file || path.join(__dirname, 'performance_metrics.json'),
            alert_thresholds: {
                api_response_time: options.api_threshold || 1000, // 1 second
                frontend_load_time: options.frontend_threshold || 3000, // 3 seconds
                error_rate: options.error_rate_threshold || 0.05, // 5%
                ...options.alert_thresholds
            }
        };
        
        this.metrics_history = [];
        this.alerts = [];
        this.running = false;
        
        // Load existing metrics if available
        this.loadMetricsHistory();
    }

    async startMonitoring() {
        console.log('🔍 Starting continuous performance monitoring...');
        console.log(`📊 Monitoring interval: ${this.options.interval / 1000} seconds`);
        console.log(`📝 Logging to: ${this.options.log_file}`);
        console.log(`📈 Metrics saved to: ${this.options.metrics_file}`);
        
        this.running = true;
        
        // Initial health check
        await this.performHealthCheck();
        
        // Start monitoring loop
        this.monitoringInterval = setInterval(() => {
            if (this.running) {
                this.performHealthCheck().catch(error => {
                    this.log(`Error during health check: ${error.message}`, 'ERROR');
                });
            }
        }, this.options.interval);
        
        // Setup graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down performance monitor...');
            this.stopMonitoring();
        });
        
        console.log('✅ Performance monitoring started. Press Ctrl+C to stop.\n');
    }

    stopMonitoring() {
        this.running = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        this.saveMetricsHistory();
        console.log('📊 Final metrics saved. Monitoring stopped.');
        process.exit(0);
    }

    async performHealthCheck() {
        const timestamp = new Date().toISOString();
        const metrics = {
            timestamp,
            frontend: {},
            backend: {},
            alerts: []
        };

        try {
            // Backend health check
            const backendStart = Date.now();
            const backendResponse = await fetch(`${this.options.backend_url}/health`);
            const backendTime = Date.now() - backendStart;
            
            metrics.backend = {
                status: backendResponse.ok ? 'healthy' : 'unhealthy',
                response_time: backendTime,
                status_code: backendResponse.status
            };

            // Check API endpoints
            const apiEndpoints = [
                '/api/v1/ai/agents/status',
                '/api/v1/ai/performance/status',
                '/api/v1/database/health'
            ];

            const apiResults = {};
            for (const endpoint of apiEndpoints) {
                try {
                    const apiStart = Date.now();
                    const apiResponse = await fetch(`${this.options.backend_url}${endpoint}`);
                    const apiTime = Date.now() - apiStart;
                    
                    apiResults[endpoint] = {
                        status: apiResponse.ok ? 'healthy' : 'unhealthy',
                        response_time: apiTime,
                        status_code: apiResponse.status
                    };
                } catch (error) {
                    apiResults[endpoint] = {
                        status: 'error',
                        error: error.message
                    };
                }
            }
            
            metrics.backend.api_endpoints = apiResults;

            // Frontend health check (simple)
            try {
                const frontendStart = Date.now();
                const frontendResponse = await fetch(`${this.options.frontend_url}/api/health`);
                const frontendTime = Date.now() - frontendStart;
                
                metrics.frontend = {
                    status: frontendResponse.ok ? 'healthy' : 'unhealthy',
                    response_time: frontendTime,
                    status_code: frontendResponse.status
                };
            } catch (error) {
                metrics.frontend = {
                    status: 'error',
                    error: error.message
                };
            }

            // Check for alerts
            metrics.alerts = this.checkAlerts(metrics);
            
            // Log and save metrics
            this.logMetrics(metrics);
            this.metrics_history.push(metrics);
            
            // Keep only last 1000 entries
            if (this.metrics_history.length > 1000) {
                this.metrics_history = this.metrics_history.slice(-1000);
            }
            
            // Save metrics every 10 checks
            if (this.metrics_history.length % 10 === 0) {
                this.saveMetricsHistory();
            }

        } catch (error) {
            this.log(`Health check failed: ${error.message}`, 'ERROR');
            metrics.error = error.message;
        }
        
        return metrics;
    }

    checkAlerts(metrics) {
        const alerts = [];
        
        // Backend response time alert
        if (metrics.backend.response_time > this.options.alert_thresholds.api_response_time) {
            alerts.push({
                type: 'performance',
                severity: 'warning',
                message: `Backend response time high: ${metrics.backend.response_time}ms`,
                threshold: this.options.alert_thresholds.api_response_time
            });
        }
        
        // Frontend response time alert
        if (metrics.frontend.response_time > this.options.alert_thresholds.frontend_load_time) {
            alerts.push({
                type: 'performance',
                severity: 'warning',
                message: `Frontend response time high: ${metrics.frontend.response_time}ms`,
                threshold: this.options.alert_thresholds.frontend_load_time
            });
        }
        
        // Service health alerts
        if (metrics.backend.status !== 'healthy') {
            alerts.push({
                type: 'availability',
                severity: 'critical',
                message: `Backend service unhealthy: ${metrics.backend.status_code || 'unknown'}`
            });
        }
        
        if (metrics.frontend.status !== 'healthy') {
            alerts.push({
                type: 'availability',
                severity: 'critical',
                message: `Frontend service unhealthy: ${metrics.frontend.status_code || 'unknown'}`
            });
        }
        
        // API endpoint alerts
        if (metrics.backend.api_endpoints) {
            Object.entries(metrics.backend.api_endpoints).forEach(([endpoint, result]) => {
                if (result.status !== 'healthy') {
                    alerts.push({
                        type: 'api',
                        severity: 'warning',
                        message: `API endpoint unhealthy: ${endpoint} (${result.status_code || result.error})`
                    });
                }
            });
        }
        
        return alerts;
    }

    logMetrics(metrics) {
        const timestamp = metrics.timestamp;
        const backend_status = metrics.backend.status || 'unknown';
        const frontend_status = metrics.frontend.status || 'unknown';
        const backend_time = metrics.backend.response_time || 0;
        const frontend_time = metrics.frontend.response_time || 0;
        const alert_count = metrics.alerts.length;
        
        // Console output
        const status_emoji = (backend_status === 'healthy' && frontend_status === 'healthy') ? '✅' : '⚠️';
        const alert_emoji = alert_count > 0 ? '🚨' : '';
        
        console.log(`${status_emoji} ${timestamp} | Backend: ${backend_time}ms (${backend_status}) | Frontend: ${frontend_time}ms (${frontend_status}) ${alert_emoji}`);
        
        // Log alerts
        metrics.alerts.forEach(alert => {
            const severity_emoji = alert.severity === 'critical' ? '🔴' : '🟡';
            console.log(`  ${severity_emoji} ${alert.type.toUpperCase()}: ${alert.message}`);
        });
        
        // File logging
        const logEntry = {
            timestamp,
            backend: { status: backend_status, time: backend_time },
            frontend: { status: frontend_status, time: frontend_time },
            alerts: metrics.alerts
        };
        
        this.log(JSON.stringify(logEntry), 'INFO');
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] ${level}: ${message}\n`;
        
        // Append to log file
        fs.appendFileSync(this.options.log_file, logLine);
    }

    loadMetricsHistory() {
        try {
            if (fs.existsSync(this.options.metrics_file)) {
                const data = fs.readFileSync(this.options.metrics_file, 'utf8');
                this.metrics_history = JSON.parse(data);
                console.log(`📈 Loaded ${this.metrics_history.length} historical metrics entries`);
            }
        } catch (error) {
            console.log('⚠️ Could not load metrics history:', error.message);
        }
    }

    saveMetricsHistory() {
        try {
            fs.writeFileSync(this.options.metrics_file, JSON.stringify(this.metrics_history, null, 2));
        } catch (error) {
            this.log(`Failed to save metrics history: ${error.message}`, 'ERROR');
        }
    }

    generateReport() {
        if (this.metrics_history.length === 0) {
            console.log('📊 No metrics data available for reporting');
            return;
        }

        const recent_metrics = this.metrics_history.slice(-100); // Last 100 entries
        
        // Calculate averages
        const backend_times = recent_metrics
            .filter(m => m.backend && m.backend.response_time)
            .map(m => m.backend.response_time);
        
        const frontend_times = recent_metrics
            .filter(m => m.frontend && m.frontend.response_time)
            .map(m => m.frontend.response_time);
        
        const total_alerts = recent_metrics.reduce((acc, m) => acc + (m.alerts ? m.alerts.length : 0), 0);
        
        console.log('\n📊 Performance Summary (Last 100 checks)');
        console.log('=' .repeat(50));
        
        if (backend_times.length > 0) {
            const avg_backend = Math.round(backend_times.reduce((a, b) => a + b, 0) / backend_times.length);
            const max_backend = Math.max(...backend_times);
            console.log(`Backend API: ${avg_backend}ms avg, ${max_backend}ms max`);
        }
        
        if (frontend_times.length > 0) {
            const avg_frontend = Math.round(frontend_times.reduce((a, b) => a + b, 0) / frontend_times.length);
            const max_frontend = Math.max(...frontend_times);
            console.log(`Frontend: ${avg_frontend}ms avg, ${max_frontend}ms max`);
        }
        
        console.log(`Total Alerts: ${total_alerts}`);
        console.log(`Monitoring Duration: ${recent_metrics.length} checks`);
        
        if (recent_metrics.length > 0) {
            const first_check = new Date(recent_metrics[0].timestamp);
            const last_check = new Date(recent_metrics[recent_metrics.length - 1].timestamp);
            const duration = Math.round((last_check - first_check) / 1000 / 60); // minutes
            console.log(`Time Period: ${duration} minutes`);
        }
        
        console.log('=' .repeat(50));
    }
}

// CLI interface
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i]?.replace('--', '');
        const value = args[i + 1];
        
        if (key && value) {
            switch (key) {
                case 'interval':
                    options.interval = parseInt(value) * 1000; // Convert to milliseconds
                    break;
                case 'frontend-url':
                    options.frontend_url = value;
                    break;
                case 'backend-url':
                    options.backend_url = value;
                    break;
                case 'api-threshold':
                    options.api_threshold = parseInt(value);
                    break;
                case 'frontend-threshold':
                    options.frontend_threshold = parseInt(value);
                    break;
                default:
                    options[key] = value;
            }
        }
    }
    
    return options;
}

// Show help
function showHelp() {
    console.log(`
6FB AI Agent System - Continuous Performance Monitor

Usage: node continuous_performance_monitor.js [options]

Options:
  --interval <seconds>          Monitoring interval in seconds (default: 60)
  --frontend-url <url>          Frontend URL (default: http://localhost:9999)
  --backend-url <url>           Backend URL (default: http://localhost:8001)
  --api-threshold <ms>          API response time alert threshold (default: 1000)
  --frontend-threshold <ms>     Frontend load time alert threshold (default: 3000)
  --help                        Show this help message

Examples:
  # Start monitoring with default settings
  node continuous_performance_monitor.js
  
  # Monitor every 30 seconds with custom thresholds
  node continuous_performance_monitor.js --interval 30 --api-threshold 500
  
  # Monitor custom URLs
  node continuous_performance_monitor.js --frontend-url http://localhost:3000 --backend-url http://localhost:8080
`);
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help')) {
        showHelp();
        process.exit(0);
    }
    
    const options = parseArgs();
    const monitor = new ContinuousPerformanceMonitor(options);
    
    monitor.startMonitoring().catch(error => {
        console.error('❌ Failed to start monitoring:', error);
        process.exit(1);
    });
    
    // Show report every 10 minutes
    setInterval(() => {
        if (monitor.running) {
            monitor.generateReport();
        }
    }, 600000); // 10 minutes
}

module.exports = ContinuousPerformanceMonitor;