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
        WHEN 'd' THEN 'default (primary key only)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'FULL (all columns)'
        WHEN 'i' THEN 'index'
    END AS replica_identity_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
    AND tablename = 'bookings';