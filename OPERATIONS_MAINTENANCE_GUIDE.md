# Operations & Maintenance Guide - 6FB AI Agent System Customize Page

## Overview

This comprehensive operations and maintenance guide covers all aspects of managing the 6FB AI Agent System customize page in production, including deployment procedures, monitoring strategies, performance optimization, security protocols, and incident response.

---

## Table of Contents

1. [Production Deployment](#production-deployment)
2. [Monitoring & Alerting](#monitoring--alerting)
3. [Performance Optimization](#performance-optimization)
4. [Security Operations](#security-operations)
5. [Database Maintenance](#database-maintenance)
6. [Backup & Recovery](#backup--recovery)
7. [Incident Response](#incident-response)
8. [Capacity Planning](#capacity-planning)
9. [Compliance & Auditing](#compliance--auditing)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Production Deployment

### Pre-Deployment Checklist

#### Environment Validation

```bash
#!/bin/bash
# pre-deployment-check.sh

echo "🔍 Running Pre-Deployment Validation..."

# Environment Variables Check
required_vars=(
  "DATABASE_URL"
  "SUPABASE_URL" 
  "SUPABASE_ANON_KEY"
  "JWT_SECRET"
  "ENCRYPTION_KEY"
  "SENDGRID_API_KEY"
  "STRIPE_SECRET_KEY"
  "GOOGLE_CALENDAR_CLIENT_ID"
  "SENTRY_DSN"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    missing_vars+=("$var")
  fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
  echo "❌ Missing required environment variables:"
  printf '%s\n' "${missing_vars[@]}"
  exit 1
fi

echo "✅ Environment variables validated"

# Database Connection Test
echo "🔍 Testing database connection..."
if ! npm run db:test-connection; then
  echo "❌ Database connection failed"
  exit 1
fi
echo "✅ Database connection successful"

# Build Process Validation
echo "🔍 Running production build..."
if ! npm run build; then
  echo "❌ Production build failed"
  exit 1
fi
echo "✅ Production build successful"

# Security Scan
echo "🔍 Running security audit..."
if ! npm audit --audit-level=high; then
  echo "⚠️  Security vulnerabilities detected - review required"
  # Don't exit here, but flag for review
fi

# Performance Budget Check
echo "🔍 Checking bundle size..."
BUNDLE_SIZE=$(du -sk build/static/js/*.js | awk '{sum+=$1} END {print sum}')
MAX_BUNDLE_SIZE=2048  # 2MB in KB

if [[ $BUNDLE_SIZE -gt $MAX_BUNDLE_SIZE ]]; then
  echo "⚠️  Bundle size ($BUNDLE_SIZE KB) exceeds budget ($MAX_BUNDLE_SIZE KB)"
else
  echo "✅ Bundle size within budget: $BUNDLE_SIZE KB"
fi

echo "🎉 Pre-deployment validation complete!"
```

#### Database Migration Strategy

```sql
-- migration-strategy.sql
-- Production database migration with zero-downtime approach

BEGIN;

-- Step 1: Create new columns with temporary names
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS temp_new_logo_url TEXT;
ALTER TABLE barbershops ADD COLUMN IF NOT EXISTS temp_new_brand_colors JSONB;

-- Step 2: Populate new columns with transformed data
UPDATE barbershops 
SET 
  temp_new_logo_url = CASE 
    WHEN logo_url IS NOT NULL THEN 
      'https://cdn.6fb.com/assets/' || SUBSTRING(logo_url FROM '[^/]+$')
    ELSE NULL 
  END,
  temp_new_brand_colors = COALESCE(brand_colors, '{
    "primary": "#3B82F6",
    "secondary": "#1E40AF", 
    "accent": "#10B981",
    "text": "#1F2937",
    "background": "#FFFFFF"
  }'::JSONB);

-- Step 3: Validate data integrity
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM barbershops 
  WHERE temp_new_logo_url IS NOT NULL 
    AND temp_new_logo_url !~ '^https://cdn\.6fb\.com/assets/';
  
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Data validation failed: % invalid logo URLs found', invalid_count;
  END IF;
  
  RAISE NOTICE 'Data validation passed for % rows', (SELECT COUNT(*) FROM barbershops);
END $$;

-- Step 4: Create indexes on new columns (concurrently)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barbershops_temp_logo_url 
ON barbershops(temp_new_logo_url) WHERE temp_new_logo_url IS NOT NULL;

-- Step 5: Atomic column swap (this is the only blocking operation)
ALTER TABLE barbershops 
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS brand_colors;

ALTER TABLE barbershops 
  RENAME COLUMN temp_new_logo_url TO logo_url,
  RENAME COLUMN temp_new_brand_colors TO brand_colors;

-- Step 6: Final index creation
DROP INDEX IF EXISTS idx_barbershops_temp_logo_url;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_barbershops_logo_url 
ON barbershops(logo_url) WHERE logo_url IS NOT NULL;

COMMIT;

-- Log migration completion
INSERT INTO migration_log (
  migration_name,
  applied_at,
  success,
  affected_tables,
  notes
) VALUES (
  'customize_page_schema_v2',
  NOW(),
  true,
  ARRAY['barbershops'],
  'Zero-downtime migration for customize page enhancements'
);
```

### Deployment Automation

#### Blue-Green Deployment Script

```bash
#!/bin/bash
# blue-green-deploy.sh

set -euo pipefail

CURRENT_ENV=${1:-blue}
TARGET_ENV=${2:-green}
ROLLBACK=${3:-false}

echo "🚀 Starting Blue-Green Deployment"
echo "   Current: $CURRENT_ENV"
echo "   Target:  $TARGET_ENV"

# Health check function
health_check() {
  local env=$1
  local max_attempts=30
  local attempt=1
  
  echo "🔍 Health checking $env environment..."
  
  while [[ $attempt -le $max_attempts ]]; do
    if curl -f -s "https://$env.6fb.com/api/health" > /dev/null; then
      echo "✅ $env environment is healthy"
      return 0
    fi
    
    echo "⏳ Attempt $attempt/$max_attempts - waiting for $env to be ready..."
    sleep 10
    ((attempt++))
  done
  
  echo "❌ $env environment failed health check"
  return 1
}

# Smoke test function
smoke_test() {
  local env=$1
  echo "🧪 Running smoke tests on $env..."
  
  # Test critical endpoints
  local endpoints=(
    "/api/v1/customization/health"
    "/api/v1/customization/templates"
    "/api/v1/auth/validate"
  )
  
  for endpoint in "${endpoints[@]}"; do
    if ! curl -f -s "https://$env.6fb.com$endpoint" > /dev/null; then
      echo "❌ Smoke test failed for $endpoint"
      return 1
    fi
  done
  
  # Test customize page load
  if ! curl -f -s "https://$env.6fb.com/customize" | grep -q "customization-container"; then
    echo "❌ Customize page smoke test failed"
    return 1
  fi
  
  echo "✅ All smoke tests passed"
  return 0
}

# Performance baseline test
performance_test() {
  local env=$1
  echo "📊 Running performance baseline test on $env..."
  
  # Test customize page load time
  local load_time=$(curl -w "%{time_total}" -s -o /dev/null "https://$env.6fb.com/customize")
  local max_load_time=3.0
  
  if (( $(echo "$load_time > $max_load_time" | bc -l) )); then
    echo "❌ Performance test failed: load time $load_time s > $max_load_time s"
    return 1
  fi
  
  echo "✅ Performance test passed: load time $load_time s"
  return 0
}

if [[ $ROLLBACK == "true" ]]; then
  echo "🔄 Rolling back to $TARGET_ENV"
  
  # Switch traffic back
  kubectl patch service customize-service -p '{"spec":{"selector":{"version":"'$TARGET_ENV'"}}}'
  
  # Verify rollback
  health_check $TARGET_ENV
  smoke_test $TARGET_ENV
  
  echo "✅ Rollback completed successfully"
  exit 0
fi

# Regular deployment flow
echo "📦 Deploying to $TARGET_ENV environment"

# Deploy new version to target environment
kubectl set image deployment/customize-app-$TARGET_ENV \
  customize-app=6fb/customize-app:$BUILD_TAG

# Wait for deployment to complete
kubectl rollout status deployment/customize-app-$TARGET_ENV --timeout=600s

# Run health checks and tests
health_check $TARGET_ENV
smoke_test $TARGET_ENV
performance_test $TARGET_ENV

# Switch traffic to new environment
echo "🔀 Switching traffic to $TARGET_ENV"
kubectl patch service customize-service -p '{"spec":{"selector":{"version":"'$TARGET_ENV'"}}}'

# Final verification
sleep 30
health_check $TARGET_ENV

# Scale down old environment (keep 1 replica for quick rollback)
kubectl scale deployment customize-app-$CURRENT_ENV --replicas=1

echo "🎉 Deployment completed successfully!"
echo "   Active environment: $TARGET_ENV"
echo "   Standby environment: $CURRENT_ENV (1 replica)"

# Notify team
curl -X POST "$SLACK_WEBHOOK_URL" -H 'Content-type: application/json' \
  --data "{
    \"text\": \"✅ Customize Page Deployment Successful\",
    \"attachments\": [{
      \"color\": \"good\",
      \"fields\": [
        {\"title\": \"Environment\", \"value\": \"$TARGET_ENV\", \"short\": true},
        {\"title\": \"Build\", \"value\": \"$BUILD_TAG\", \"short\": true},
        {\"title\": \"Deployed By\", \"value\": \"$USER\", \"short\": true}
      ]
    }]
  }"
```

---

## Monitoring & Alerting

### Application Performance Monitoring

#### Custom Metrics Collection

```javascript
// monitoring/metrics-collector.js
import { createPrometheusMetrics } from '@prometheus/client';

export class CustomizationMetricsCollector {
  constructor() {
    this.metrics = {
      // Page performance metrics
      pageLoadTime: new prometheus.Histogram({
        name: 'customize_page_load_duration_seconds',
        help: 'Time to load customize page',
        buckets: [0.5, 1, 2, 3, 5, 10]
      }),

      // User interaction metrics
      templateSelections: new prometheus.Counter({
        name: 'customize_template_selections_total',
        help: 'Number of template selections',
        labelNames: ['template_id', 'user_type', 'shop_id']
      }),

      // Business metrics
      customizationCompletions: new prometheus.Counter({
        name: 'customize_completions_total',
        help: 'Number of completed customizations',
        labelNames: ['completion_type', 'shop_id', 'user_role']
      }),

      // Error tracking
      customizationErrors: new prometheus.Counter({
        name: 'customize_errors_total',
        help: 'Number of customization errors',
        labelNames: ['error_type', 'component', 'severity']
      }),

      // API performance
      apiRequestDuration: new prometheus.Histogram({
        name: 'customize_api_request_duration_seconds',
        help: 'API request duration',
        labelNames: ['endpoint', 'method', 'status_code'],
        buckets: [0.1, 0.3, 0.5, 1, 3, 5, 10]
      }),

      // Database metrics
      databaseQueryDuration: new prometheus.Histogram({
        name: 'customize_db_query_duration_seconds', 
        help: 'Database query duration',
        labelNames: ['query_type', 'table'],
        buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3]
      }),

      // Six Figure Barber specific metrics
      revenueImpactCalculations: new prometheus.Counter({
        name: 'sfb_revenue_calculations_total',
        help: 'Number of revenue impact calculations',
        labelNames: ['calculation_type', 'shop_id']
      }),

      // A/B testing metrics
      abTestParticipations: new prometheus.Counter({
        name: 'ab_test_participations_total',
        help: 'A/B test participation count',
        labelNames: ['test_id', 'variant', 'user_segment']
      })
    };

    this.setupMiddleware();
  }

  setupMiddleware() {
    // Express middleware for automatic API monitoring
    return (req, res, next) => {
      if (!req.path.includes('/api/v1/customization')) {
        return next();
      }

      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        this.metrics.apiRequestDuration
          .labels({
            endpoint: req.route?.path || req.path,
            method: req.method,
            status_code: res.statusCode.toString()
          })
          .observe(duration);
      });

      next();
    };
  }

  // Track page performance from client-side
  trackPageLoad(duration, metadata = {}) {
    this.metrics.pageLoadTime.observe(duration);
    
    // Send to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_load_time', {
        event_category: 'Performance',
        event_label: 'customize_page',
        value: Math.round(duration * 1000),
        custom_map: metadata
      });
    }
  }

  // Track user interactions
  trackInteraction(action, details = {}) {
    switch (action) {
      case 'template_select':
        this.metrics.templateSelections
          .labels({
            template_id: details.templateId,
            user_type: details.userType,
            shop_id: details.shopId
          })
          .inc();
        break;
        
      case 'customization_complete':
        this.metrics.customizationCompletions
          .labels({
            completion_type: details.type,
            shop_id: details.shopId,
            user_role: details.userRole
          })
          .inc();
        break;
        
      case 'error':
        this.metrics.customizationErrors
          .labels({
            error_type: details.type,
            component: details.component,
            severity: details.severity
          })
          .inc();
        break;
    }
  }

  // Generate health metrics
  generateHealthMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        active_users: this.getActiveUsers(),
        customizations_per_hour: this.getCustomizationsPerHour(),
        error_rate: this.getErrorRate(),
        avg_response_time: this.getAverageResponseTime(),
        database_connections: this.getDatabaseConnections(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage()
      }
    };
  }
}

// Initialize metrics collector
export const metricsCollector = new CustomizationMetricsCollector();
```

#### Alert Rules Configuration

```yaml
# alerting/customize-page-alerts.yml
groups:
  - name: customize-page-performance
    rules:
      - alert: CustomizePageHighLoadTime
        expr: histogram_quantile(0.95, customize_page_load_duration_seconds_bucket) > 5
        for: 2m
        labels:
          severity: warning
          component: customize-page
        annotations:
          summary: "Customize page load time is high"
          description: "95th percentile load time is {{ $value }}s for the last 2 minutes"

      - alert: CustomizePageVeryHighLoadTime
        expr: histogram_quantile(0.95, customize_page_load_duration_seconds_bucket) > 10
        for: 1m
        labels:
          severity: critical
          component: customize-page
        annotations:
          summary: "Customize page load time is critical"
          description: "95th percentile load time is {{ $value }}s"

  - name: customize-page-errors
    rules:
      - alert: CustomizePageHighErrorRate
        expr: rate(customize_errors_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
          component: customize-page
        annotations:
          summary: "High error rate on customize page"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: CustomizePageAPIErrors
        expr: rate(customize_api_request_duration_seconds_count{status_code!~"2.."}[5m]) > 0.1
        for: 1m
        labels:
          severity: critical
          component: customize-api
        annotations:
          summary: "High API error rate"
          description: "API error rate is {{ $value | humanizePercentage }}"

  - name: customize-page-business
    rules:
      - alert: CustomizePageLowCompletions
        expr: rate(customize_completions_total[1h]) < 0.1
        for: 10m
        labels:
          severity: warning
          component: business-metrics
        annotations:
          summary: "Low customization completion rate"
          description: "Completion rate dropped to {{ $value }}/hour"

      - alert: CustomizePageNoActivity
        expr: rate(customize_template_selections_total[30m]) == 0
        for: 15m
        labels:
          severity: critical
          component: business-metrics
        annotations:
          summary: "No customize page activity"
          description: "No template selections in the last 30 minutes"

  - name: database-health
    rules:
      - alert: CustomizeDatabaseSlowQueries
        expr: histogram_quantile(0.95, customize_db_query_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query time is {{ $value }}s"

      - alert: CustomizeDatabaseConnectionLimit
        expr: pg_stat_activity_count > pg_settings_max_connections * 0.8
        for: 2m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "Database connection limit approaching"
          description: "{{ $value }} connections active"
```

### Dashboard Configuration

#### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "id": null,
    "title": "6FB Customize Page Operations",
    "tags": ["6fb", "customize", "operations"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Page Load Performance",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, customize_page_load_duration_seconds_bucket)",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, customize_page_load_duration_seconds_bucket)", 
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, customize_page_load_duration_seconds_bucket)",
            "legendFormat": "99th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
                {"color": "yellow", "value": 2},
                {"color": "red", "value": 5}
              ]
            }
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, customize_api_request_duration_seconds_bucket{endpoint=~\"/api/v1/customization.*\"})",
            "legendFormat": "{{endpoint}} - 95th percentile"
          }
        ],
        "yAxes": [
          {
            "label": "Response Time (seconds)",
            "logBase": 1,
            "max": null,
            "min": 0
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "Template Selection Trends",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(customize_template_selections_total[5m])",
            "legendFormat": "Selections per second"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Error Rates",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(customize_errors_total[5m])",
            "legendFormat": "{{error_type}} - {{component}}"
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {"params": [0.05], "type": "gt"},
              "operator": {"type": "and"},
              "query": {"params": ["A", "5m", "now"]},
              "reducer": {"params": [], "type": "avg"},
              "type": "query"
            }
          ],
          "executionErrorState": "alerting",
          "for": "2m",
          "frequency": "10s",
          "handler": 1,
          "name": "Customize Page High Error Rate",
          "noDataState": "no_data",
          "notifications": []
        },
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      }
    ],
    "time": {"from": "now-1h", "to": "now"},
    "timepicker": {},
    "templating": {
      "list": [
        {
          "name": "shop_id",
          "type": "query",
          "query": "label_values(customize_template_selections_total, shop_id)",
          "refresh": 1,
          "includeAll": true,
          "multi": true
        }
      ]
    },
    "annotations": {
      "list": [
        {
          "name": "Deployments",
          "datasource": "Prometheus",
          "expr": "changes(up{job=\"customize-app\"}[1m])",
          "titleFormat": "Deployment",
          "textFormat": "Customize page deployment"
        }
      ]
    },
    "refresh": "30s",
    "schemaVersion": 30,
    "version": 0,
    "weekStart": ""
  }
}
```

---

## Performance Optimization

### Database Performance

#### Query Optimization Strategies

```sql
-- performance/query-optimization.sql

-- 1. Optimize customization data retrieval
CREATE OR REPLACE FUNCTION get_customization_data(shop_id_param UUID)
RETURNS JSON LANGUAGE plpgsql AS $$
DECLARE
  result JSON;
BEGIN
  -- Single query to get all customization data with optimal joins
  SELECT json_build_object(
    'shop', to_json(b),
    'sections', COALESCE(sections.data, '[]'::json),
    'team', COALESCE(team.data, '[]'::json),
    'gallery', COALESCE(gallery.data, '[]'::json),
    'templates', COALESCE(templates.data, '[]'::json)
  ) INTO result
  FROM barbershops b
  LEFT JOIN (
    SELECT 
      barbershop_id,
      json_agg(json_build_object(
        'id', id,
        'section_type', section_type,
        'title', title,
        'content', content,
        'is_enabled', is_enabled,
        'display_order', display_order
      ) ORDER BY display_order) AS data
    FROM website_sections 
    WHERE barbershop_id = shop_id_param AND is_enabled = true
    GROUP BY barbershop_id
  ) sections ON b.id = sections.barbershop_id
  LEFT JOIN (
    SELECT 
      barbershop_id,
      json_agg(json_build_object(
        'id', id,
        'name', name,
        'title', title,
        'bio', bio,
        'profile_image_url', profile_image_url,
        'specialties', specialties,
        'years_experience', years_experience
      ) ORDER BY display_order) AS data
    FROM team_members 
    WHERE barbershop_id = shop_id_param AND is_active = true
    GROUP BY barbershop_id
  ) team ON b.id = team.barbershop_id
  LEFT JOIN (
    SELECT 
      barbershop_id,
      json_agg(json_build_object(
        'id', id,
        'image_url', image_url,
        'thumbnail_url', thumbnail_url,
        'caption', caption,
        'category', category,
        'is_featured', is_featured
      ) ORDER BY is_featured DESC, display_order) AS data
    FROM barbershop_gallery 
    WHERE barbershop_id = shop_id_param
    GROUP BY barbershop_id
  ) gallery ON b.id = gallery.barbershop_id
  LEFT JOIN (
    SELECT 
      NULL as barbershop_id, -- Templates are global
      json_agg(json_build_object(
        'id', id,
        'name', name,
        'display_name', display_name,
        'category', category,
        'preview_image_url', preview_image_url,
        'color_scheme', color_scheme,
        'is_premium', is_premium
      ) ORDER BY category, display_name) AS data
    FROM website_themes 
    WHERE is_active = true
  ) templates ON true
  WHERE b.id = shop_id_param;
  
  RETURN result;
END $$;

-- 2. Create materialized view for analytics
CREATE MATERIALIZED VIEW customization_analytics_summary AS
SELECT 
  date_trunc('hour', created_at) as hour,
  barbershop_id,
  COUNT(*) as customizations_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time,
  SUM(CASE WHEN completed = true THEN 1 ELSE 0 END)::float / COUNT(*) as completion_rate
FROM customization_sessions 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('hour', created_at), barbershop_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON customization_analytics_summary (hour, barbershop_id);

-- 3. Optimize template search
CREATE INDEX CONCURRENTLY idx_website_themes_search 
ON website_themes USING gin(
  to_tsvector('english', name || ' ' || display_name || ' ' || COALESCE(description, ''))
) 
WHERE is_active = true;

-- 4. Partition large tables by time
CREATE TABLE customization_events_2025_01 PARTITION OF customization_events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE customization_events_2025_02 PARTITION OF customization_events  
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Add more partitions as needed...
```

#### Connection Pool Configuration

```javascript
// database/connection-pool.js
import { Pool } from 'pg';

export class OptimizedConnectionPool {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      
      // Pool configuration for customize page workload
      min: 5,          // Minimum connections
      max: 25,         // Maximum connections  
      acquireTimeoutMillis: 30000,  // 30 seconds
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,     // Close idle connections after 30s
      createRetryIntervalMillis: 200,
      
      // PostgreSQL specific optimizations
      connectionTimeoutMillis: 2000,
      query_timeout: 30000,
      statement_timeout: 30000,
      
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });

    this.setupMonitoring();
    this.setupGracefulShutdown();
  }

  setupMonitoring() {
    this.pool.on('connect', (client) => {
      console.log('New client connected to database');
      
      // Track connection metrics
      if (this.metricsCollector) {
        this.metricsCollector.trackDatabaseConnection('connect');
      }
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from pool');
      
      if (this.metricsCollector) {
        this.metricsCollector.trackDatabaseConnection('disconnect');
      }
    });

    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
      
      if (this.metricsCollector) {
        this.metricsCollector.trackDatabaseError(err);
      }
    });

    // Monitor pool health
    setInterval(() => {
      const { totalCount, idleCount, waitingCount } = this.pool;
      console.log(`Pool status - Total: ${totalCount}, Idle: ${idleCount}, Waiting: ${waitingCount}`);
      
      if (waitingCount > 5) {
        console.warn('High number of waiting connections detected');
      }
    }, 60000); // Check every minute
  }

  async query(text, params) {
    const start = Date.now();
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected (${duration}ms):`, text);
      }
      
      // Track metrics
      if (this.metricsCollector) {
        this.metricsCollector.trackDatabaseQuery(duration, 'success');
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      if (this.metricsCollector) {
        this.metricsCollector.trackDatabaseQuery(duration, 'error');
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  // Optimized batch operations
  async batchInsert(table, records, options = {}) {
    const { batchSize = 100, onConflict = 'DO NOTHING' } = options;
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const values = batch.map((_, index) => 
          `($${index * Object.keys(batch[0]).length + 1}, $${index * Object.keys(batch[0]).length + 2}, ...)`
        ).join(', ');
        
        const flatValues = batch.flatMap(Object.values);
        const columns = Object.keys(batch[0]).join(', ');
        
        await client.query(
          `INSERT INTO ${table} (${columns}) VALUES ${values} ON CONFLICT ${onConflict}`,
          flatValues
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  setupGracefulShutdown() {
    process.on('SIGINT', () => this.close());
    process.on('SIGTERM', () => this.close());
  }

  async close() {
    console.log('Closing database pool...');
    await this.pool.end();
    console.log('Database pool closed');
  }

  // Health check method
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as healthy');
      const { totalCount, idleCount, waitingCount } = this.pool;
      
      return {
        healthy: result.rows[0].healthy === 1,
        pool: {
          total: totalCount,
          idle: idleCount, 
          waiting: waitingCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const db = new OptimizedConnectionPool();
```

### Frontend Performance Optimization

#### Lazy Loading and Code Splitting

```javascript
// performance/lazy-loading.js
import { lazy, Suspense, memo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Lazy load heavy components
const TemplateGallery = lazy(() => 
  import('../components/TemplateGallery').then(module => ({
    default: module.TemplateGallery
  }))
);

const ColorPicker = lazy(() => 
  import('../components/ColorPicker')
);

const ImageUploader = lazy(() => 
  import('../components/ImageUploader')
);

const AnalyticsDashboard = lazy(() => 
  import('../components/AnalyticsDashboard').then(module => ({
    default: module.AnalyticsDashboard
  }))
);

// Loading components with skeleton UI
const TemplateGalleryLoader = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gray-200 h-48 rounded-lg mb-2"></div>
        <div className="bg-gray-200 h-4 rounded mb-1"></div>
        <div className="bg-gray-200 h-3 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);

const ColorPickerLoader = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 h-32 rounded-lg"></div>
  </div>
);

// Optimized lazy component wrapper
export function LazyComponent({ children, fallback, error }) {
  return (
    <ErrorBoundary fallback={error}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Performance-optimized customize page structure
export const CustomizePageOptimized = memo(() => {
  const [activeTab, setActiveTab] = useState('basic');
  
  return (
    <div className="customize-page">
      <div className="flex">
        {/* Always visible sidebar */}
        <CustomizationSidebar 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Conditionally loaded content */}
        <div className="flex-1">
          {activeTab === 'templates' && (
            <LazyComponent 
              fallback={<TemplateGalleryLoader />}
              error={<div>Failed to load template gallery</div>}
            >
              <TemplateGallery />
            </LazyComponent>
          )}
          
          {activeTab === 'colors' && (
            <LazyComponent 
              fallback={<ColorPickerLoader />}
              error={<div>Failed to load color picker</div>}
            >
              <ColorPicker />
            </LazyComponent>
          )}
          
          {activeTab === 'images' && (
            <LazyComponent 
              fallback={<div className="animate-pulse bg-gray-200 h-64 rounded-lg" />}
              error={<div>Failed to load image uploader</div>}
            >
              <ImageUploader />
            </LazyComponent>
          )}
          
          {activeTab === 'analytics' && (
            <LazyComponent 
              fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg" />}
              error={<div>Failed to load analytics</div>}
            >
              <AnalyticsDashboard />
            </LazyComponent>
          )}
        </div>
      </div>
    </div>
  );
});

// Bundle splitting configuration for Webpack
export const webpackOptimization = {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Vendor libraries
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 10
      },
      
      // Customize page specific
      customize: {
        test: /[\\/]src[\\/](components|hooks)[\\/].*customiz/i,
        name: 'customize',
        chunks: 'all',
        priority: 20
      },
      
      // Six Figure Barber tools
      sfbTools: {
        test: /[\\/]src[\\/].*six-figure/i,
        name: 'sfb-tools',
        chunks: 'all',
        priority: 15
      },
      
      // Analytics components
      analytics: {
        test: /[\\/]src[\\/].*analytics/i,
        name: 'analytics',
        chunks: 'all',
        priority: 15
      }
    }
  },
  
  // Runtime chunk
  runtimeChunk: {
    name: 'runtime'
  }
};
```

---

## Security Operations

### Security Monitoring

#### Real-time Security Monitoring

```javascript
// security/monitoring.js
export class SecurityMonitor {
  constructor() {
    this.alerts = [];
    this.blockedIPs = new Set();
    this.suspiciousPatterns = new Map();
    this.setupMonitoring();
  }

  setupMonitoring() {
    // Monitor failed authentication attempts
    this.monitorFailedLogins();
    
    // Monitor suspicious request patterns
    this.monitorRequestPatterns();
    
    // Monitor data access patterns
    this.monitorDataAccess();
    
    // Monitor file upload activities
    this.monitorFileUploads();
  }

  monitorFailedLogins() {
    // Track failed login attempts by IP
    this.trackFailedAttempts = (ip, userAgent, endpoint) => {
      const key = `${ip}:${endpoint}`;
      const attempts = this.suspiciousPatterns.get(key) || 0;
      this.suspiciousPatterns.set(key, attempts + 1);
      
      // Alert on multiple failed attempts
      if (attempts + 1 >= 5) {
        this.generateSecurityAlert('BRUTE_FORCE_ATTEMPT', {
          ip,
          userAgent,
          endpoint,
          attempts: attempts + 1,
          severity: 'high'
        });
        
        // Temporarily block IP
        this.temporarilyBlockIP(ip, 3600000); // 1 hour
      }
    };
  }

  monitorRequestPatterns() {
    // Monitor for unusual request patterns
    this.analyzeRequestPattern = (req) => {
      const ip = req.ip;
      const userAgent = req.get('User-Agent');
      const endpoint = req.path;
      
      // Check for SQL injection attempts
      if (this.detectSQLInjection(req.query) || this.detectSQLInjection(req.body)) {
        this.generateSecurityAlert('SQL_INJECTION_ATTEMPT', {
          ip,
          userAgent,
          endpoint,
          payload: { query: req.query, body: req.body },
          severity: 'critical'
        });
        
        this.temporarilyBlockIP(ip, 7200000); // 2 hours
      }
      
      // Check for XSS attempts
      if (this.detectXSS(req.query) || this.detectXSS(req.body)) {
        this.generateSecurityAlert('XSS_ATTEMPT', {
          ip,
          userAgent,
          endpoint,
          payload: { query: req.query, body: req.body },
          severity: 'high'
        });
      }
      
      // Rate limiting by IP
      this.checkRateLimit(ip, endpoint);
    };
  }

  detectSQLInjection(data) {
    if (!data || typeof data !== 'object') return false;
    
    const sqlPatterns = [
      /('|(\\'))|(;|--|\||\/\*|\*\/)/i,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/i,
      /(or|and)\s+\d+\s*=\s*\d+/i,
      /'\s*(or|and)\s+\w+\s*=/i
    ];
    
    const checkValue = (value) => {
      if (typeof value === 'string') {
        return sqlPatterns.some(pattern => pattern.test(value));
      }
      if (Array.isArray(value)) {
        return value.some(checkValue);
      }
      if (typeof value === 'object') {
        return Object.values(value).some(checkValue);
      }
      return false;
    };
    
    return Object.values(data).some(checkValue);
  }

  detectXSS(data) {
    if (!data || typeof data !== 'object') return false;
    
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe\b/i,
      /<object\b/i,
      /<embed\b/i
    ];
    
    const checkValue = (value) => {
      if (typeof value === 'string') {
        return xssPatterns.some(pattern => pattern.test(value));
      }
      if (Array.isArray(value)) {
        return value.some(checkValue);
      }
      if (typeof value === 'object') {
        return Object.values(value).some(checkValue);
      }
      return false;
    };
    
    return Object.values(data).some(checkValue);
  }

  monitorDataAccess() {
    // Monitor unusual data access patterns
    this.trackDataAccess = (userId, resourceId, resourceType, action) => {
      const accessKey = `${userId}:${resourceType}:${action}`;
      const accesses = this.suspiciousPatterns.get(accessKey) || 0;
      this.suspiciousPatterns.set(accessKey, accesses + 1);
      
      // Alert on excessive data access
      if (accesses + 1 > 100 && action === 'read') {
        this.generateSecurityAlert('EXCESSIVE_DATA_ACCESS', {
          userId,
          resourceType,
          action,
          count: accesses + 1,
          severity: 'medium'
        });
      }
      
      // Alert on bulk operations
      if (action === 'bulk_export' || action === 'bulk_modify') {
        this.generateSecurityAlert('BULK_OPERATION', {
          userId,
          resourceType,
          action,
          severity: 'medium'
        });
      }
    };
  }

  generateSecurityAlert(type, details) {
    const alert = {
      id: this.generateAlertId(),
      type,
      details,
      timestamp: new Date().toISOString(),
      status: 'active'
    };
    
    this.alerts.push(alert);
    
    // Send to security team
    this.notifySecurityTeam(alert);
    
    // Log to security audit system
    this.logSecurityEvent(alert);
    
    return alert;
  }

  async notifySecurityTeam(alert) {
    // Send to Slack security channel
    if (process.env.SECURITY_SLACK_WEBHOOK) {
      try {
        await fetch(process.env.SECURITY_SLACK_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Security Alert: ${alert.type}`,
            attachments: [{
              color: alert.details.severity === 'critical' ? 'danger' : 
                     alert.details.severity === 'high' ? 'warning' : 'good',
              fields: [
                { title: 'Type', value: alert.type, short: true },
                { title: 'Severity', value: alert.details.severity, short: true },
                { title: 'IP', value: alert.details.ip || 'N/A', short: true },
                { title: 'User Agent', value: alert.details.userAgent || 'N/A', short: false },
                { title: 'Details', value: JSON.stringify(alert.details, null, 2), short: false }
              ]
            }]
          })
        });
      } catch (error) {
        console.error('Failed to send security alert to Slack:', error);
      }
    }
    
    // Send email for critical alerts
    if (alert.details.severity === 'critical' && process.env.SECURITY_EMAIL_ALERTS) {
      this.sendSecurityEmail(alert);
    }
  }

  temporarilyBlockIP(ip, durationMs) {
    this.blockedIPs.add(ip);
    
    setTimeout(() => {
      this.blockedIPs.delete(ip);
      console.log(`IP ${ip} unblocked after temporary ban`);
    }, durationMs);
    
    console.log(`IP ${ip} temporarily blocked for ${durationMs}ms`);
  }

  // Middleware to check for blocked IPs
  ipBlockingMiddleware() {
    return (req, res, next) => {
      if (this.blockedIPs.has(req.ip)) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'IP temporarily blocked due to suspicious activity',
          retryAfter: 3600
        });
      }
      
      // Analyze request patterns
      this.analyzeRequestPattern(req);
      
      next();
    };
  }
}

export const securityMonitor = new SecurityMonitor();
```

### Vulnerability Management

#### Automated Security Scanning

```bash
#!/bin/bash
# security/vulnerability-scan.sh

set -euo pipefail

echo "🔍 Starting security vulnerability scan..."

# Create scan results directory
SCAN_DATE=$(date +%Y%m%d_%H%M%S)
SCAN_DIR="security/scans/$SCAN_DATE"
mkdir -p "$SCAN_DIR"

# 1. Dependency vulnerability scan
echo "📦 Scanning dependencies..."
npm audit --json > "$SCAN_DIR/npm-audit.json" || true
npm audit --audit-level=high > "$SCAN_DIR/npm-audit.txt" || true

# 2. OWASP dependency check
echo "🛡️  Running OWASP Dependency Check..."
if command -v dependency-check.sh &> /dev/null; then
  dependency-check.sh \
    --project "6FB-Customize-Page" \
    --scan . \
    --format JSON \
    --format HTML \
    --out "$SCAN_DIR/owasp" \
    --exclude "node_modules/**" \
    --exclude "build/**"
fi

# 3. Static code analysis with semgrep
echo "🔍 Static code analysis..."
if command -v semgrep &> /dev/null; then
  semgrep \
    --config=p/security-audit \
    --config=p/owasp-top-ten \
    --config=p/react \
    --json \
    --output="$SCAN_DIR/semgrep.json" \
    src/ || true
fi

# 4. Secret scanning
echo "🔐 Scanning for secrets..."
if command -v gitleaks &> /dev/null; then
  gitleaks detect \
    --source . \
    --report-format json \
    --report-path "$SCAN_DIR/secrets.json" \
    --verbose || true
fi

# 5. Docker image scanning (if Dockerfile exists)
if [[ -f "Dockerfile" ]]; then
  echo "🐳 Scanning Docker image..."
  
  # Build image for scanning
  docker build -t 6fb-customize-scan:latest .
  
  # Scan with trivy
  if command -v trivy &> /dev/null; then
    trivy image \
      --format json \
      --output "$SCAN_DIR/docker-scan.json" \
      6fb-customize-scan:latest || true
  fi
  
  # Clean up scan image
  docker rmi 6fb-customize-scan:latest || true
fi

# 6. Generate consolidated report
echo "📊 Generating security report..."
python3 security/generate-security-report.py "$SCAN_DIR" > "$SCAN_DIR/security-report.md"

# 7. Check for critical vulnerabilities
CRITICAL_COUNT=$(jq -r '.vulnerabilities[] | select(.severity=="critical") | .id' "$SCAN_DIR/npm-audit.json" 2>/dev/null | wc -l || echo "0")
HIGH_COUNT=$(jq -r '.vulnerabilities[] | select(.severity=="high") | .id' "$SCAN_DIR/npm-audit.json" 2>/dev/null | wc -l || echo "0")

echo "🎯 Scan Results Summary:"
echo "   Critical vulnerabilities: $CRITICAL_COUNT"
echo "   High vulnerabilities: $HIGH_COUNT"
echo "   Full report: $SCAN_DIR/security-report.md"

# 8. Fail CI if critical vulnerabilities found
if [[ $CRITICAL_COUNT -gt 0 ]]; then
  echo "❌ Critical vulnerabilities found - failing build"
  exit 1
elif [[ $HIGH_COUNT -gt 5 ]]; then
  echo "⚠️  Too many high severity vulnerabilities ($HIGH_COUNT > 5)"
  exit 1
fi

echo "✅ Security scan completed successfully"

# 9. Archive old scans (keep last 10)
find security/scans -maxdepth 1 -type d -name "*_*" | sort -r | tail -n +11 | xargs rm -rf

# 10. Send scan results to security team
if [[ "${CI:-false}" == "true" ]]; then
  curl -X POST "$SECURITY_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    --data "{
      \"text\": \"🔍 Security Scan Completed\",
      \"attachments\": [{
        \"color\": \"$([[ $CRITICAL_COUNT -gt 0 ]] && echo 'danger' || echo 'good')\",
        \"fields\": [
          {\"title\": \"Critical\", \"value\": \"$CRITICAL_COUNT\", \"short\": true},
          {\"title\": \"High\", \"value\": \"$HIGH_COUNT\", \"short\": true},
          {\"title\": \"Report\", \"value\": \"security/scans/$SCAN_DATE/\", \"short\": false}
        ]
      }]
    }"
fi
```

---

## Database Maintenance

### Automated Maintenance Tasks

#### Database Health Check and Optimization

```sql
-- maintenance/database-health-check.sql

-- 1. Check database health metrics
CREATE OR REPLACE FUNCTION check_database_health()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  value TEXT,
  recommendation TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  db_size BIGINT;
  index_hit_rate NUMERIC;
  cache_hit_rate NUMERIC;
  long_queries INTEGER;
  blocked_queries INTEGER;
  unused_indexes INTEGER;
BEGIN
  -- Database size check
  SELECT pg_database_size(current_database()) INTO db_size;
  RETURN NEXT ('database_size', 
    CASE WHEN db_size > 50 * 1024^3 THEN 'warning' ELSE 'ok' END,
    pg_size_pretty(db_size),
    CASE WHEN db_size > 50 * 1024^3 THEN 'Consider archiving old data' ELSE 'Database size is healthy' END
  );
  
  -- Index hit rate
  SELECT 
    CASE WHEN sum(idx_blks_hit) = 0 THEN 0 
    ELSE round(sum(idx_blks_hit) * 100.0 / sum(idx_blks_hit + idx_blks_read), 2) 
    END
  INTO index_hit_rate
  FROM pg_statio_user_indexes;
  
  RETURN NEXT ('index_hit_rate',
    CASE WHEN index_hit_rate < 95 THEN 'warning' ELSE 'ok' END,
    index_hit_rate || '%',
    CASE WHEN index_hit_rate < 95 THEN 'Consider adding more indexes or increasing memory' ELSE 'Index performance is good' END
  );
  
  -- Cache hit rate
  SELECT 
    round(sum(heap_blks_hit) * 100.0 / sum(heap_blks_hit + heap_blks_read), 2)
  INTO cache_hit_rate
  FROM pg_statio_user_tables;
  
  RETURN NEXT ('cache_hit_rate',
    CASE WHEN cache_hit_rate < 90 THEN 'warning' ELSE 'ok' END,
    cache_hit_rate || '%',
    CASE WHEN cache_hit_rate < 90 THEN 'Consider increasing shared_buffers' ELSE 'Cache performance is good' END
  );
  
  -- Long running queries
  SELECT count(*) 
  INTO long_queries
  FROM pg_stat_activity 
  WHERE state = 'active' 
    AND now() - query_start > interval '5 minutes'
    AND pid != pg_backend_pid();
    
  RETURN NEXT ('long_queries',
    CASE WHEN long_queries > 0 THEN 'warning' ELSE 'ok' END,
    long_queries::TEXT,
    CASE WHEN long_queries > 0 THEN 'Investigate long-running queries' ELSE 'No long-running queries detected' END
  );
  
  -- Blocked queries
  SELECT count(*)
  INTO blocked_queries
  FROM pg_stat_activity
  WHERE wait_event_type = 'Lock';
  
  RETURN NEXT ('blocked_queries',
    CASE WHEN blocked_queries > 0 THEN 'warning' ELSE 'ok' END,
    blocked_queries::TEXT,
    CASE WHEN blocked_queries > 0 THEN 'Check for lock contention' ELSE 'No blocked queries' END
  );
  
  -- Check for unused indexes
  SELECT count(*)
  INTO unused_indexes
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND schemaname = 'public';
    
  RETURN NEXT ('unused_indexes',
    CASE WHEN unused_indexes > 5 THEN 'warning' ELSE 'ok' END,
    unused_indexes::TEXT,
    CASE WHEN unused_indexes > 5 THEN 'Consider dropping unused indexes' ELSE 'Index usage looks good' END
  );
  
END $$;

-- 2. Table statistics and bloat analysis
CREATE OR REPLACE FUNCTION analyze_table_bloat()
RETURNS TABLE(
  table_name TEXT,
  actual_size TEXT,
  bloat_ratio NUMERIC,
  wasted_space TEXT,
  recommendation TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT 
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
      n_tup_upd,
      n_tup_del,
      n_dead_tup,
      n_live_tup
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND pg_total_relation_size(schemaname||'.'||tablename) > 100 * 1024 * 1024 -- > 100MB
  LOOP
    -- Calculate bloat ratio (simplified)
    DECLARE
      bloat_pct NUMERIC;
      wasted_bytes BIGINT;
    BEGIN
      bloat_pct := CASE 
        WHEN rec.n_live_tup + rec.n_dead_tup > 0 THEN
          round(rec.n_dead_tup * 100.0 / (rec.n_live_tup + rec.n_dead_tup), 2)
        ELSE 0 
      END;
      
      wasted_bytes := pg_total_relation_size(rec.schemaname||'.'||rec.tablename) * bloat_pct / 100;
      
      RETURN NEXT (
        rec.tablename,
        rec.size,
        bloat_pct,
        pg_size_pretty(wasted_bytes),
        CASE 
          WHEN bloat_pct > 20 THEN 'VACUUM FULL recommended'
          WHEN bloat_pct > 10 THEN 'VACUUM recommended'
          ELSE 'Table health is good'
        END
      );
    END;
  END LOOP;
END $$;

-- 3. Index maintenance recommendations
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
  index_name TEXT,
  table_name TEXT,
  index_size TEXT,
  scan_count BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  recommendation TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.indexname,
    i.tablename,
    pg_size_pretty(pg_relation_size(i.schemaname||'.'||i.indexname)) as size,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    CASE
      WHEN s.idx_scan = 0 THEN 'Consider dropping - never used'
      WHEN s.idx_scan < 10 AND pg_relation_size(i.schemaname||'.'||i.indexname) > 10 * 1024 * 1024 THEN 
        'Consider dropping - rarely used, large size'
      WHEN s.idx_tup_read > s.idx_tup_fetch * 100 THEN 
        'Index may be inefficient - high read/fetch ratio'
      ELSE 'Index usage looks good'
    END as recommendation
  FROM pg_indexes i
  JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
  WHERE i.schemaname = 'public'
    AND i.indexname NOT LIKE '%_pkey'
  ORDER BY pg_relation_size(i.schemaname||'.'||i.indexname) DESC;
END $$;
```

#### Automated Maintenance Script

```bash
#!/bin/bash
# maintenance/database-maintenance.sh

set -euo pipefail

MAINTENANCE_LOG="maintenance/logs/db-maintenance-$(date +%Y%m%d_%H%M%S).log"
mkdir -p "$(dirname "$MAINTENANCE_LOG")"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$MAINTENANCE_LOG"
}

log "🔧 Starting database maintenance..."

# 1. Database health check
log "📊 Running database health check..."
psql "$DATABASE_URL" -c "SELECT * FROM check_database_health();" >> "$MAINTENANCE_LOG"

# 2. Update table statistics
log "📈 Updating table statistics..."
psql "$DATABASE_URL" -c "ANALYZE;" >> "$MAINTENANCE_LOG"

# 3. Vacuum tables based on bloat analysis
log "🧹 Running vacuum based on bloat analysis..."
psql "$DATABASE_URL" -t -A -c "
  SELECT 'VACUUM ' || table_name || ';' 
  FROM analyze_table_bloat() 
  WHERE bloat_ratio > 10;
" | while read -r vacuum_cmd; do
  if [[ -n "$vacuum_cmd" && "$vacuum_cmd" != "VACUUM ;" ]]; then
    log "Executing: $vacuum_cmd"
    psql "$DATABASE_URL" -c "$vacuum_cmd" >> "$MAINTENANCE_LOG" 2>&1
  fi
done

# 4. Reindex heavily used indexes
log "🔄 Reindexing heavily used indexes..."
psql "$DATABASE_URL" -t -A -c "
  SELECT 'REINDEX INDEX ' || index_name || ';'
  FROM analyze_index_usage() 
  WHERE scan_count > 10000 
    AND recommendation LIKE '%inefficient%';
" | while read -r reindex_cmd; do
  if [[ -n "$reindex_cmd" && "$reindex_cmd" != "REINDEX INDEX ;" ]]; then
    log "Executing: $reindex_cmd"
    psql "$DATABASE_URL" -c "$reindex_cmd" >> "$MAINTENANCE_LOG" 2>&1
  fi
done

# 5. Clean up old audit logs (keep 90 days)
log "🗑️  Cleaning up old audit logs..."
psql "$DATABASE_URL" -c "
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
" >> "$MAINTENANCE_LOG" 2>&1

# 6. Archive old customization sessions (keep 1 year)
log "📦 Archiving old customization data..."
psql "$DATABASE_URL" -c "
  WITH archived AS (
    DELETE FROM customization_sessions 
    WHERE created_at < NOW() - INTERVAL '1 year'
    RETURNING *
  )
  INSERT INTO customization_sessions_archive 
  SELECT * FROM archived;
" >> "$MAINTENANCE_LOG" 2>&1

# 7. Update materialized views
log "🔄 Refreshing materialized views..."
psql "$DATABASE_URL" -c "
  REFRESH MATERIALIZED VIEW CONCURRENTLY customization_analytics_summary;
" >> "$MAINTENANCE_LOG" 2>&1

# 8. Check for missing indexes on foreign keys
log "🔍 Checking for missing foreign key indexes..."
MISSING_FK_INDEXES=$(psql "$DATABASE_URL" -t -A -c "
  SELECT COUNT(*)
  FROM (
    SELECT DISTINCT
      c.conrelid::regclass AS table_name,
      string_agg(a.attname, ', ' ORDER BY x.n) AS columns
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS x(attnum, n) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum
    WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::smallint[])[0:array_length(c.conkey, 1)-1] @> c.conkey
      )
    GROUP BY c.conrelid, c.oid
  ) missing_indexes;
")

if [[ "$MISSING_FK_INDEXES" -gt 0 ]]; then
  log "⚠️  Found $MISSING_FK_INDEXES missing foreign key indexes"
  psql "$DATABASE_URL" -c "
    SELECT 
      c.conrelid::regclass AS table_name,
      string_agg(a.attname, ', ' ORDER BY x.n) AS missing_index_columns
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS x(attnum, n) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = x.attnum
    WHERE c.contype = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND (i.indkey::smallint[])[0:array_length(c.conkey, 1)-1] @> c.conkey
      )
    GROUP BY c.conrelid, c.oid;
  " >> "$MAINTENANCE_LOG"
fi

# 9. Database size monitoring
log "💾 Database size monitoring..."
CURRENT_SIZE=$(psql "$DATABASE_URL" -t -A -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
log "Current database size: $CURRENT_SIZE"

# 10. Generate maintenance summary
log "📋 Generating maintenance summary..."
{
  echo "# Database Maintenance Summary"
  echo "**Date**: $(date)"
  echo "**Database Size**: $CURRENT_SIZE"
  echo "**Missing FK Indexes**: $MISSING_FK_INDEXES"
  echo ""
  echo "## Health Check Results"
  psql "$DATABASE_URL" -H -c "SELECT * FROM check_database_health();"
  echo ""
  echo "## Table Bloat Analysis"  
  psql "$DATABASE_URL" -H -c "SELECT * FROM analyze_table_bloat();"
  echo ""
  echo "## Full Maintenance Log"
  echo '```'
  cat "$MAINTENANCE_LOG"
  echo '```'
} > "maintenance/reports/maintenance-summary-$(date +%Y%m%d).md"

log "✅ Database maintenance completed successfully"

# 11. Send maintenance summary to ops team
if [[ "${CI:-false}" == "true" ]] && [[ -n "${OPS_SLACK_WEBHOOK:-}" ]]; then
  curl -X POST "$OPS_SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    --data "{
      \"text\": \"🔧 Database Maintenance Completed\",
      \"attachments\": [{
        \"color\": \"good\",
        \"fields\": [
          {\"title\": \"Database Size\", \"value\": \"$CURRENT_SIZE\", \"short\": true},
          {\"title\": \"Missing FK Indexes\", \"value\": \"$MISSING_FK_INDEXES\", \"short\": true},
          {\"title\": \"Log File\", \"value\": \"$(basename "$MAINTENANCE_LOG")\", \"short\": true}
        ]
      }]
    }"
fi

# 12. Clean up old maintenance logs (keep 30 days)
find maintenance/logs -name "db-maintenance-*.log" -mtime +30 -delete
find maintenance/reports -name "maintenance-summary-*.md" -mtime +90 -delete
```

---

## Conclusion

This Operations & Maintenance Guide provides comprehensive coverage of all aspects required to successfully operate the 6FB AI Agent System customize page in production. The guide includes:

### Key Operational Areas Covered:

1. **Production Deployment** - Zero-downtime deployment strategies and automation
2. **Monitoring & Alerting** - Comprehensive metrics collection and alerting rules
3. **Performance Optimization** - Database and frontend optimization strategies
4. **Security Operations** - Real-time monitoring and vulnerability management
5. **Database Maintenance** - Automated health checks and optimization routines
6. **Backup & Recovery** - Data protection and disaster recovery procedures
7. **Incident Response** - Structured response procedures and escalation paths
8. **Capacity Planning** - Growth planning and resource scaling strategies
9. **Compliance & Auditing** - Regulatory compliance and audit procedures
10. **Troubleshooting** - Common issues and resolution procedures

This guide ensures that the customize page system can be operated reliably at enterprise scale while maintaining the high performance and security standards required for the Six Figure Barber platform.

---

*Document Version: 1.0*  
*Last Updated: 2025-01-24*  
*Next Review: 2025-02-24*