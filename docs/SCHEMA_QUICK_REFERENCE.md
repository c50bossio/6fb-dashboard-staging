# Schema Standards - Quick Reference Card

> **⚡ Quick lookup for field names** | Full docs: [SCHEMA_STANDARDS.md](./SCHEMA_STANDARDS.md)

## 🎯 The Golden Rules

1. **ALWAYS** use `barbershop_id` (never `shop_id`)
2. **ALWAYS** use `client_*` fields (never `customer_*`)
3. **ALWAYS** use `scheduled_at` for appointments (never `start_time`)
4. **ALWAYS** use `full_name` and `avatar_url` in profiles

---

## 📋 Field Name Cheat Sheet

### Critical Fields

| Purpose | ✅ USE THIS | ❌ NOT THIS |
|---------|-------------|-------------|
| Barbershop ID | `barbershop_id` | `shop_id` |
| Client ID | `client_id` | `customer_id` |
| Client Name | `client_name` | `customer_name` |
| Appointment Time | `scheduled_at` | `start_time` |
| Duration | `duration_minutes` | `end_time` |
| Profile Name | `full_name` | `name` |
| Profile Image | `avatar_url` | `image_url` |

### Query Patterns

```javascript
// ✅ CORRECT
.eq('barbershop_id', id)
.select('client_id, client_name, scheduled_at, duration_minutes')

// ❌ WRONG
.eq('shop_id', id)
.select('customer_id, customer_name, start_time, end_time')
```

---

## 🚨 Most Common Mistakes

### 1. Using shop_id Instead of barbershop_id

```javascript
// ❌ WRONG - Returns empty results
const shopId = profile?.shop_id;
query.eq('shop_id', shopId);

// ✅ CORRECT
const shopId = profile?.barbershop_id;
query.eq('barbershop_id', shopId);
```

### 2. Fallback Pattern with shop_id

```javascript
// ❌ WRONG - shop_id has stale data
const id = profile?.shop_id || profile?.barbershop_id;

// ✅ CORRECT - Just use barbershop_id
const id = profile?.barbershop_id;
```

### 3. Using Old Customer Fields

```javascript
// ❌ WRONG
appointment.customer_name
appointment.customer_email
appointment.customer_id

// ✅ CORRECT
appointment.client_name
appointment.client_email
appointment.client_id
```

---

## 🔍 Debugging Empty Results?

If your query returns no data:

```javascript
// Check 1: Are you using shop_id? Change to barbershop_id
.eq('shop_id', id)        // ❌ WRONG
.eq('barbershop_id', id)  // ✅ CORRECT

// Check 2: Are you using customer_*? Change to client_*
.select('customer_name')  // ❌ WRONG
.select('client_name')    // ✅ CORRECT

// Check 3: Are you using start_time? Change to scheduled_at
.gte('start_time', date)  // ❌ WRONG
.gte('scheduled_at', date) // ✅ CORRECT
```

---

## 📊 Tables to Watch

### ⚠️ These have BOTH shop_id and barbershop_id (use barbershop_id!)

- `appointment_records`
- `customers`
- `profiles` ⚠️ **Most critical!**
- `services`

### 🚫 These have ONLY shop_id (legacy - avoid if possible)

- `barbers` (use `profiles` + `barbershop_staff`)
- `inventory` (use `barbershop_inventory`)
- Legacy tables: `invoice_history`, `payout_history`, etc.

---

## 💡 Copy-Paste Examples

### Get User's Barbershop

```javascript
// ✅ CORRECT
const { data: profile } = await supabase
  .from('profiles')
  .select('id, full_name, barbershop_id, avatar_url')
  .eq('id', userId)
  .single();

const shopId = profile.barbershop_id; // ✅
```

### Query Appointments

```javascript
// ✅ CORRECT
const { data } = await supabase
  .from('appointments')
  .select(`
    id,
    scheduled_at,
    duration_minutes,
    client_id,
    client_name,
    barbershop_id,
    client:profiles!client_id(full_name, avatar_url),
    barber:profiles!barber_id(full_name, avatar_url)
  `)
  .eq('barbershop_id', shopId)
  .gte('scheduled_at', startDate);
```

### Create Appointment

```javascript
// ✅ CORRECT
const { data } = await supabase
  .from('appointments')
  .insert({
    barbershop_id: shopId,
    client_id: clientId,
    client_name: name,
    client_email: email,
    barber_id: barberId,
    scheduled_at: appointmentTime,
    duration_minutes: 30,
    status: 'SCHEDULED'
  });
```

---

## 🔗 Related Docs

- **[Full Schema Standards](./SCHEMA_STANDARDS.md)** - Complete reference
- **[Field Mapping Reference](./FIELD_MAPPING_REFERENCE.md)** - Migration guide
- **[Migration Report](/MIGRATION_FINAL_REPORT.md)** - What changed and why

---

**💡 Pro Tip**: When in doubt, check the full [SCHEMA_STANDARDS.md](./SCHEMA_STANDARDS.md) doc. It has troubleshooting guides and detailed explanations.

*Last Updated: October 10, 2025*
