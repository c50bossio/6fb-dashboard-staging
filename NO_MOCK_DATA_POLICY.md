# 🚨 NO MOCK DATA POLICY - STRICTLY ENFORCED

## Absolute Rule
**This application NEVER uses mock data. All data must come from real database operations.**

## Why This Policy Exists

### Performance Impact
- **Mock data generation causes 10+ second loading delays**
- **Real database queries are sub-second and much faster**
- **Complex mock object generation blocks the UI thread**
- **Multiple mock generators compound loading time**

### Data Integrity
- **Mock data doesn't reflect real database constraints**
- **Business logic validation fails with fake data**
- **Real queries ensure proper data relationships**
- **Database indexes and optimization work with real data**

### Development Quality
- **Mock data hides implementation gaps**
- **Forces proper database schema design**
- **Ensures complete feature implementation**
- **Prevents shortcuts that cause production issues**

## Prohibited Practices ❌

```javascript
// ❌ NEVER DO THIS
const generateMockMetrics = () => ({
  revenue: 145000,
  customers: 1210,
  // ... hardcoded fake data
})

// ❌ NEVER DO THIS  
const fallbackData = mockInsights.length > 0 ? mockInsights : generateMockData()

// ❌ NEVER DO THIS
if (apiError) {
  return { data: FAKE_PLACEHOLDER_DATA }
}
```

## Required Practices ✅

```javascript
// ✅ ALWAYS DO THIS - Real database queries
const getBusinessMetrics = async () => {
  const { data, error } = await supabase
    .from('business_metrics')
    .select('*')
    .order('date', { ascending: false })
    .limit(30)
  
  return { data: data || [], error }
}

// ✅ ALWAYS DO THIS - Handle empty results gracefully
const metrics = await getBusinessMetrics()
if (!metrics.data.length) {
  return { message: 'No metrics available', data: [] }
}
```

## Implementation Requirements

### 1. Database First Approach
- **Create missing tables** with proper SQL schema
- **Add proper indexes** for query performance
- **Use database constraints** for data validation
- **Implement proper relationships** between tables

### 2. Seed Realistic Test Data
```sql
-- ✅ Use real database operations
INSERT INTO business_metrics (date, revenue, customers, satisfaction) 
VALUES 
  ('2025-01-01', 1450.00, 12, 4.5),
  ('2025-01-02', 1680.00, 14, 4.7),
  ('2025-01-03', 1320.00, 11, 4.3);
```

### 3. API Endpoint Requirements
Every API endpoint MUST:
- **Query actual database tables**
- **Return real data or empty arrays**
- **Handle database errors properly**
- **Include proper error messages**
- **Never fall back to mock data**

### 4. Frontend Requirements
UI components MUST:
- **Handle loading states** during database queries
- **Show empty states** when no data exists
- **Display error messages** for failed queries
- **Never show fake placeholder data**

## Code Review Checklist

❌ **Immediate rejection if found:**
- Any `generateMock*()` functions
- Hardcoded fallback data objects
- `const mockData = {...}`
- Comments like `// TODO: replace with real data`

✅ **Required for approval:**
- Database table creation scripts
- Real SQL queries in API endpoints
- Proper error handling for empty results
- Loading states in UI components

## Performance Guidelines

### Database Query Optimization
- **Use proper SQL indexes** for fast queries
- **Implement pagination** for large datasets
- **Cache frequent queries** with short TTL
- **Optimize N+1 query problems**

### Frontend Optimization
- **Show skeleton screens** during loading
- **Implement progressive loading** for complex data
- **Use React.memo** for expensive components
- **Debounce search/filter inputs**

## Emergency Procedures

### If Database is Down
- **Show appropriate error message**
- **Provide retry functionality**
- **Log the error for debugging**
- **Never fall back to mock data**

### If Table Doesn't Exist
1. **Create the table** with proper schema
2. **Add necessary indexes**
3. **Seed with realistic test data**
4. **Update documentation**

### If Data is Missing
1. **Check database connection**
2. **Verify table existence**
3. **Seed test data if needed**
4. **Show empty state in UI**

## Enforcement

This policy is **non-negotiable** and will be:
- **Enforced in code reviews**
- **Checked in CI/CD pipelines**
- **Monitored in production**
- **Required for feature completion**

**Any mock data found in the codebase indicates incomplete implementation and must be replaced with real database operations immediately.**