# Agent Performance Dashboard - Implementation Complete

## Overview
Complete Agent Performance Dashboard for monitoring AgentKit usage, costs, performance metrics, and agent handoff flows. Built with real-time data tracking, advanced visualizations, and comprehensive analytics.

## Live Dashboard URL
**Production**: `/admin/agent-performance`

---

## Implementation Summary

### 1. Database Schema
**File**: `/database/agent-performance-schema.sql`

**Table**: `agent_performance_logs`
- Comprehensive logging of all AgentKit queries
- Performance metrics: tokens, cost, response time
- Agent handoff tracking with JSONB support
- Status tracking (success, error, timeout)
- Full metadata support

**Features**:
- Materialized view for aggregated metrics
- Optimized indexes for fast queries
- Automatic refresh triggers
- GIN indexes for JSONB queries

---

### 2. Performance Logger Utility
**File**: `/lib/agent-performance-logger.js`

**Functions**:
- `logAgentQuery()` - Log query performance to database
- `getPerformanceMetrics()` - Fetch metrics with filters
- `aggregatePerformanceStats()` - Calculate statistics
- `exportLogsToCSV()` - Export data to CSV format

**Features**:
- Automatic query type detection
- Error handling with fallback
- Performance metric aggregation
- CSV export functionality

---

### 3. API Endpoints

#### A. Metrics Endpoint
**Route**: `GET /api/admin/agent-performance/metrics`

**Query Parameters**:
- `barbershop_id` - Filter by barbershop
- `start_date` - Start date for metrics
- `end_date` - End date for metrics
- `days` - Number of days to look back (default: 30)

**Response**:
```json
{
  "success": true,
  "overview": {
    "total_queries": 245,
    "total_cost": 9.32,
    "avg_response_time": 11400,
    "most_used_agent": "financial_coach_agent",
    "success_rate": 98.5
  },
  "queries_by_agent": [...],
  "cost_by_day": [...],
  "response_time_distribution": [...],
  "agent_performance": [...]
}
```

#### B. Query Logs Endpoint
**Route**: `GET /api/admin/agent-performance/queries`

**Query Parameters**:
- `barbershop_id` - Filter by barbershop
- `agent` - Filter by agent
- `status` - Filter by status
- `search` - Search in query text
- `page` - Page number (default: 1)
- `per_page` - Items per page (default: 20)
- `sort_by` - Sort field (default: created_at)
- `sort_order` - Sort order (default: desc)
- `export` - Export to CSV (boolean)

**Response**:
```json
{
  "success": true,
  "queries": [...],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total": 245,
    "total_pages": 13
  }
}
```

#### C. Handoffs Endpoint
**Route**: `GET /api/admin/agent-performance/handoffs`

**Response**:
```json
{
  "success": true,
  "flows": [
    {
      "from": "Master Triage",
      "to": "Financial Coach",
      "count": 89
    }
  ],
  "collaboration_stats": {
    "single_agent": 120,
    "multi_agent": 45,
    "handoff": 80,
    "avg_handoffs_per_query": 1.2
  }
}
```

---

### 4. Visualization Components

#### A. Agent Usage Chart
**File**: `/components/analytics/AgentUsageChart.js`

**Features**:
- Interactive bar chart with Recharts
- Color-coded by agent type
- Click bars to filter dashboard
- Shows query count per agent
- Custom tooltips with details

#### B. Cost Timeline Chart
**File**: `/components/analytics/CostTimelineChart.js`

**Features**:
- Area chart showing daily costs
- Trend statistics (avg, peak, min)
- Peak cost day highlighting
- Cost trend percentage
- Gradient fill for visual appeal

#### C. Response Time Chart
**File**: `/components/analytics/ResponseTimeChart.js`

**Features**:
- Histogram with time buckets
- Performance categorization (fast, medium, slow)
- P50 and P95 percentile calculations
- Performance assessment with recommendations
- Color-coded by performance level

#### D. Handoff Flow Diagram
**File**: `/components/analytics/HandoffFlowDiagram.js`

**Features**:
- Visual flow diagram from source to target agents
- Flow width proportional to handoff count
- Collaboration statistics breakdown
- Interactive flow selection
- Color-coded collaboration types

#### E. Query Performance Table
**File**: `/components/analytics/QueryPerformanceTable.js`

**Features**:
- Sortable columns (all fields)
- Advanced filtering (search, agent, status)
- Pagination (20 items per page)
- CSV export functionality
- Click row to see full details
- Query detail modal with metadata

---

### 5. Main Dashboard Page
**File**: `/app/(protected)/admin/agent-performance/page.js`

**Layout Sections**:

#### Header
- Dashboard title and description
- Date range selector (7, 30, 60, 90 days)
- Refresh button with loading state
- Active filter indicators

#### Overview Cards (4 cards)
1. **Total Queries** - Count with time period
2. **Total Cost** - USD with average per query
3. **Avg Response Time** - Seconds with performance indicator
4. **Most Used Agent** - Name with success rate

#### Visualizations (4 charts)
1. **Agent Usage Distribution** - Bar chart
2. **Cost Over Time** - Area chart
3. **Response Time Distribution** - Histogram
4. **Agent Handoff Flow** - Flow diagram

#### Data Table
- Query Performance Table with full functionality

**Features**:
- Real-time data loading
- Auto-refresh capability
- Agent filtering from charts
- Responsive design (mobile-friendly)
- Loading states and error handling
- Empty state messages

---

### 6. Integration with AgentKit
**File**: `/app/api/ai/agents/route.js`

**Changes**:
- Import `logAgentQuery` utility
- Log AgentKit backend queries (database access)
- Log AI Orchestrator queries (general queries)
- Track response times accurately
- Log errors and timeouts
- Non-blocking logging (catches errors)

**Logged Data**:
- Query text
- Agent used
- Handoffs (if any)
- Tokens used
- Cost in USD
- Response time in milliseconds
- Status (success/error/timeout)
- User context (barbershop_id, user_id, session_id)
- Query type (database, general, multi_agent)
- Provider (agentkit_backend, ai_orchestrator)
- Error messages (if failed)

---

## Dashboard Features

### Data Visualization
- **4 Interactive Charts**: Agent usage, cost timeline, response time, handoff flows
- **Real-time Metrics**: Live data with auto-refresh
- **Performance Analytics**: P50/P95 percentiles, success rates, trends
- **Cost Tracking**: Daily costs, trends, peak analysis

### Filtering & Sorting
- **Multi-dimensional Filters**: Agent, status, date range, search
- **Sortable Columns**: All table fields with asc/desc
- **Active Filter Display**: Clear filter tags
- **Agent Click Filtering**: Click chart bars to filter dashboard

### Data Export
- **CSV Export**: Full query log with all metadata
- **Custom Filters**: Export with current filters applied
- **Automatic Download**: Browser-initiated download

### User Experience
- **Responsive Design**: Works on desktop, tablet, mobile
- **Loading States**: Spinners and skeleton screens
- **Empty States**: Helpful messages when no data
- **Error Handling**: Graceful degradation
- **Tooltips**: Rich hover information
- **Modal Details**: Click rows for full query details

---

## Performance Optimizations

### Database
- Materialized views for aggregations
- Composite indexes for common queries
- GIN indexes for JSONB searches
- Automatic view refresh triggers

### Frontend
- Lazy loading for charts
- Pagination (20 items per page)
- API response caching (5 minutes)
- Optimized re-renders with React hooks

### Backend
- Non-blocking logging (catch errors)
- Efficient aggregation queries
- Date range filtering
- Pagination support

---

## Usage Examples

### View Dashboard
```
Navigate to: /admin/agent-performance
```

### Filter by Agent
1. Click on agent bar in Usage Chart
2. Dashboard filters to show only that agent's data
3. Click "Clear Filter" to reset

### Export Data
1. Click "Export CSV" button
2. Apply any filters you want
3. CSV downloads automatically

### View Query Details
1. Click any row in Performance Table
2. Modal shows full query text, metadata, handoffs
3. Click X or outside modal to close

### Change Date Range
1. Use date range selector in header
2. Choose 7, 30, 60, or 90 days
3. Dashboard refreshes automatically

---

## Database Setup

### Step 1: Apply Schema
```bash
# Using Supabase CLI
supabase migration new agent_performance
# Copy contents of database/agent-performance-schema.sql
supabase db push

# Or using psql
psql $DATABASE_URL -f database/agent-performance-schema.sql
```

### Step 2: Verify Tables
```sql
-- Check table exists
SELECT * FROM agent_performance_logs LIMIT 1;

-- Check materialized view
SELECT * FROM agent_performance_summary LIMIT 1;

-- Refresh view manually
REFRESH MATERIALIZED VIEW agent_performance_summary;
```

### Step 3: Test Logging
```javascript
// In browser console or API test
const response = await fetch('/api/ai/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'How much revenue did I make this month?'
  })
});

// Check dashboard
// Navigate to /admin/agent-performance
// Should see the query logged
```

---

## Monitoring & Maintenance

### View Performance
- Check dashboard daily for anomalies
- Monitor cost trends
- Watch success rate
- Review slow queries (>20s)

### Optimize Queries
- Identify slow agents
- Review error messages
- Optimize expensive queries
- Adjust timeout settings

### Database Maintenance
```sql
-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance_summary;

-- Clean old logs (optional)
DELETE FROM agent_performance_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- Reindex for performance
REINDEX TABLE agent_performance_logs;
```

---

## Troubleshooting

### No Data Showing
1. Check if `agent_performance_logs` table exists
2. Verify logging is enabled in `/app/api/ai/agents/route.js`
3. Send test query to AI chat
4. Check browser console for errors
5. Verify database connection

### Slow Dashboard
1. Refresh materialized view
2. Check database indexes
3. Reduce date range
4. Clear browser cache
5. Check network tab for slow API calls

### Export Not Working
1. Check if query returns data
2. Verify CSV export endpoint
3. Check browser download permissions
4. Review browser console errors

### Charts Not Rendering
1. Verify Recharts is installed
2. Check component imports
3. Review browser console
4. Verify data format matches chart expectations

---

## Files Created

### Database
- `/database/agent-performance-schema.sql` - Table schema and indexes

### Backend
- `/lib/agent-performance-logger.js` - Logging utility
- `/app/api/admin/agent-performance/metrics/route.js` - Metrics API
- `/app/api/admin/agent-performance/queries/route.js` - Query logs API
- `/app/api/admin/agent-performance/handoffs/route.js` - Handoff data API

### Components
- `/components/analytics/AgentUsageChart.js` - Bar chart
- `/components/analytics/CostTimelineChart.js` - Area chart
- `/components/analytics/ResponseTimeChart.js` - Histogram
- `/components/analytics/HandoffFlowDiagram.js` - Flow diagram
- `/components/analytics/QueryPerformanceTable.js` - Data table

### Pages
- `/app/(protected)/admin/agent-performance/page.js` - Main dashboard

### Modified Files
- `/app/api/ai/agents/route.js` - Added logging integration

---

## Next Steps (Optional Enhancements)

### Advanced Features
1. **Real-time Updates**: Add WebSocket for live data
2. **Agent Comparison**: Side-by-side agent performance
3. **Cost Alerts**: Email when cost exceeds threshold
4. **Performance Predictions**: ML-based forecasting
5. **Custom Dashboards**: User-configurable widgets

### Analytics Enhancements
1. **User Journey Tracking**: Track query sequences
2. **Sentiment Analysis**: Analyze query sentiment
3. **A/B Testing**: Compare agent versions
4. **Recommendation Engine**: Suggest optimizations
5. **Anomaly Detection**: Auto-detect unusual patterns

### Integration
1. **Slack Alerts**: Daily/weekly summaries
2. **Datadog Integration**: Export to monitoring platform
3. **BigQuery Export**: Long-term analytics storage
4. **Grafana Dashboards**: Custom visualizations
5. **PagerDuty Alerts**: Critical performance issues

---

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check database logs
4. Verify API responses
5. Contact development team

---

**Implementation Date**: 2025-10-07
**Status**: Production Ready
**Version**: 1.0.0
