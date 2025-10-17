# Supabase Migration Required

## Current Issue
The application is configured to use a Supabase project (`dfhqjdoydihajmjxniee`) that appears to be:
- Either inactive/deleted
- Or has invalid/expired credentials
- Causing 401 (Unauthorized) errors throughout the application

## Temporary Fixes Applied
1. **Analytics Disabled**: Modified `/lib/internal-analytics.js` to skip analytics when invalid project detected
2. **Onboarding Progress**: Updated `/app/api/onboarding/save-progress/route.js` to skip analytics for old project
3. **Error Handling**: Enhanced `/lib/supabase/client.js` to handle missing configurations gracefully

## Permanent Solution Required

### Option 1: Create New Supabase Project
1. Go to https://supabase.com and create a new project
2. Update environment variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
   ```
3. Run database migrations from `/database` folder
4. Update `.mcp.json` with new project reference

### Option 2: Use Local Development Database
1. Install Supabase CLI: `npm install -g supabase`
2. Initialize local project: `supabase init`
3. Start local services: `supabase start`
4. Update `.env.local` with local URLs

### Option 3: Mock Mode for Development
The application has been modified to work without a database connection, but functionality will be limited.

## Files Modified for Compatibility
- `/lib/internal-analytics.js` - Added disabled flag for invalid projects
- `/app/api/onboarding/save-progress/route.js` - Skip analytics for old project
- `/lib/supabase/client.js` - Graceful error handling
- `.env.local` - Uncommented NEXT_PUBLIC_SUPABASE_ANON_KEY

## Testing After Migration
1. Update all environment variables
2. Run `npm run build` to verify no build errors
3. Test authentication flow
4. Verify database operations work
5. Check analytics tracking is restored

## References
- Old Project ID: `dfhqjdoydihajmjxniee`
- Supabase Dashboard: https://supabase.com/dashboard
- Local Development: https://supabase.com/docs/guides/cli/local-development