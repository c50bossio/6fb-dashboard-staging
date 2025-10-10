# Agent Performance Dashboard - Quick Start Guide

## Access the Dashboard

**URL**: `http://localhost:9999/admin/agent-performance` (development)
**Production**: `/admin/agent-performance`

---

## Setup (First Time Only)

### 1. Create Database Table
```bash
# Apply the schema
psql $DATABASE_URL -f database/agent-performance-schema.sql

# Or using Supabase CLI
supabase db push
```

### 2. Verify Installation
Visit the dashboard URL. You should see:
- 4 overview cards (may show zeros)
- Empty charts with "No data" messages
- Empty performance table

### 3. Generate Test Data
Send some queries to the AI chat:
```
- "How much revenue did I make this month?"
- "Show me my top customers"
- "What are my most popular services?"
```

### 4. Refresh Dashboard
Click the "Refresh" button or reload the page. You should now see data.

---

## Dashboard Overview

### Overview Cards (Top Row)
1. **Total Queries** - How many AI queries were made
2. **Total Cost** - Total cost in USD
3. **Avg Response Time** - Average time in seconds
4. **Most Used Agent** - Which agent handled most queries

### Charts (2 Rows)
**Row 1:**
- **Agent Usage** - Bar chart showing queries per agent
- **Cost Timeline** - Line chart showing daily costs

**Row 2:**
- **Response Time** - Histogram of response times
- **Handoff Flow** - Visual flow of agent handoffs

### Performance Table (Bottom)
- Full query log with sorting, filtering, and export

---

## Common Tasks

### Filter by Date Range
1. Click date range dropdown (top right)
2. Select: 7 days, 30 days, 60 days, or 90 days
3. Dashboard auto-refreshes

### Filter by Agent
**Method 1: From Chart**
1. Click any bar in the Agent Usage chart
2. Dashboard filters to show only that agent
3. Click "Clear Filter" to reset

**Method 2: From Table**
1. Use the "Agent" dropdown in table filters
2. Select an agent
3. Table updates automatically

### Search Queries
1. Use search box in Performance Table
2. Type any part of query text
3. Table filters in real-time

### Export Data
1. Click "Export CSV" button (top right of table)
2. CSV downloads with current filters applied
3. Open in Excel, Google Sheets, etc.

### View Query Details
1. Click any row in Performance Table
2. Modal shows full details:
   - Complete query text
   - Agent used
   - Response time
   - Tokens used
   - Cost
   - Handoffs (if any)
   - Error message (if failed)

---

## Understanding Metrics

### Response Time Colors
- **Green** (<5s): Excellent performance
- **Blue** (5-10s): Good performance
- **Amber** (10-15s): Acceptable
- **Orange** (15-20s): Slow
- **Red** (>20s): Very slow

### Success Rate
- **>95%**: Excellent
- **90-95%**: Good
- **<90%**: Needs attention

### Cost Per Query
- **<$0.01**: Very efficient
- **$0.01-$0.05**: Normal
- **>$0.05**: Review for optimization

### Agent Usage
- **Balanced**: Good distribution across agents
- **Heavily skewed**: May indicate query routing issues
- **Single agent dominance**: Check if correct agent is being used

---

## Troubleshooting

### "No data available"
**Cause**: No queries logged yet
**Fix**: Send queries to AI chat, then refresh

### Charts not loading
**Cause**: Missing data or API error
**Fix**:
1. Check browser console for errors
2. Verify database connection
3. Refresh page

### Export not working
**Cause**: Browser download blocked
**Fix**: Allow downloads in browser settings

### Slow dashboard
**Cause**: Too much data
**Fix**:
1. Reduce date range
2. Apply filters
3. Refresh materialized view in database

---

## Best Practices

### Daily Monitoring
- Check success rate (should be >95%)
- Review cost trends (look for spikes)
- Monitor response times (should be <15s avg)
- Check for errors in table

### Weekly Analysis
- Review agent usage distribution
- Identify slow queries for optimization
- Export data for deeper analysis
- Check handoff patterns

### Monthly Review
- Analyze cost trends
- Compare month-over-month performance
- Identify optimization opportunities
- Review agent efficiency

---

## Quick Reference: API Endpoints

### Get Metrics
```javascript
fetch('/api/admin/agent-performance/metrics?days=30')
```

### Get Query Logs
```javascript
fetch('/api/admin/agent-performance/queries?page=1&per_page=20')
```

### Get Handoff Data
```javascript
fetch('/api/admin/agent-performance/handoffs?days=30')
```

### Export CSV
```javascript
fetch('/api/admin/agent-performance/queries?export=true')
```

---

## Keyboard Shortcuts (Table)
- **Search**: Type to filter
- **Tab**: Navigate between filters
- **Click row**: View details
- **Esc**: Close modal

---

## Support

**Need help?**
1. Read full documentation: `AGENT_PERFORMANCE_DASHBOARD.md`
2. Check browser console for errors
3. Verify database schema is applied
4. Contact development team

---

**Quick Start Version**: 1.0
**Last Updated**: 2025-10-07
