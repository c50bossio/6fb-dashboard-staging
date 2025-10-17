# 6FB AI Agent System - Automation Database Performance Guide

## Overview

This guide provides comprehensive database performance optimization strategies for the automation system, designed to handle 1000+ operations/second with ACID compliance and multi-tenant isolation.

## Performance Monitoring Queries

### 1. Real-Time Queue Performance

```sql
-- Monitor automation queue performance in real-time
SELECT 
  barbershop_id,
  task_type,
  status,
  priority,
  COUNT(*) as task_count,
  MIN(scheduled_for) as oldest_task,
  AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_age_seconds,
  MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) as max_age_seconds
FROM automation_queue
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY barbershop_id, task_type, status, priority
ORDER BY avg_age_seconds DESC;
```

### 2. Identify Slow Automation Executions

```sql
-- Find automation executions taking longer than 5 seconds
SELECT 
  automation_type,
  barbershop_id,
  AVG(execution_time_ms) as avg_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time_ms,
  COUNT(*) as execution_count,
  COUNT(*) FILTER (WHERE execution_time_ms > 5000) as slow_executions
FROM automation_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND status = 'COMPLETED'
GROUP BY automation_type, barbershop_id
HAVING AVG(execution_time_ms) > 2000
ORDER BY avg_time_ms DESC;
```

### 3. Payment Processing Performance

```sql
-- Monitor payment processing success rates and performance
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  payment_method,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful,
  COUNT(*) FILTER (WHERE status = 'FAILED') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / COUNT(*), 2) as success_rate_pct,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
FROM payment_attempts
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at), payment_method
ORDER BY hour DESC, success_rate_pct ASC;
```

### 4. Index Usage Statistics

```sql
-- Check index usage efficiency
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  CASE WHEN idx_tup_read > 0 THEN (idx_tup_fetch * 100.0 / idx_tup_read) ELSE 0 END as selectivity_pct
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND tablename IN ('automation_logs', 'automation_queue', 'payment_attempts', 'reminder_schedule', 'risk_scores')
ORDER BY idx_tup_read DESC;
```

### 5. Table Bloat Detection

```sql
-- Detect table bloat that affects performance
WITH table_stats AS (
  SELECT 
    schemaname,
    tablename,
    n_dead_tup,
    n_live_tup,
    CASE WHEN n_live_tup > 0 THEN (n_dead_tup * 100.0 / (n_live_tup + n_dead_tup)) ELSE 0 END as bloat_pct
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  AND tablename LIKE 'automation_%' OR tablename LIKE 'payment_%' OR tablename LIKE 'reminder_%'
)
SELECT *
FROM table_stats
WHERE bloat_pct > 10
ORDER BY bloat_pct DESC;
```

## Performance Optimization Strategies

### 1. Connection Pool Configuration

```javascript
// Optimal connection pool settings for high-throughput operations
const poolConfig = {
  // Connection pool size based on expected concurrent operations
  max: Math.max(20, Math.min(100, process.env.MAX_CONNECTIONS || 50)),
  min: 5,
  
  // Connection lifecycle management
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200,
  
  // Pool validation
  testOnBorrow: true,
  
  // Optimize for automation workloads
  propagateCreateError: false,
  evictionRunIntervalMillis: 10000,
  softIdleTimeoutMillis: 10000
};
```

### 2. Query Optimization Patterns

```sql
-- Use prepared statements for repeated operations
PREPARE automation_queue_claim AS
  UPDATE automation_queue 
  SET status = 'PROCESSING', processing_started_at = NOW()
  WHERE id IN (
    SELECT id FROM automation_queue
    WHERE status = 'PENDING' AND scheduled_for <= NOW()
    ORDER BY priority DESC, scheduled_for ASC
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;

-- Execute with: EXECUTE automation_queue_claim(10);
```

### 3. Batch Operation Templates

```javascript
// Efficient batch operations
class BatchProcessor {
  static async processBatch(operations, batchSize = 100) {
    const results = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      try {
        // Process batch within transaction
        const batchResult = await supabase.rpc('process_automation_batch', {
          operations: batch
        });
        
        results.push(...batchResult.data);
      } catch (error) {
        console.error(`Batch ${i / batchSize + 1} failed:`, error);
        // Implement retry logic or individual processing
      }
    }
    
    return results;
  }
}
```

### 4. Caching Strategies

```javascript
// Multi-level caching implementation
class AutomationCache {
  constructor() {
    // L1: In-memory cache for hot data
    this.memoryCache = new Map();
    this.memoryCacheMaxSize = 1000;
    
    // L2: Redis cache for shared data
    this.redisClient = new Redis(process.env.REDIS_URL);
  }
  
  async get(key) {
    // Check L1 cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Check L2 cache
    const redisValue = await this.redisClient.get(`automation:${key}`);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      
      // Populate L1 cache
      this.setMemoryCache(key, parsed);
      return parsed;
    }
    
    return null;
  }
  
  async set(key, value, ttl = 300) {
    // Set in both caches
    this.setMemoryCache(key, value);
    await this.redisClient.setex(`automation:${key}`, ttl, JSON.stringify(value));
  }
  
  setMemoryCache(key, value) {
    if (this.memoryCache.size >= this.memoryCacheMaxSize) {
      // Remove oldest entry (LRU)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    this.memoryCache.set(key, value);
  }
}
```

## Database Maintenance Procedures

### 1. Automated Vacuum and Analyze

```sql
-- Create optimized vacuum procedures
CREATE OR REPLACE FUNCTION optimize_automation_tables()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  -- Vacuum analyze high-write tables more frequently
  VACUUM ANALYZE automation_logs;
  VACUUM ANALYZE automation_queue;
  VACUUM ANALYZE payment_attempts;
  
  -- Standard vacuum for other tables
  VACUUM ANALYZE reminder_schedule;
  VACUUM ANALYZE risk_scores;
  VACUUM ANALYZE automation_metrics;
  
  -- Reindex if fragmentation is high
  REINDEX INDEX CONCURRENTLY idx_automation_queue_processing;
  REINDEX INDEX CONCURRENTLY idx_automation_logs_barbershop_created;
  
  -- Update table statistics
  ANALYZE automation_logs;
  ANALYZE automation_queue;
  ANALYZE payment_attempts;
END $$;

-- Schedule optimization to run every 4 hours
SELECT cron.schedule('automation-optimization', '0 */4 * * *', 'SELECT optimize_automation_tables();');
```

### 2. Partition Management

```sql
-- Automated partition management for automation_logs
CREATE OR REPLACE FUNCTION manage_automation_log_partitions()
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  partition_date DATE;
  partition_name TEXT;
  drop_date DATE;
  drop_partition_name TEXT;
BEGIN
  -- Create next month's partition
  partition_date := DATE_TRUNC('month', NOW() + INTERVAL '1 month');
  partition_name := 'automation_logs_y' || EXTRACT(year FROM partition_date) || 'm' || LPAD(EXTRACT(month FROM partition_date)::TEXT, 2, '0');
  
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I PARTITION OF automation_logs
    FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    partition_date,
    partition_date + INTERVAL '1 month'
  );
  
  -- Drop partitions older than 90 days (after data retention cleanup)
  drop_date := DATE_TRUNC('month', NOW() - INTERVAL '90 days');
  drop_partition_name := 'automation_logs_y' || EXTRACT(year FROM drop_date) || 'm' || LPAD(EXTRACT(month FROM drop_date)::TEXT, 2, '0');
  
  -- Only drop if partition exists and is empty (after cleanup)
  PERFORM 1 FROM information_schema.tables 
  WHERE table_name = drop_partition_name;
  
  IF FOUND THEN
    EXECUTE format('DROP TABLE IF EXISTS %I', drop_partition_name);
  END IF;
END $$;

-- Schedule partition management daily
SELECT cron.schedule('partition-management', '0 1 * * *', 'SELECT manage_automation_log_partitions();');
```

### 3. Statistics and Monitoring

```sql
-- Create monitoring views for automation system health
CREATE OR REPLACE VIEW automation_system_health AS
WITH queue_stats AS (
  SELECT 
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'PROCESSING') as processing_tasks,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_tasks,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_queue_age_seconds
  FROM automation_queue
  WHERE created_at >= NOW() - INTERVAL '1 hour'
),
performance_stats AS (
  SELECT 
    COUNT(*) as executions_last_hour,
    AVG(execution_time_ms) as avg_execution_time_ms,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_executions,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_executions
  FROM automation_logs
  WHERE created_at >= NOW() - INTERVAL '1 hour'
),
payment_stats AS (
  SELECT 
    COUNT(*) as payment_attempts_last_hour,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') as successful_payments,
    COUNT(*) FILTER (WHERE status = 'FAILED') as failed_payments
  FROM payment_attempts
  WHERE created_at >= NOW() - INTERVAL '1 hour'
)
SELECT 
  -- Queue Health
  q.pending_tasks,
  q.processing_tasks,
  q.failed_tasks,
  q.avg_queue_age_seconds,
  
  -- Performance Health
  p.executions_last_hour,
  p.avg_execution_time_ms,
  ROUND(p.successful_executions * 100.0 / NULLIF(p.executions_last_hour, 0), 2) as success_rate_pct,
  
  -- Payment Health
  pay.payment_attempts_last_hour,
  ROUND(pay.successful_payments * 100.0 / NULLIF(pay.payment_attempts_last_hour, 0), 2) as payment_success_rate_pct,
  
  -- Overall Health Score (0-100)
  CASE 
    WHEN q.avg_queue_age_seconds < 60 AND p.avg_execution_time_ms < 2000 
         AND (p.successful_executions * 100.0 / NULLIF(p.executions_last_hour, 0)) > 95
    THEN 'EXCELLENT'
    WHEN q.avg_queue_age_seconds < 300 AND p.avg_execution_time_ms < 5000
         AND (p.successful_executions * 100.0 / NULLIF(p.executions_last_hour, 0)) > 90
    THEN 'GOOD'
    WHEN q.avg_queue_age_seconds < 600 AND p.avg_execution_time_ms < 10000
         AND (p.successful_executions * 100.0 / NULLIF(p.executions_last_hour, 0)) > 80
    THEN 'FAIR'
    ELSE 'POOR'
  END as health_status,
  
  NOW() as last_updated
FROM queue_stats q
CROSS JOIN performance_stats p
CROSS JOIN payment_stats pay;
```

## Alerting and Monitoring Setup

### 1. Performance Alert Thresholds

```sql
-- Create alerting function for performance issues
CREATE OR REPLACE FUNCTION check_automation_performance()
RETURNS TABLE(alert_type TEXT, severity TEXT, message TEXT, metric_value NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
  -- Check queue backup (critical alert)
  RETURN QUERY
  SELECT 
    'QUEUE_BACKUP'::TEXT,
    'CRITICAL'::TEXT,
    'Automation queue has tasks older than 10 minutes'::TEXT,
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)))::NUMERIC
  FROM automation_queue
  WHERE status = 'PENDING' AND created_at < NOW() - INTERVAL '10 minutes'
  HAVING COUNT(*) > 0;
  
  -- Check high failure rate (warning alert)
  RETURN QUERY
  WITH failure_rate AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'FAILED') * 100.0 / COUNT(*) as failure_pct
    FROM automation_logs
    WHERE created_at >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'HIGH_FAILURE_RATE'::TEXT,
    'WARNING'::TEXT,
    'Automation failure rate exceeds 10% in the last hour'::TEXT,
    failure_pct::NUMERIC
  FROM failure_rate
  WHERE failure_pct > 10;
  
  -- Check slow execution times (warning alert)
  RETURN QUERY
  WITH slow_executions AS (
    SELECT AVG(execution_time_ms) as avg_time
    FROM automation_logs
    WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND status = 'COMPLETED'
  )
  SELECT 
    'SLOW_EXECUTION'::TEXT,
    'WARNING'::TEXT,
    'Average execution time exceeds 5 seconds'::TEXT,
    avg_time::NUMERIC
  FROM slow_executions
  WHERE avg_time > 5000;
  
  -- Check payment failure rate (critical for revenue)
  RETURN QUERY
  WITH payment_failure AS (
    SELECT 
      COUNT(*) FILTER (WHERE status = 'FAILED') * 100.0 / COUNT(*) as failure_pct
    FROM payment_attempts
    WHERE created_at >= NOW() - INTERVAL '1 hour'
  )
  SELECT 
    'PAYMENT_FAILURE_RATE'::TEXT,
    'CRITICAL'::TEXT,
    'Payment failure rate exceeds 5% in the last hour'::TEXT,
    failure_pct::NUMERIC
  FROM payment_failure
  WHERE failure_pct > 5;
END $$;
```

### 2. Automated Recovery Procedures

```sql
-- Create automated recovery procedures
CREATE OR REPLACE FUNCTION auto_recover_stuck_tasks()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  recovered_count INTEGER;
BEGIN
  -- Reset tasks stuck in PROCESSING for more than 15 minutes
  UPDATE automation_queue
  SET 
    status = 'PENDING',
    assigned_worker_id = NULL,
    processing_started_at = NULL,
    attempts = attempts + 1,
    updated_at = NOW()
  WHERE status = 'PROCESSING'
  AND processing_started_at < NOW() - INTERVAL '15 minutes'
  AND attempts < max_attempts;
  
  GET DIAGNOSTICS recovered_count = ROW_COUNT;
  
  -- Mark permanently failed tasks as expired
  UPDATE automation_queue
  SET status = 'EXPIRED'
  WHERE status = 'PROCESSING'
  AND processing_started_at < NOW() - INTERVAL '15 minutes'
  AND attempts >= max_attempts;
  
  RETURN recovered_count;
END $$;

-- Schedule recovery to run every 5 minutes
SELECT cron.schedule('auto-recovery', '*/5 * * * *', 'SELECT auto_recover_stuck_tasks();');
```

## Backup and Disaster Recovery

### 1. Critical Data Backup Strategy

```bash
#!/bin/bash
# High-frequency backup for critical automation data

# Backup automation queue (every 15 minutes)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --table=automation_queue \
  --data-only \
  --format=custom \
  --compress=9 \
  > "automation_queue_$(date +%Y%m%d_%H%M).dump"

# Backup payment attempts (every hour - compliance requirement)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --table=payment_attempts \
  --format=custom \
  --compress=9 \
  > "payment_attempts_$(date +%Y%m%d_%H).dump"

# Backup automation logs current partition (daily)
CURRENT_MONTH=$(date +%Y%m)
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME \
  --table="automation_logs_y${CURRENT_MONTH:0:4}m${CURRENT_MONTH:4:2}" \
  --format=custom \
  --compress=9 \
  > "automation_logs_${CURRENT_MONTH}_$(date +%d).dump"
```

### 2. Point-in-Time Recovery Setup

```sql
-- Enable point-in-time recovery for critical tables
ALTER TABLE payment_attempts ADD COLUMN backup_timestamp TIMESTAMP DEFAULT NOW();
ALTER TABLE automation_queue ADD COLUMN backup_timestamp TIMESTAMP DEFAULT NOW();

-- Create triggers to update backup timestamps
CREATE OR REPLACE FUNCTION update_backup_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.backup_timestamp = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_attempts_backup_trigger
  BEFORE UPDATE ON payment_attempts
  FOR EACH ROW EXECUTE FUNCTION update_backup_timestamp();

CREATE TRIGGER automation_queue_backup_trigger
  BEFORE UPDATE ON automation_queue
  FOR EACH ROW EXECUTE FUNCTION update_backup_timestamp();
```

## Capacity Planning

### Expected Load Patterns

- **Peak Hours**: 9 AM - 6 PM (booking confirmations, reminders)
- **Payment Processing**: Throughout business hours with spikes after appointments
- **Risk Assessment**: Continuous background processing
- **Queue Processing**: 24/7 with variable batch sizes

### Scaling Recommendations

1. **Database Scaling**:
   - Read replicas for analytics queries
   - Connection pooling with pgbouncer
   - Partition automation_logs by month
   - Index optimization for query patterns

2. **Application Scaling**:
   - Horizontal scaling of automation workers
   - Load balancing for API endpoints
   - Async processing for non-critical tasks
   - Circuit breakers for external services

3. **Monitoring Scaling**:
   - Prometheus + Grafana for metrics
   - Custom alerting based on business KPIs
   - Log aggregation for troubleshooting
   - Performance profiling for optimization

---

This performance guide ensures the automation system can handle enterprise-scale workloads while maintaining data integrity and providing actionable insights for continuous optimization.