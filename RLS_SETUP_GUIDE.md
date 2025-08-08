# 🔒 Row Level Security (RLS) Setup Guide

## Quick Setup Instructions

Since your Supabase database is ready and working, the next step is to configure Row Level Security policies for proper multi-tenant data isolation.

### 📋 Step 1: Manual RLS Policy Setup (Recommended)

1. **Open Supabase Dashboard**
   - Go to: [https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee](https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee)
   - Navigate to: **SQL Editor**

2. **Execute RLS Policies**
   - Click **"New query"**
   - Copy the entire contents of `database/setup-rls-policies.sql`
   - Paste into the SQL editor
   - Click **"Run"** to execute all policies

### 🛡️ What These Policies Do

#### **Multi-Tenant Security**
- **Data Isolation**: Each barbershop only sees their own data
- **Role-Based Access**: Different permissions for clients, barbers, shop owners
- **Guest Bookings**: Public can create walk-in appointments
- **Staff Management**: Shop owners can manage their team and appointments

#### **User Access Patterns**

| Role | Barbershops | Barbers | Services | Appointments | Clients |
|------|-------------|---------|----------|--------------|---------|
| **PUBLIC** | View active | View available | View active | Create walk-ins | - |
| **CLIENT** | View active | View available | View active | View/edit own | Edit own profile |
| **BARBER** | View active | Edit own profile | View shop services | View/edit assigned | View shop clients |
| **SHOP_OWNER** | Manage own | Manage shop staff | Manage shop services | Manage all in shop | Manage shop clients |
| **SUPER_ADMIN** | Manage all | Manage all | Manage all | Manage all | Manage all |

#### **Key Security Features**

1. **Barbershop Isolation**
   ```sql
   -- Clients can only see data from their barbershop
   WHERE barbershop_id = user_barbershop_id
   ```

2. **Self-Management**
   ```sql
   -- Users can edit their own data
   WHERE user_id = auth.uid()
   ```

3. **Role-Based Permissions**
   ```sql
   -- Check user role for administrative access
   WHERE role IN ('SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN')
   ```

4. **Public Booking Access**
   ```sql
   -- Allow guest bookings for walk-in appointments
   WHERE is_walk_in = true AND client_id IS NULL
   ```

### 📊 Policy Summary

#### **Barbershops Table**
- ✅ Public can view active barbershops (for booking pages)
- ✅ Shop owners can manage their own barbershop
- ✅ Admins have full access

#### **Barbers Table** 
- ✅ Public can view available barbers (for booking)
- ✅ Barbers can manage their own profile
- ✅ Shop owners can manage their staff
- ✅ Role-based access control

#### **Services Table**
- ✅ Public can view active services (for booking)
- ✅ Shop owners can manage their services
- ✅ Active/inactive service filtering

#### **Appointments Table**
- ✅ Clients can view/edit their own appointments
- ✅ Barbers can view/edit assigned appointments
- ✅ Shop owners can manage all shop appointments
- ✅ Public can create walk-in appointments
- ✅ Multi-role access patterns

#### **Clients Table**
- ✅ Clients can manage their own profile
- ✅ Shop staff can view clients in their barbershop
- ✅ Shop owners can manage client data
- ✅ Privacy protection

#### **Supporting Tables**
- ✅ `appointment_history`: Audit trail with appropriate access
- ✅ `barber_availability`: Self-management + owner oversight  
- ✅ `booking_preferences`: Client self-management

### 🧪 Testing RLS Policies

After applying the policies, test with different scenarios:

#### **Test 1: Public Booking Flow**
```javascript
// Should work without authentication
const { data: barbershops } = await supabase
  .from('barbershops')
  .select('*')
  .eq('is_active', true)

const { data: barbers } = await supabase
  .from('barbers') 
  .select('*')
  .eq('is_available', true)
```

#### **Test 2: Client Access**
```javascript
// Should only see own appointments when authenticated as client
const { data: appointments } = await supabase
  .from('appointments')
  .select('*')
```

#### **Test 3: Shop Owner Access**
```javascript
// Should see all data for their barbershop when authenticated as owner
const { data: allAppointments } = await supabase
  .from('appointments')
  .select('*')
```

### ⚡ Performance Optimizations

The RLS policies include several performance optimizations:

```sql
-- Indexed columns for fast policy evaluation
CREATE INDEX idx_barbers_user_id ON barbers(user_id);
CREATE INDEX idx_clients_user_id ON clients(user_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_barber_id ON appointments(barber_id);
```

### 🔧 Helper Functions

The setup includes utility functions for common access checks:

```sql
-- Check if user manages a barbershop
user_manages_barbershop(barbershop_uuid UUID)

-- Check if user is a barber at a barbershop  
user_is_barber_at(barbershop_uuid UUID)
```

### 📝 Next Steps After RLS Setup

1. **✅ Apply RLS Policies** (via Supabase Dashboard SQL Editor)
2. **🧪 Test Multi-Tenant Access** (different user roles)
3. **👥 Set Up User Authentication** (registration + role assignment)
4. **🔧 Configure Calendar with Authentication** (real user sessions)
5. **📊 Test Data Isolation** (ensure barbershops can't see each other's data)

### 🚨 Important Security Notes

- **Service Role Key**: Only use for administrative operations
- **Anonymous Key**: Use for public booking pages
- **User Sessions**: Always validate user permissions in API routes
- **Data Validation**: RLS policies work with proper authentication
- **Testing**: Test with actual user sessions, not just service role

### 🎯 Benefits of This RLS Setup

✅ **Multi-Tenant Security**: Complete data isolation between barbershops  
✅ **Scalable Architecture**: Support for multiple barbershops on one database  
✅ **Role-Based Access**: Granular permissions for different user types  
✅ **Guest Bookings**: Public can book appointments without registration  
✅ **Staff Management**: Shop owners can manage their team efficiently  
✅ **Audit Trail**: Complete history tracking with appropriate access  
✅ **Performance**: Optimized queries with proper indexing  

Your calendar booking system now has enterprise-grade security! 🚀