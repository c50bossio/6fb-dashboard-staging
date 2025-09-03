# Temporary RLS Bypass for Development

## 406 Error Quick Fix Options

### Option 1: Run the SQL Fix (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-406-errors.sql`  
4. Run the script
5. The 406 errors should be resolved immediately

### Option 2: Use Service Role Client for Development (Temporary)
If the SQL fix doesn't work, you can temporarily modify the shop settings page to use the service role client which bypasses RLS:

In `/app/(protected)/shop/settings/general/page.js`, change line 18 from:
```javascript
const _supabase = createClient()
```

To:
```javascript
const _supabase = typeof window === 'undefined' ? 
  await createServiceRoleClient() : 
  createClient()
```

And add this import at the top:
```javascript
import { createClient, createServiceRoleClient } from '@/lib/supabase/UNIFIED_CLIENT'
```

**WARNING**: This is only for development. Do not use service role client in production as it bypasses all security.

### Option 3: Check Environment Variables
Ensure your `.env.local` has the correct service role key:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmaHFqZG95ZGloYWptanhuaWVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDA4NzAxMCwiZXhwIjoyMDY5NjYzMDEwfQ.fv9Av9Iu1z-79bfIAKEHSf1OCxlnzugkBlWIH8HLW8c
```

This key is already in your `.env.local` file.

## Root Cause
The 406 errors occur because:
1. Row Level Security policies are too restrictive
2. The user `c50bossio@gmail.com` may not have proper database associations
3. The frontend client-side auth doesn't have sufficient permissions

## Next Steps
1. Try Option 1 first (SQL fix)
2. If that doesn't work, try Option 2 (service role bypass)  
3. Once working, we can refine the RLS policies for proper security