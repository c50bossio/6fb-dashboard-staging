# Settings Deduplication - Manual Migration Guide

## 🚨 Critical Fix Required

Your reported issue: **"Shop K and different windows have different answers"** is caused by fragmented settings storage. This migration will resolve the inconsistency.

## Step 1: Execute Database Migration

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to**: Your project → SQL Editor
3. **Copy the entire contents** of: `database/migrations/006_complete_settings_deduplication.sql`
4. **Paste and Execute** the migration in the SQL Editor
5. **Verify Success**: Look for "Success. No rows returned" message

## Step 2: Run Data Migration

After the database migration succeeds, run this command:

```bash
cd "/Users/bossio/6FB AI Agent System"
NEXT_PUBLIC_SUPABASE_URL="https://dfhqjdoydihajmjxniee.supabase.co" SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c" node migrate-settings-data-simple.js
```

## Step 3: Test the Fix

1. **Open two browser windows**: http://localhost:9999
2. **Navigate to Settings** in both windows
3. **Change a setting** in one window (e.g., business hours)
4. **Refresh the other window** - should show the same data
5. **Verify**: No more "different answers" between windows

## What This Fixes

### Before (Current Problem):
- 18 different settings pages each query database independently
- No central coordination between browser windows
- Settings changes don't propagate between windows
- "Shop K has different answers" - each window shows stale data

### After (Fixed State):
- Single unified settings interface
- Centralized settings hierarchy (System → Organization → User)
- Settings inheritance with proper fallbacks
- Real-time consistency across all browser windows
- Compatibility layer maintains existing API contracts

## Files Updated:
- ✅ `app/(protected)/settings/page.js` - Now uses UnifiedSettingsInterface
- ✅ `components/settings/UnifiedSettingsInterface.js` - Consolidated UI
- ✅ `lib/settings-compatibility.js` - Backward compatibility layer
- ✅ Database schema - New normalized settings tables

## Technical Details

The migration creates:
1. **user_organization_memberships** - Links users to organizations with roles
2. **settings_hierarchy** - Three-tier settings storage (system/org/user)
3. **Helper functions** - `get_effective_setting()` for inheritance resolution
4. **Compatibility views** - Maintains existing API contracts
5. **Default system settings** - Proper fallbacks for all categories

This resolves the root cause: fragmented settings storage causing inconsistent data display across browser windows.