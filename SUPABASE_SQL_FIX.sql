-- ================================================
-- FIX FOR DELETE EVENTS IN REAL-TIME SUBSCRIPTIONS
-- ================================================
-- Run this in Supabase Dashboard SQL Editor
-- Project: dfhqjdoydihajmjxniee

-- Step 1: Enable full row data for DELETE events
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Step 2: Verify the change was applied successfully
SELECT 
    schemaname AS schema,
    tablename AS table,
    CASE relreplident
        WHEN 'd' THEN '❌ default (primary key only)'
        WHEN 'n' THEN '❌ nothing'
        WHEN 'f' THEN '✅ FULL (all columns)'
        WHEN 'i' THEN '⚠️ index'
    END AS replica_identity_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
    AND tablename = 'bookings';

-- Expected output:
-- schema | table    | replica_identity_status
-- -------+----------+-------------------------
-- public | bookings | ✅ FULL (all columns)

-- ================================================
-- WHAT THIS FIXES:
-- ================================================
-- Before: DELETE events only include 'id' in the payload
-- After:  DELETE events include ALL columns (shop_id, customer_name, etc.)
-- 
-- This allows real-time subscriptions to properly filter
-- DELETE events by shop_id and access all appointment data
-- ================================================