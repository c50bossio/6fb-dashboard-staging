-- Fix schedule_exceptions RLS policies to enable saving special hours
-- The original policies incorrectly checked auth.uid() = shop_id which will never match
-- This migration corrects the policies to properly check barbershop ownership

-- Drop incorrect policies
DROP POLICY IF EXISTS "Shop owners can manage shop exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Barbers can manage their own exceptions" ON public.schedule_exceptions;
DROP POLICY IF EXISTS "Public can view exceptions for booking" ON public.schedule_exceptions;

-- CORRECTED POLICIES

-- 1. Shop owners can manage all exceptions for their barbershop
CREATE POLICY "Shop owners can manage their shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    shop_id IN (
      SELECT p.shop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.shop_id IS NOT NULL
      UNION
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  )
  WITH CHECK (
    shop_id IN (
      SELECT p.shop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.shop_id IS NOT NULL
      UNION
      SELECT p.barbershop_id FROM public.profiles p 
      WHERE p.id = auth.uid() AND p.barbershop_id IS NOT NULL
    )
  );

-- 2. Staff members can manage exceptions for their barbershop
CREATE POLICY "Staff can manage shop exceptions" ON public.schedule_exceptions
  FOR ALL USING (
    shop_id IN (
      SELECT bs.barbershop_id FROM public.barbershop_staff bs
      WHERE bs.user_id = auth.uid() AND bs.is_active = true
    )
  )
  WITH CHECK (
    shop_id IN (
      SELECT bs.barbershop_id FROM public.barbershop_staff bs
      WHERE bs.user_id = auth.uid() AND bs.is_active = true
    )
  );

-- 3. Individual barbers can manage their own personal exceptions
CREATE POLICY "Barbers can manage personal exceptions" ON public.schedule_exceptions
  FOR ALL USING (barber_id = auth.uid())
  WITH CHECK (barber_id = auth.uid());

-- 4. Public read access for booking system (customers need to see shop hours/holidays)
CREATE POLICY "Public can view exceptions for booking" ON public.schedule_exceptions
  FOR SELECT USING (true);

-- Add helpful comments
COMMENT ON POLICY "Shop owners can manage their shop exceptions" ON public.schedule_exceptions IS 
'Allows barbershop owners to manage all special hours and holidays for their shop';

COMMENT ON POLICY "Staff can manage shop exceptions" ON public.schedule_exceptions IS 
'Allows active staff members to manage special hours for their barbershop';

COMMENT ON POLICY "Barbers can manage personal exceptions" ON public.schedule_exceptions IS 
'Allows individual barbers to manage their personal time off and special hours';

COMMENT ON POLICY "Public can view exceptions for booking" ON public.schedule_exceptions IS 
'Allows customers to see shop closures and special hours when booking appointments';