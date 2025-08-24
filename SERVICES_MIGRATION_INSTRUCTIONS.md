# Services Feature Migration Instructions

## Current Status ✅
The services page is now working again! Services can be loaded, added, edited, and deleted without errors.

## What Was Fixed
1. **Removed references to non-existent database columns**
   - The code was trying to use columns that don't exist in the database
   - Fixed by only using columns that actually exist

2. **Current Working Columns**
   - `id` - Service unique identifier
   - `shop_id` - Links to barbershop
   - `name` - Service name
   - `description` - Service description
   - `category` - Service category (haircut, beard, combo, etc.)
   - `price` - Service price
   - `duration_minutes` - Service duration
   - `is_active` - Whether service is active
   - `is_test` - Test flag
   - `created_at` - Creation timestamp
   - `updated_at` - Update timestamp

3. **Temporarily Disabled Features**
   - Image upload UI (commented out)
   - Featured service checkbox (commented out)
   - Online booking enabled checkbox (commented out)
   - Requires consultation checkbox (commented out)

## How to Add Missing Features Back

### Option 1: Quick Migration (Recommended)
Run this SQL in your Supabase SQL Editor:

```sql
-- Add image support
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS image_metadata JSONB DEFAULT '{}';

-- Add feature flags
ALTER TABLE services
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS online_booking_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_consultation BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_services_has_image 
ON services((image_url IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_services_featured
ON services(is_featured) WHERE is_featured = true;
```

### Option 2: Full Migration File
Run the complete migration file:
```bash
# In Supabase SQL Editor, run:
database/migrations/007_add_service_images.sql
```

### Option 3: Quick Apply Script
Use the ready-made script:
```bash
# Run the quick migration script
apply-service-images-migration.sql
```

## After Migration

Once you've added the columns to the database, uncomment these sections in `/app/(protected)/shop/services/page.js`:

1. **Lines 899-906**: Service Image Upload component
2. **Lines 959-987**: Featured, online booking, and consultation checkboxes
3. **Lines 197-213**: Add image_url and other fields back to serviceData
4. **Lines 287-303**: Add fields back to quick pack template data

## Testing After Migration

Run this test to verify everything works:

```bash
node test-service-images.js
```

## Current Workaround
The system works perfectly without these features. You can:
- ✅ Add services
- ✅ Edit services
- ✅ Delete services
- ✅ Use quick start pack
- ✅ Toggle active/inactive
- ✅ Set prices and durations
- ✅ Categorize services

## Future Enhancements
When ready to add the advanced features:
1. Run the migration to add columns
2. Uncomment the UI components
3. Test with `test-service-images.js`
4. Enjoy image uploads and feature flags!

---
**Note**: The code is already prepared for these features. They're just commented out to prevent errors until the database is updated.