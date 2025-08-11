-- Fix DELETE events for real-time subscriptions
-- Run this in Supabase SQL Editor

-- Enable REPLICA IDENTITY FULL for the bookings table
-- This ensures DELETE events include all column data in the 'old' payload
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

-- Verify the change
SELECT 
    schemaname,
    tablename,
    CASE relreplident
        WHEN 'd' THEN 'default (primary key)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full (all columns)'
        WHEN 'i' THEN 'index'
    END AS replica_identity
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
    AND tablename = 'bookings';

-- Expected output should show: 'full (all columns)'