# Phase 2: Single ID System Implementation Plan

## Overview
Complete transition to a single, unified ID system using `barbershop_id` throughout the entire codebase.

## Current State
- ✅ Created getTenant() unified resolver with caching
- ✅ Updated 14 React components to use getTenant()
- ✅ Standardized 4 critical API routes
- ✅ Eliminated 14 duplicate files
- ⚠️ Database still has dual ID columns (shop_id and barbershop_id)
- ⚠️ Some API routes still reference shop_id directly

## Implementation Steps

### 1. Database Migration (Backend)
```sql
-- Already created: database/migrations/phase1_id_standardization.sql
-- Next steps:
1. Run migration to copy shop_id → barbershop_id
2. Update all foreign key references
3. Add deprecation notices to shop_id columns
4. Schedule shop_id column removal for Phase 3
```

### 2. API Route Updates (Remaining)
Files still using shop_id directly:
- /api/shop/* routes
- /api/stripe/* routes  
- /api/bookings/* routes

Strategy:
- Update all to use getTenant()
- Ensure backward compatibility during transition
- Add logging for shop_id usage to track deprecation

### 3. Frontend Component Updates
Components with booking data dual patterns (acceptable for now):
- BookingPaymentModal.js (booking.shop_id || booking.barbershop_id)
- BarberStep.js (booking context)
- CapacityPlanningPanel.js (receives as prop)
- PointsOverview.js (receives as prop)

These use booking object data, not user profiles, so they're lower priority.

### 4. Supabase RLS Policy Updates
- Update Row Level Security policies to use barbershop_id
- Ensure all policies reference the standardized column
- Test with different user roles

### 5. Testing & Validation
- Create comprehensive test suite for getTenant()
- Test all user scenarios:
  - Individual barber with shop
  - Shop owner
  - Staff member
  - Enterprise owner
- Monitor performance with caching

## Success Metrics
- Zero dual ID patterns in user profile lookups
- All API routes using getTenant()
- Database migration applied successfully
- No regression in functionality
- Performance maintained or improved

## Risk Mitigation
- Keep shop_id columns temporarily for rollback capability
- Log all ID resolution for debugging
- Implement feature flag for gradual rollout
- Maintain backward compatibility layer

## Timeline
- Week 1: Complete remaining API route updates
- Week 2: Run database migration in staging
- Week 3: Deploy to production with monitoring
- Week 4: Remove deprecated code paths

## Next Actions
1. Update remaining API routes to use getTenant()
2. Test database migration script in development
3. Create monitoring dashboard for ID resolution
4. Document new patterns for team