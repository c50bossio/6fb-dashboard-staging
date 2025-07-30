#!/usr/bin/env python3
"""
Production Integration Guide
Complete integration of all backend system enhancements with deployment
configuration, Docker setup, and production-ready configurations.
"""

import asyncio
import os
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import yaml
import logging

# Import all enhanced components
from middleware.enhanced_middleware_stack import setup_enhanced_middleware_stack, PipelineConfig
from database.optimized_connection_pool import (
    AdvancedConnectionPoolConfig, 
    initialize_optimized_pool
)
from api.enhanced_api_design import (
    create_enhanced_api_endpoints, 
    setup_enhanced_api_error_handlers,
    enhance_api_documentation
)
from pipeline.request_pipeline_optimizer import create_pipeline_optimizer
from tasks.background_task_system import background_task_system, TaskConfig
from monitoring.memory_resource_monitor import MemoryResourceMonitor, MemoryConfig
from monitoring.comprehensive_monitoring_system import ComprehensiveMonitoringSystem, MonitoringConfig

from fastapi import FastAPI, Request, BackgroundTasks
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class ProductionConfig:
    """Production configuration management"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or os.getenv('CONFIG_PATH', 'config/production.yaml')
        self.config = self._load_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from file or environment variables"""
        config = {
            # Database configuration
            'database': {
                'path': os.getenv('DATABASE_PATH', 'agent_system.db'),
                'max_connections': int(os.getenv('DB_MAX_CONNECTIONS', '50')),
                'min_connections': int(os.getenv('DB_MIN_CONNECTIONS', '10')),
                'enable_wal': os.getenv('DB_ENABLE_WAL', 'true').lower() == 'true',
                'enable_query_cache': os.getenv('DB_ENABLE_QUERY_CACHE', 'true').lower() == 'true',
                'enable_automatic_scaling': os.getenv('DB_ENABLE_AUTO_SCALING', 'true').lower() == 'true',
                'memory_threshold_mb': int(os.getenv('DB_MEMORY_THRESHOLD_MB', '2048')),
            },
            
            # Middleware configuration
            'middleware': {
                'enable_https_redirect': os.getenv('ENABLE_HTTPS_REDIRECT', 'true').lower() == 'true',
                'trusted_hosts': os.getenv('TRUSTED_HOSTS', 'localhost,127.0.0.1,*.bookedbarber.com').split(','),
                'default_rate_limit': int(os.getenv('DEFAULT_RATE_LIMIT', '1000')),
                'rate_limit_window': int(os.getenv('RATE_LIMIT_WINDOW', '60')),
                'slow_threshold': float(os.getenv('SLOW_THRESHOLD', '2.0')),
                'cors_origins': os.getenv('CORS_ORIGINS', 'https://bookedbarber.com,https://staging.bookedbarber.com').split(','),
            },
            
            # Background tasks configuration
            'tasks': {
                'max_workers': int(os.getenv('TASK_MAX_WORKERS', '20')),
                'max_queue_size': int(os.getenv('TASK_MAX_QUEUE_SIZE', '50000')),
                'enable_distributed': os.getenv('TASK_ENABLE_DISTRIBUTED', 'true').lower() == 'true',
                'redis_url': os.getenv('REDIS_URL', 'redis://localhost:6379'),
                'enable_persistence': os.getenv('TASK_ENABLE_PERSISTENCE', 'true').lower() == 'true',
            },
            
            # Memory monitoring configuration
            'memory': {
                'warning_threshold_percent': float(os.getenv('MEMORY_WARNING_THRESHOLD', '70.0')),
                'critical_threshold_percent': float(os.getenv('MEMORY_CRITICAL_THRESHOLD', '85.0')),
                'enable_aggressive_gc': os.getenv('MEMORY_ENABLE_AGGRESSIVE_GC', 'true').lower() == 'true',
                'enable_leak_detection': os.getenv('MEMORY_ENABLE_LEAK_DETECTION', 'true').lower() == 'true',
                'enable_memory_optimization': os.getenv('MEMORY_ENABLE_OPTIMIZATION', 'true').lower() == 'true',
            },
            
            # Monitoring configuration
            'monitoring': {
                'log_level': os.getenv('LOG_LEVEL', 'INFO'),
                'enable_prometheus_metrics': os.getenv('ENABLE_PROMETHEUS_METRICS', 'true').lower() == 'true',
                'metrics_port': int(os.getenv('METRICS_PORT', '8090')),
                'enable_distributed_tracing': os.getenv('ENABLE_DISTRIBUTED_TRACING', 'true').lower() == 'true',
                'jaeger_agent_host': os.getenv('JAEGER_AGENT_HOST', 'localhost'),
                'enable_alerting': os.getenv('ENABLE_ALERTING', 'true').lower() == 'true',
                'alert_webhook_url': os.getenv('ALERT_WEBHOOK_URL'),
                'slack_webhook_url': os.getenv('SLACK_WEBHOOK_URL'),
            },
            
            # Pipeline optimization configuration
            'pipeline': {
                'enable_request_batching': os.getenv('PIPELINE_ENABLE_BATCHING', 'true').lower() == 'true',
                'enable_response_caching': os.getenv('PIPELINE_ENABLE_CACHING', 'true').lower() == 'true',
                'enable_streaming_responses': os.getenv('PIPELINE_ENABLE_STREAMING', 'true').lower() == 'true',
                'enable_smart_compression': os.getenv('PIPELINE_ENABLE_COMPRESSION', 'true').lower() == 'true',
                'cache_ttl_seconds': int(os.getenv('PIPELINE_CACHE_TTL', '300')),
            },
            
            # Application configuration
            'app': {
                'host': os.getenv('HOST', '0.0.0.0'),
                'port': int(os.getenv('PORT', '8000')),
                'workers': int(os.getenv('WORKERS', '4')),
                'debug': os.getenv('DEBUG', 'false').lower() == 'true',
                'secret_key': os.getenv('SECRET_KEY', 'your-secret-key-change-in-production'),
                'environment': os.getenv('ENVIRONMENT', 'production'),
            }
        }
        
        # Try to load from YAML file if it exists
        config_file = Path(self.config_path)
        if config_file.exists():
            try:
                with open(config_file, 'r') as f:
                    file_config = yaml.safe_load(f)
                    # Merge file config with environment config (env takes precedence)
                    self._deep_merge(config, file_config)
            except Exception as e:
                logger.warning(f"Failed to load config file: {e}")
        
        return config
    
    def _deep_merge(self, dict1: Dict, dict2: Dict):
        """Deep merge two dictionaries"""
        for key, value in dict2.items():
            if key in dict1 and isinstance(dict1[key], dict) and isinstance(value, dict):
                self._deep_merge(dict1[key], value)
            elif key not in dict1:
                dict1[key] = value
    
    def get_database_config(self) -> AdvancedConnectionPoolConfig:
        """Get database configuration"""
        db_config = self.config['database']
        return AdvancedConnectionPoolConfig(
            database_path=db_config['path'],
            max_connections=db_config['max_connections'],
            min_connections=db_config['min_connections'],
            enable_wal=db_config['enable_wal'],
            enable_query_cache=db_config['enable_query_cache'],
            enable_automatic_scaling=db_config['enable_automatic_scaling'],
            memory_threshold_mb=db_config['memory_threshold_mb'],
        )
    
    def get_task_config(self) -> TaskConfig:
        """Get background task configuration"""
        task_config = self.config['tasks']
        return TaskConfig(
            max_workers=task_config['max_workers'],
            max_queue_size=task_config['max_queue_size'],
            enable_distributed=task_config['enable_distributed'],
            redis_url=task_config['redis_url'],
            enable_persistence=task_config['enable_persistence'],
        )
    
    def get_memory_config(self) -> MemoryConfig:
        """Get memory monitoring configuration"""
        memory_config = self.config['memory']
        return MemoryConfig(
            warning_threshold_percent=memory_config['warning_threshold_percent'],
            critical_threshold_percent=memory_config['critical_threshold_percent'],
            enable_aggressive_gc=memory_config['enable_aggressive_gc'],
            enable_leak_detection=memory_config['enable_leak_detection'],
            enable_memory_optimization=memory_config['enable_memory_optimization'],
        )
    
    def get_monitoring_config(self) -> MonitoringConfig:
        """Get comprehensive monitoring configuration"""
        monitoring_config = self.config['monitoring']
        return MonitoringConfig(
            log_level=monitoring_config['log_level'],
            enable_prometheus_metrics=monitoring_config['enable_prometheus_metrics'],
            metrics_port=monitoring_config['metrics_port'],
            enable_distributed_tracing=monitoring_config['enable_distributed_tracing'],
            jaeger_agent_host=monitoring_config['jaeger_agent_host'],
            enable_alerting=monitoring_config['enable_alerting'],
            alert_webhook_url=monitoring_config['alert_webhook_url'],
            slack_webhook_url=monitoring_config['slack_webhook_url'],
        )


class EnhancedFastAPIApplication:
    """Enhanced FastAPI application with all optimizations integrated"""
    
    def __init__(self, config: ProductionConfig):
        self.config = config
        self.app: Optional[FastAPI] = None
        self.monitoring_system: Optional[ComprehensiveMonitoringSystem] = None
        self.memory_monitor: Optional[MemoryResourceMonitor] = None
        self.pipeline_optimizer = None
        self.background_task_system = None
        
    @asynccontextmanager
    async def lifespan(self, app: FastAPI):
        """Application lifespan management with all components"""
        logger.info("🚀 Starting Enhanced 6FB AI Agent System...")
        
        try:
            # 1. Initialize database connection pool
            logger.info("Initializing optimized database connection pool...")
            db_config = self.config.get_database_config()
            await initialize_optimized_pool(db_config)
            
            # 2. Initialize monitoring system
            logger.info("Starting comprehensive monitoring system...")
            monitoring_config = self.config.get_monitoring_config()
            self.monitoring_system = ComprehensiveMonitoringSystem(monitoring_config)
            await self.monitoring_system.start_monitoring()
            
            # 3. Initialize memory monitoring
            logger.info("Starting memory resource monitoring...")
            memory_config = self.config.get_memory_config()
            self.memory_monitor = MemoryResourceMonitor(memory_config)
            await self.memory_monitor.start_monitoring()
            
            # 4. Initialize pipeline optimizer
            logger.info("Initializing request pipeline optimizer...")
            pipeline_config = PipelineConfig(
                enable_request_batching=self.config.config['pipeline']['enable_request_batching'],
                enable_response_caching=self.config.config['pipeline']['enable_response_caching'],
                enable_streaming_responses=self.config.config['pipeline']['enable_streaming_responses'],
                cache_ttl_seconds=self.config.config['pipeline']['cache_ttl_seconds'],
            )
            self.pipeline_optimizer = await create_pipeline_optimizer(pipeline_config)
            
            # 5. Initialize background task system
            logger.info("Starting background task system...")
            task_config = self.config.get_task_config()
            async with background_task_system(task_config) as task_system:
                self.background_task_system = task_system
                
                logger.info("✅ All systems initialized successfully")
                logger.info("📊 System Status:")
                logger.info(f"   Database: Optimized connection pool with {db_config.max_connections} max connections")
                logger.info(f"   Monitoring: Prometheus metrics on port {monitoring_config.metrics_port}")
                logger.info(f"   Memory: Monitoring with {memory_config.warning_threshold_percent}% warning threshold")
                logger.info(f"   Tasks: {task_config.max_workers} workers, distributed: {task_config.enable_distributed}")
                logger.info(f"   Pipeline: Caching, batching, and streaming enabled")
                
                yield
        
        except Exception as e:
            logger.error(f"❌ Application startup failed: {e}")
            raise
        finally:
            logger.info("🔄 Shutting down Enhanced 6FB AI Agent System...")
            
            # Cleanup in reverse order
            if self.memory_monitor:
                await self.memory_monitor.stop_monitoring()
            
            if self.monitoring_system:
                await self.monitoring_system.stop_monitoring()
            
            logger.info("✅ Application shutdown complete")
    
    def create_application(self) -> FastAPI:
        """Create the enhanced FastAPI application"""
        # Create FastAPI app with lifespan
        app = FastAPI(
            title="Enhanced 6FB Agentic AI Coach",
            description="Production-ready FastAPI application with comprehensive optimizations",
            version="3.0.0",
            lifespan=self.lifespan,
            debug=self.config.config['app']['debug']
        )
        
        # Setup enhanced middleware stack
        middleware_config = self.config.config['middleware']
        app = setup_enhanced_middleware_stack(app, middleware_config)
        
        # Setup enhanced API endpoints
        create_enhanced_api_endpoints(app)
        
        # Setup error handlers
        setup_enhanced_api_error_handlers(app)
        
        # Enhance API documentation
        enhance_api_documentation(app)
        
        # Add custom middleware for request optimization
        @app.middleware("http")
        async def optimize_request_middleware(request: Request, call_next):
            if self.pipeline_optimizer:
                background_tasks = BackgroundTasks()
                return await self.pipeline_optimizer.optimize_request(
                    request, 
                    call_next, 
                    background_tasks
                )
            else:
                return await call_next(request)
        
        # Add monitoring middleware
        @app.middleware("http")
        async def monitoring_middleware(request: Request, call_next):
            start_time = time.time()
            request_id = getattr(request.state, 'request_id', str(uuid.uuid4()))
            
            response = await call_next(request)
            
            duration = time.time() - start_time
            
            if self.monitoring_system:
                self.monitoring_system.log_request(
                    request_id=request_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration=duration
                )
            
            return response
        
        # Health check endpoint with comprehensive status
        @app.get("/health/comprehensive")
        async def comprehensive_health_check():
            """Comprehensive health check with all system components"""
            health_data = {
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'version': '3.0.0',
                'components': {}
            }
            
            # Database health
            try:
                from database.optimized_connection_pool import get_optimized_pool
                pool = get_optimized_pool()
                pool_stats = pool.get_comprehensive_stats()
                health_data['components']['database'] = {
                    'status': 'healthy',
                    'connections': pool_stats['pool_size'],
                    'queries_processed': pool_stats['total_queries'],
                    'cache_hit_rate': pool_stats.get('cache_stats', {}).get('hit_rate', 0)
                }
            except Exception as e:
                health_data['components']['database'] = {
                    'status': 'unhealthy',
                    'error': str(e)
                }
            
            # Memory health
            if self.memory_monitor:
                memory_status = self.memory_monitor.get_current_status()
                health_data['components']['memory'] = {
                    'status': memory_status['status'],
                    'usage_percent': memory_status['current_snapshot']['percent'],
                    'optimizations_performed': memory_status['metrics']['optimizations_performed']
                }
            
            # Monitoring health
            if self.monitoring_system:
                dashboard_data = self.monitoring_system.get_monitoring_dashboard()
                health_data['components']['monitoring'] = {
                    'status': dashboard_data['system_status'],
                    'active_alerts': len(dashboard_data['active_alerts']),
                    'metrics_enabled': dashboard_data['metrics_available']
                }
            
            # Background tasks health
            if self.background_task_system:
                task_stats = self.background_task_system.get_system_stats()
                health_data['components']['background_tasks'] = {
                    'status': 'healthy' if task_stats['is_running'] else 'unhealthy',
                    'workers': task_stats['active_workers'],
                    'tasks_processed': task_stats['total_tasks_processed'],
                    'success_rate': task_stats['success_rate']
                }
            
            # Determine overall status
            component_statuses = [
                comp.get('status', 'unknown') 
                for comp in health_data['components'].values()
            ]
            
            if 'unhealthy' in component_statuses:
                health_data['status'] = 'degraded'
            elif all(status == 'healthy' for status in component_statuses):
                health_data['status'] = 'healthy'
            else:
                health_data['status'] = 'unknown'
            
            return health_data
        
        self.app = app
        return app


def create_docker_compose_config(config: ProductionConfig) -> str:
    """Generate Docker Compose configuration for production deployment"""
    
    docker_compose = f"""
version: '3.8'

services:
  fastapi-backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.production
    ports:
      - "{config.config['app']['port']}:{config.config['app']['port']}"
      - "{config.config['monitoring']['metrics_port']}:{config.config['monitoring']['metrics_port']}"
    environment:
      - ENVIRONMENT=production
      - DATABASE_PATH=/data/agent_system.db
      - DB_MAX_CONNECTIONS={config.config['database']['max_connections']}
      - DB_MIN_CONNECTIONS={config.config['database']['min_connections']}
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL={config.config['monitoring']['log_level']}
      - METRICS_PORT={config.config['monitoring']['metrics_port']}
      - JAEGER_AGENT_HOST=jaeger
    volumes:
      - ./data:/data
      - ./logs:/app/logs
    depends_on:
      - redis
      - postgres
      - jaeger
    networks:
      - backend-network
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - backend-network
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=sixfb_agent
      - POSTGRES_USER=sixfb
      - POSTGRES_PASSWORD=${{POSTGRES_PASSWORD:-changeme}}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    networks:
      - backend-network
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    networks:
      - backend-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${{GRAFANA_PASSWORD:-admin}}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - backend-network
    restart: unless-stopped

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"
      - "6831:6831/udp"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - backend-network
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - fastapi-backend
    networks:
      - backend-network
    restart: unless-stopped

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  grafana-data:

networks:
  backend-network:
    driver: bridge
"""
    
    return docker_compose.strip()


def create_production_dockerfile() -> str:
    """Generate production Dockerfile"""
    
    dockerfile = """
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update \\
    && apt-get install -y --no-install-recommends \\
        gcc \\
        g++ \\
        libpq-dev \\
        curl \\
        && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install additional production dependencies
RUN pip install --no-cache-dir \\
    gunicorn[gthread] \\
    uvicorn[standard] \\
    prometheus-client \\
    structlog \\
    opentelemetry-api \\
    opentelemetry-sdk \\
    opentelemetry-exporter-jaeger-thrift \\
    psutil \\
    redis

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \\
    && chown -R app:app /app
USER app

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/health/comprehensive || exit 1

# Expose ports
EXPOSE 8000 8090

# Production startup command
CMD ["python", "-m", "integration.production_integration_guide"]
"""
    
    return dockerfile.strip()


def create_nginx_config(config: ProductionConfig) -> str:
    """Generate Nginx configuration for production"""
    
    nginx_config = f"""
upstream fastapi_backend {{
    server fastapi-backend:{config.config['app']['port']};
}}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

server {{
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name _;

    # SSL configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml;

    # API endpoints
    location /api/ {{
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }}

    # Authentication endpoints with stricter rate limiting
    location /api/v1/auth/ {{
        limit_req zone=auth burst=5 nodelay;
        
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    # Health check endpoint
    location /health {{
        proxy_pass http://fastapi_backend;
        access_log off;
    }}

    # Metrics endpoint (restrict access)
    location /metrics {{
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://fastapi_backend:8090;
    }}

    # Static files (if any)
    location /static/ {{
        alias /app/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }}
}}
"""
    
    return nginx_config.strip()


def main():
    """Main application entry point for production deployment"""
    import uvicorn
    
    # Load production configuration
    config = ProductionConfig()
    
    # Create enhanced FastAPI application
    app_builder = EnhancedFastAPIApplication(config)
    app = app_builder.create_application()
    
    # Production server configuration
    server_config = {
        'host': config.config['app']['host'],
        'port': config.config['app']['port'],
        'workers': 1,  # Use 1 worker with async, or configure multiple workers
        'loop': 'uvloop',
        'http': 'httptools',
        'access_log': True,
        'server_header': False,
        'date_header': False,
    }
    
    logger.info("🚀 Starting Enhanced 6FB AI Agent System in Production Mode")
    logger.info(f"📊 Configuration:")
    logger.info(f"   Host: {server_config['host']}")
    logger.info(f"   Port: {server_config['port']}")
    logger.info(f"   Environment: {config.config['app']['environment']}")
    logger.info(f"   Debug: {config.config['app']['debug']}")
    
    # Run the application
    uvicorn.run(app, **server_config)


if __name__ == "__main__":
    main()