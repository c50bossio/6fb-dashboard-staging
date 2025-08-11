# 🚨 MANDATORY: Supabase Production Database Rule

## Global Architecture Decision
**This web application MUST use Supabase as the production database for ALL features.**

## Why This Matters
- **Production Ready**: We're building for a REAL barbershop that will go live soon
- **No Mock Data**: Every feature must connect to real Supabase tables
- **Consistency**: Same database in development and production
- **Scalability**: Supabase handles real-world load and growth

## Absolute Rules

### ✅ ALWAYS USE
- **Supabase PostgreSQL** for all data storage
- **Supabase Auth** for authentication
- **Supabase Realtime** for live updates
- **Supabase Storage** for file uploads
- **Row Level Security (RLS)** for data protection

### ❌ NEVER USE
- **SQLite** - Not for production
- **Mock data functions** - No fake data generators
- **Local JSON files** - No hardcoded data
- **In-memory storage** - Not persistent
- **Fallback mock clients** - Must use real Supabase

## Implementation Requirements

### 1. Every API Route MUST:
```javascript
import { createClient } from '@/lib/supabase/server'

export async function GET(request) {
  const supabase = createClient()
  
  // Query real Supabase tables
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
  
  // Return real data or handle error
  if (error) throw error
  return NextResponse.json(data)
}
```

### 2. Every Component MUST:
```javascript
import { createClient } from '@/lib/supabase/client'

// Use real Supabase data
const { data } = await supabase
  .from('customers')
  .select('*')
```

### 3. Database Schema MUST:
- Be defined in Supabase dashboard
- Have proper indexes for performance
- Use RLS policies for security
- Have migrations tracked

## Current Status Check

### ✅ Already Using Supabase:
- Authentication system
- User profiles
- Basic queries in some endpoints

### ❌ NEEDS FIXING (Found Issues):
1. **lib/supabase/server.js** - Was returning mock client!
2. **Predictive Analytics** - Using undefined functions
3. **Some dashboards** - Fallback to mock data
4. **Test data** - Using SQLite instead of Supabase

## Migration Path

### Immediate Actions:
1. ✅ Fixed `lib/supabase/server.js` to use real Supabase client
2. 🔄 Updating all API endpoints to use Supabase
3. 🔄 Migrating test data from SQLite to Supabase
4. 🔄 Removing all mock data generators

### Database Tables Needed in Supabase:
```sql
-- Core tables for barbershop
CREATE TABLE appointments (...)
CREATE TABLE customers (...)
CREATE TABLE payments (...)
CREATE TABLE services (...)
CREATE TABLE barbers (...)
CREATE TABLE barbershops (...)

-- Analytics tables
CREATE TABLE business_metrics (...)
CREATE TABLE ai_insights (...)
CREATE TABLE predictive_data (...)
```

## Environment Variables Required
```env
# Supabase (REQUIRED - NO EXCEPTIONS)
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Testing with Supabase

### Development Workflow:
1. Create tables in Supabase dashboard
2. Seed with test data via Supabase SQL editor
3. Test features with real database operations
4. Deploy to production with same database structure

### NO Local Database Fallbacks:
- Don't use SQLite for "quick testing"
- Don't create mock data for "development"
- Always connect to Supabase, even locally

## Enforcement

### Code Review Checklist:
- [ ] Does it query Supabase tables?
- [ ] Are there any mock data generators?
- [ ] Is SQLite mentioned anywhere?
- [ ] Does it handle Supabase errors properly?
- [ ] Are RLS policies in place?

### Red Flags to Reject:
```javascript
// ❌ REJECT: Mock data
const mockData = { revenue: 1000, customers: 50 }

// ❌ REJECT: SQLite
import sqlite3 from 'sqlite3'

// ❌ REJECT: Fake fallback
if (!data) return generateMockData()

// ✅ ACCEPT: Real Supabase
const { data, error } = await supabase.from('table').select()
```

## Business Impact

This decision ensures:
- **Reliability**: Real database = real reliability
- **Performance**: PostgreSQL handles barbershop scale
- **Security**: RLS protects customer data
- **Speed to Market**: No migration needed for production
- **Cost Effective**: Supabase free tier handles initial load

## Summary

**Every line of code in this application must assume Supabase is the database.**

No exceptions. No fallbacks. No mock data.

We're building for a real barbershop that will serve real customers soon.

---
*Last Updated: 2025-01-11*
*Enforced Globally: YES*
*Exceptions Allowed: NONE*