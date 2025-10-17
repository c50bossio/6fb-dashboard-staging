-- Robust fix for RLS policies - handles NULL values properly
-- The issue: profiles can have shop_id OR barbershop_id (or both), and NULL checks fail
-- Solution: Use COALESCE to get the first non-NULL value

-- Drop existing policies
DROP POLICY IF EXISTS "Shop owners can manage their shop exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Barbers can manage their own exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Public can view exceptions for booking" ON public.schedule_exceptions;

-- Create robust policies that handle NULL values properly
CREATE POLICY "Shop owners can manage their shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barbershop_id IN (
      SELECT COALESCE(p.shop_id, p.barbershop_id) 
      FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.shop_id IS NOT NULL OR p.barbershop_id IS NOT NULL)
    )
  )
  WITH CHECK (
    barbershop_id IN (
      SELECT COALESCE(p.shop_id, p.barbershop_id) 
      FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.shop_id IS NOT NULL OR p.barbershop_id IS NOT NULL)
    )
  );

-- Barbers can manage their own exceptions or shop-wide exceptions if they're staff
CREATE POLICY "Barbers can manage their own exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    barber_id = auth.uid() 
    OR
    auth.uid() IN (
      SELECT user_id FROM public.barbershop_staff bs
      WHERE bs.barbershop_id = schedule_exceptions.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  )
  WITH CHECK (
    barber_id = auth.uid() 
    OR
    auth.uid() IN (
      SELECT user_id FROM public.barbershop_staff bs
      WHERE bs.barbershop_id = schedule_exceptions.barbershop_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Public can view exceptions for booking
CREATE POLICY "Public can view exceptions for booking" ON public.schedule_exceptions
  FOR SELECT USING (true);

-- Add helpful comment explaining the fix
COMMENT ON TABLE public.schedule_exceptions IS 'Schedule exceptions with robust RLS policies using COALESCE to handle NULL shop_id/barbershop_id values in profiles table';

-- Test query to verify the COALESCE logic works
-- SELECT auth.uid() as user_id, COALESCE(p.shop_id, p.barbershop_id) as resolved_shop_id FROM public.profiles p WHERE p.id = auth.uid();