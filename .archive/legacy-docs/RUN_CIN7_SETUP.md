# CIN7 Integration Setup Instructions

## Quick Setup (2 minutes)

The CIN7 integration tables need to be created in your Supabase database. Here's how:

### Option 1: Supabase SQL Editor (Recommended)
1. Open your Supabase dashboard
2. Go to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `create-pos-integration-tables.sql`
5. Paste into the SQL editor
6. Click **Run** button
7. You should see "Success" message

### Option 2: Using the Setup Script
```bash
# Make sure you have your environment variables set
node setup-cin7-tables.js
```

### Option 3: Manual Table Creation
If the above options don't work, create these tables manually in Supabase Table Editor:

1. **inventory_checks** table
2. **sale_syncs** table  
3. **external_sales** table
4. **inventory_alerts** table
5. **webhook_logs** table

Then run the functions and triggers from the SQL file.

## Verification

To verify the tables were created successfully:

1. Go to Supabase Dashboard > Table Editor
2. You should see these new tables:
   - ✅ inventory_checks
   - ✅ sale_syncs
   - ✅ external_sales
   - ✅ inventory_alerts
   - ✅ webhook_logs

3. Check that the `decrement_stock` function exists:
   - Go to Database > Functions
   - Look for `decrement_stock`

## Next Steps

Once tables are created, the CIN7 integration is ready to use:
- The POS can now check inventory before sales
- Sales will sync to CIN7 automatically
- Webhooks will update stock levels in real-time
- Out-of-stock alerts will trigger automatically

## Troubleshooting

If you get permission errors:
- Make sure you're using the service role key
- Check that RLS is properly configured
- Verify your database URL is correct

If tables already exist:
- That's fine! The script uses IF NOT EXISTS
- You can safely skip this step