# Database Schema - Dashboard & AI Tables

## Overview

This document describes the database tables created for the barbershop platform's dashboard and AI systems. All tables follow Supabase best practices with Row Level Security (RLS), proper indexing, and real-time subscriptions.

## Table Relationships

```
barbershops (existing)
├── business_metrics (1:many)
├── ai_insights (1:many)
├── ai_agents (1:many)
│   └── business_recommendations (1:many)
├── realtime_metrics (1:many)
├── location_performance (1:many)
└── trending_services (1:many)
```

## Table Definitions

### 1. business_metrics
**Purpose**: Daily business performance tracking
**Unique Constraint**: One record per barbershop per date

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| date | DATE | Business date |
| total_revenue | DECIMAL(10,2) | Daily revenue |
| total_customers | INTEGER | Daily customer count |
| total_appointments | INTEGER | Daily appointment count |
| avg_satisfaction_score | DECIMAL(3,2) | Average satisfaction (0-5) |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Indexes**:
- `barbershop_id`
- `date`
- `barbershop_id, date` (composite)

### 2. ai_insights
**Purpose**: AI-generated business insights and recommendations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| insight_type | TEXT | Type: revenue, customer, operations, marketing, efficiency, staff |
| title | TEXT | Insight title |
| description | TEXT | Detailed insight description |
| priority | INTEGER | Priority level (1-5) |
| confidence_score | DECIMAL(3,2) | AI confidence (0-1) |
| is_active | BOOLEAN | Whether insight is active |
| created_at | TIMESTAMPTZ | Creation time |

**Indexes**:
- `barbershop_id`
- `insight_type`
- `is_active`
- `priority`
- `created_at`

### 3. ai_agents
**Purpose**: AI agent configurations and status tracking
**Unique Constraint**: One agent per type per barbershop

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| agent_name | TEXT | Human-readable agent name |
| agent_type | TEXT | Type: financial, operations, brand, growth, master |
| status | TEXT | Status: active, inactive, error, training |
| is_enabled | BOOLEAN | Whether agent is enabled |
| last_activity_at | TIMESTAMPTZ | Last activity timestamp |
| last_insight | TEXT | Most recent insight |
| avg_confidence_score | DECIMAL(3,2) | Average confidence (0-1) |
| total_insights_generated | INTEGER | Total insights count |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

**Indexes**:
- `barbershop_id`
- `agent_type`
- `status`
- `is_enabled`
- `last_activity_at`

### 4. business_recommendations
**Purpose**: AI-generated actionable business recommendations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| agent_id | UUID | Foreign key to ai_agents |
| title | TEXT | Recommendation title |
| description | TEXT | Detailed recommendation |
| impact_level | TEXT | Impact: high, medium, low |
| revenue_potential_monthly | DECIMAL(10,2) | Estimated monthly revenue impact |
| confidence_score | DECIMAL(3,2) | AI confidence (0-1) |
| implementation_effort | TEXT | Effort: easy, moderate, complex |
| time_to_implement_days | INTEGER | Implementation time estimate |
| is_implemented | BOOLEAN | Whether recommendation was implemented |
| created_at | TIMESTAMPTZ | Creation time |

**Indexes**:
- `barbershop_id`
- `agent_id`
- `impact_level`
- `is_implemented`
- `created_at`

### 5. realtime_metrics
**Purpose**: Real-time operational metrics for live dashboard

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| timestamp | TIMESTAMPTZ | Metric timestamp |
| active_appointments | INTEGER | Current active appointments |
| waiting_customers | INTEGER | Customers in queue |
| available_barbers | INTEGER | Available barber count |
| next_available_slot | TIMESTAMPTZ | Next available appointment slot |
| created_at | TIMESTAMPTZ | Record creation time |

**Indexes**:
- `barbershop_id`
- `timestamp`
- `barbershop_id, timestamp` (composite)

### 6. location_performance
**Purpose**: Multi-location performance comparison
**Unique Constraint**: One record per barbershop per date

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| date | DATE | Performance date |
| revenue | DECIMAL(10,2) | Location revenue |
| efficiency_score | DECIMAL(3,2) | Operational efficiency (0-1) |
| customer_rating | DECIMAL(3,2) | Average customer rating (0-5) |
| created_at | TIMESTAMPTZ | Record creation time |

**Indexes**:
- `barbershop_id`
- `date`
- `barbershop_id, date` (composite)

### 7. trending_services
**Purpose**: Service popularity and growth tracking
**Unique Constraint**: One record per barbershop per date per service

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| barbershop_id | UUID | Foreign key to barbershops |
| date | DATE | Tracking date |
| service_name | TEXT | Service name |
| total_bookings | INTEGER | Total service bookings |
| growth_rate | DECIMAL(5,2) | Growth rate percentage |
| created_at | TIMESTAMPTZ | Record creation time |

**Indexes**:
- `barbershop_id`
- `date`
- `service_name`
- `barbershop_id, date` (composite)
- `total_bookings`

## Security (Row Level Security)

All tables have RLS enabled with policies that ensure:
- Users can only access data for barbershops they own
- Authenticated users required for all operations
- Foreign key relationships properly secured

### Policy Pattern
```sql
-- Example policy structure for all tables
CREATE POLICY "policy_name" ON table_name
    FOR SELECT TO authenticated
    USING (
        barbershop_id IN (
            SELECT id FROM barbershops 
            WHERE owner_id = (SELECT auth.uid())
        )
    );
```

## Real-time Subscriptions

All tables are enabled for real-time subscriptions via Supabase's realtime feature:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
```

## Usage Examples

### Query Business Metrics
```sql
-- Get last 30 days of business metrics
SELECT * FROM business_metrics 
WHERE barbershop_id = $1 
  AND date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Get Active AI Insights
```sql
-- Get active insights by priority
SELECT * FROM ai_insights 
WHERE barbershop_id = $1 
  AND is_active = true
ORDER BY priority DESC, created_at DESC;
```

### Track Trending Services
```sql
-- Get trending services for current month
SELECT service_name, SUM(total_bookings) as total, AVG(growth_rate) as avg_growth
FROM trending_services 
WHERE barbershop_id = $1 
  AND date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY service_name
ORDER BY total DESC;
```

## Migration

Execute the migration using:
```bash
./scripts/run-dashboard-migration.sh
```

Or manually apply:
```bash
supabase db reset --linked
# or
psql $DATABASE_URL -f migrations/create_dashboard_ai_tables.sql
```

## Performance Considerations

1. **Indexes**: All foreign keys and commonly queried columns are indexed
2. **Partitioning**: Consider partitioning time-series tables by date for large datasets
3. **Archiving**: Implement archiving strategy for old metrics data
4. **Batch Operations**: Use batch inserts for bulk data operations

## Monitoring

Monitor these key metrics:
- Query performance on time-series data
- Index usage and efficiency
- RLS policy performance
- Real-time subscription load