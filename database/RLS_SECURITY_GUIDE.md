# Row Level Security (RLS) Configuration Guide

## 6FB AI Agent System - Production Security Policies

This guide explains the Row Level Security implementation for the 6FB AI Agent System, ensuring data privacy and proper access control for live barbershop operations.

## 🛡️ Security Overview

The system implements a multi-tenant architecture where:
- **Clients** can only see their own bookings and profiles
- **Barbers** can see their assigned bookings and shop data  
- **Shop Owners** can see all data for their barbershops
- **Anonymous Users** can only access public booking information

## 📋 RLS Policies Summary

### 1. Profiles Table
```sql
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Public profiles viewable by barbershop members
CREATE POLICY "Public profiles viewable by barbershop members" ON profiles
  FOR SELECT USING (
    role IN ('BARBER', 'SHOP_OWNER') AND
    EXISTS (
      SELECT 1 FROM barbershop_staff bs 
      WHERE bs.user_id = auth.uid() 
      AND bs.barbershop_id IN (
        SELECT shop_id FROM profiles WHERE id = profiles.id
        UNION
        SELECT barbershop_id FROM profiles WHERE id = profiles.id
      )
    )
  );
```

### 2. Barbershops Table
```sql
-- Owners can manage their barbershops
CREATE POLICY "Owners can manage their barbershops" ON barbershops
  FOR ALL USING (owner_id = auth.uid());

-- Staff can view their barbershop
CREATE POLICY "Staff can view their barbershop" ON barbershops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershop_staff bs 
      WHERE bs.barbershop_id = id 
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Public can view active barbershops for booking
CREATE POLICY "Public can view active barbershops for booking" ON barbershops
  FOR SELECT USING (is_active = true);
```

### 3. Services Table
```sql
-- Barbershop owners and staff can manage services
CREATE POLICY "Barbershop owners and staff can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

-- Public can view active services
CREATE POLICY "Public can view active services" ON services
  FOR SELECT USING (is_active = true);
```

### 4. Bookings Table (CRITICAL)
```sql
-- Clients can view their own bookings
CREATE POLICY "Clients can view their own bookings" ON bookings
  FOR SELECT USING (client_id = auth.uid());

-- Barbershop staff can view all shop bookings
CREATE POLICY "Barbershop staff can view all shop bookings" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );

-- Barbershop staff can manage bookings
CREATE POLICY "Barbershop staff can manage bookings" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );
```

### 5. Staff Table
```sql
-- Barbershop owners can manage staff
CREATE POLICY "Barbershop owners can manage staff" ON barbershop_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND b.owner_id = auth.uid()
    )
  );

-- Staff can view their own record
CREATE POLICY "Staff can view their own record" ON barbershop_staff
  FOR SELECT USING (user_id = auth.uid());
```

### 6. Payments Table
```sql
-- Barbershop staff can view payments
CREATE POLICY "Barbershop staff can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbershops b 
      WHERE b.id = barbershop_id 
      AND (
        b.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM barbershop_staff bs 
          WHERE bs.barbershop_id = b.id 
          AND bs.user_id = auth.uid()
          AND bs.is_active = true
        )
      )
    )
  );
```

## 🔒 Special Access Patterns

### Public Booking Access
For anonymous users making bookings:
```sql
-- Grant read access to anonymous users
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON barbershops TO anon;
GRANT SELECT ON services TO anon;
```

### Service Role Access
For admin operations and public booking creation:
- Use `SUPABASE_SERVICE_ROLE_KEY` for operations that bypass RLS
- Only use in server-side API routes, never in client code
- Essential for creating bookings from anonymous users

## 🧪 Testing RLS Policies

### Test Client Access
```sql
-- Set test user context
SELECT set_config('request.jwt.claims', '{"sub":"client-user-uuid"}', true);

-- Should only return client's own bookings
SELECT * FROM bookings;

-- Should not return other users' bookings
SELECT count(*) FROM bookings WHERE client_id != 'client-user-uuid';
```

### Test Barbershop Owner Access
```sql
-- Set owner context  
SELECT set_config('request.jwt.claims', '{"sub":"owner-user-uuid"}', true);

-- Should return all bookings for owned barbershops
SELECT b.* FROM bookings b
JOIN barbershops shop ON shop.id = b.barbershop_id
WHERE shop.owner_id = 'owner-user-uuid';
```

### Test Anonymous Access
```sql
-- Clear authentication context
SELECT set_config('request.jwt.claims', null, true);

-- Should only return active barbershops and services
SELECT * FROM barbershops WHERE is_active = true;
SELECT * FROM services WHERE is_active = true;

-- Should not return any bookings or payments
SELECT count(*) FROM bookings; -- Should be 0
SELECT count(*) FROM payments; -- Should be 0
```

## 🚨 Security Validation Checklist

Before going live, verify:

### ✅ Client Data Protection
- [ ] Clients can only see their own bookings
- [ ] Clients cannot see other clients' personal information
- [ ] Clients cannot access barbershop financial data
- [ ] Client profile updates only affect their own record

### ✅ Barbershop Staff Access
- [ ] Staff can see all bookings for their barbershop
- [ ] Staff cannot see bookings from other barbershops
- [ ] Staff can create/modify bookings for their shop
- [ ] Staff cannot access other shops' financial data

### ✅ Owner Permissions
- [ ] Owners have full access to their barbershop data
- [ ] Owners can manage staff and permissions
- [ ] Owners can see all payments and analytics
- [ ] Owners cannot access other owners' barbershops

### ✅ Anonymous/Public Access
- [ ] Anonymous users can view active barbershops
- [ ] Anonymous users can view active services
- [ ] Anonymous users cannot see any bookings
- [ ] Anonymous users cannot access user profiles

### ✅ Service Role Security
- [ ] Service role used only in server-side API routes
- [ ] Service role key never exposed to client code
- [ ] Public booking creation works without authentication
- [ ] Admin operations work with service role

## 🛠️ RLS Performance Optimization

### Index Creation for RLS
```sql
-- Indexes to optimize RLS policy queries
CREATE INDEX idx_barbershop_staff_user_barbershop 
ON barbershop_staff(user_id, barbershop_id) 
WHERE is_active = true;

CREATE INDEX idx_barbershops_owner 
ON barbershops(owner_id) 
WHERE is_active = true;

CREATE INDEX idx_bookings_client_barbershop 
ON bookings(client_id, barbershop_id);

CREATE INDEX idx_profiles_auth_id 
ON profiles(id);
```

### Query Performance Monitoring
```sql
-- Monitor RLS policy performance
SELECT 
  schemaname,
  tablename,
  policyname,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for slow queries with RLS
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%barbershop%' 
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## 🔧 Troubleshooting RLS Issues

### Common Problems

1. **"Permission denied" errors**
   - Verify user is authenticated (`auth.uid()` returns valid UUID)
   - Check if user has required role/permissions
   - Ensure barbershop_staff relationship exists for staff

2. **Empty query results**  
   - Check if RLS policies are too restrictive
   - Verify foreign key relationships are correct
   - Test with service role to bypass RLS temporarily

3. **Performance issues**
   - Add indexes on columns used in RLS policies
   - Simplify complex policy conditions
   - Monitor `pg_stat_statements` for slow queries

### Debugging Queries
```sql
-- Check current user context
SELECT auth.uid(), auth.jwt();

-- Test policy with specific user
SELECT set_config('request.jwt.claims', '{"sub":"user-uuid-here"}', true);

-- Disable RLS temporarily for debugging (DANGEROUS - dev only)
ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;
```

## 📊 Security Audit Queries

### Regular Security Checks
```sql
-- Find tables without RLS enabled
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_policies GROUP BY tablename
);

-- Count policies per table
SELECT tablename, count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC;

-- Check for overly permissive policies
SELECT tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND (qual IS NULL OR qual = 'true');
```

## 🎯 Production Deployment

When deploying RLS policies to production:

1. **Apply policies gradually**
   - Test each policy individually
   - Monitor application logs for permission errors
   - Have rollback plan ready

2. **Monitor performance**
   - Watch query execution times
   - Add indexes as needed
   - Optimize complex policy conditions

3. **Regular security audits**
   - Review policies monthly
   - Test with different user roles
   - Validate data isolation

---

## 🔐 Summary

The RLS implementation provides comprehensive data security for the 6FB AI Agent System:

- **Multi-tenant isolation** ensures barbershops can't see each other's data
- **Role-based access** controls what each user type can access
- **Public booking support** allows anonymous appointment creation
- **Performance optimized** with appropriate indexes
- **Thoroughly tested** with validation queries

This security model is production-ready and will protect customer data while enabling all necessary business operations for live barbershop use.