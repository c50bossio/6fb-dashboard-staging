# 🚫 NO MOCK DATA POLICY - ENFORCED BY GIT HOOKS

This repository enforces a **ZERO TOLERANCE** policy for mock, fake, or hardcoded data outside of testing contexts.

## 🎯 Policy Overview

**MANDATORY**: This application MUST use real database operations for ALL features. We are building for a REAL barbershop going live soon.

### ✅ Required Practices
- **USE SUPABASE ONLY**: PostgreSQL via Supabase for all data storage
- **REAL DATABASE QUERIES**: Every API call must query actual database tables
- **CREATE MISSING TABLES**: If table doesn't exist, create proper SQL schema
- **SEED REALISTIC DATA**: Use database INSERT statements, never hardcoded objects
- **EMPTY STATES**: Show loading/empty UI states when no data exists

### ❌ Prohibited Practices
- **NO MOCK DATA GENERATORS**: Never create `generateMock*()` functions
- **NO FALLBACK MOCK DATA**: APIs must query database, not return hardcoded data
- **NO HARDCODED OBJECTS**: No `const users = [...]` or similar patterns
- **NO FAKE PLACEHOLDERS**: No placeholder data that "looks real"

## 🔒 Enforcement via Git Hooks

A pre-commit hook automatically scans all staged files for mock data violations:

### Detected Patterns
```javascript
// ❌ These patterns will BLOCK commits:
generateMock*
mockData
fakeData
MOCK_*
FAKE_*
const mockUsers = [...]
function generateFakeData()
export const mockResponse
hardcoded.*data
placeholder.*data
dummy.*data
mockUser
fakeUser
mockProfile
stubData
```

### Allowed Locations
Mock data is ONLY permitted in:
- `__tests__/` directories
- `.test.js` and `.spec.js` files
- `stories/` and `.stories.js` files (Storybook)
- `cypress/` and `e2e/` test directories
- `fixtures/` and `__mocks__/` directories
- Documentation files

## 💡 Correct Implementation Examples

### ❌ WRONG - Mock Data (Will be blocked)
```javascript
// This will BLOCK your commit
const mockUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
]

function getUsersAPI() {
  return { data: mockUsers, error: null }
}
```

### ✅ CORRECT - Real Database Operations
```javascript
// This is the correct approach
async function getUsersAPI() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .limit(10)

  return { data, error }
}
```

### ❌ WRONG - Hardcoded Return Data
```javascript
// This will BLOCK your commit
function getBarbers() {
  return [
    { id: 'barber1', name: 'Mike', specialties: ['fade'] },
    { id: 'barber2', name: 'Sarah', specialties: ['color'] }
  ]
}
```

### ✅ CORRECT - Database Query
```javascript
// This is the correct approach
async function getBarbers() {
  const { data, error } = await supabase
    .from('barbershop_staff')
    .select('id, full_name, specialties')
    .eq('role', 'barber')

  if (error) throw error
  return data
}
```

## 🛠️ When Database is Empty

### ❌ WRONG - Generate Mock Data
```javascript
// DON'T DO THIS - creates fake data
function generateTestData() {
  return Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`
  }))
}
```

### ✅ CORRECT - Database Seed Script
```sql
-- Create proper seed data in database
INSERT INTO profiles (id, full_name, email, role) VALUES
  ('user-1', 'John Smith', 'john@barbershop.com', 'CLIENT'),
  ('user-2', 'Sarah Johnson', 'sarah@barbershop.com', 'BARBER'),
  ('user-3', 'Mike Davis', 'mike@barbershop.com', 'SHOP_OWNER');
```

## 🔧 Testing the Hook

Test the pre-commit hook by trying to commit mock data:

```bash
# This should be BLOCKED by the hook
echo "const mockData = [{ id: 1, name: 'test' }]" > test-file.js
git add test-file.js
git commit -m "test mock data" # Will be rejected

# Clean up
git reset HEAD test-file.js
rm test-file.js
```

## 📋 Bypass Emergency Procedure

**ONLY in extreme emergencies**, you can bypass the hook:

```bash
git commit --no-verify -m "Emergency commit"
```

**⚠️ WARNING**: This should NEVER be used except for critical production fixes. Any bypassed commits must be immediately followed by a commit that removes the mock data.

## 🎯 Benefits of This Policy

1. **Production Ready**: Every feature works with real data from day one
2. **Performance**: No fake data generation causing loading delays
3. **Data Integrity**: Consistent behavior with actual database operations
4. **Real Testing**: Tests run against realistic data scenarios
5. **No Surprises**: What works in development works in production

## 🚨 Violation Response

If the hook blocks your commit:

1. **Identify the violation**: Check the error message for specific patterns
2. **Replace with database operations**: Use Supabase queries instead
3. **Create seed data**: If you need test data, add it to the database
4. **Move to test files**: If truly needed for testing, move to `__tests__/`

## 📞 Support

If you encounter issues with the hook or need clarification:

1. Check this document first
2. Review `SUPABASE_PRODUCTION_RULE.md` for complete database guidelines
3. Look at existing code examples that pass the hook
4. Ask team members for guidance on proper database patterns

## 🎉 Hook Success

When your commit passes the hook, you'll see:
```
🔍 Checking for mock data violations...
✅ No mock data violations found. Commit approved!
```

This confirms your code follows production-ready patterns and will work reliably with real Supabase data.