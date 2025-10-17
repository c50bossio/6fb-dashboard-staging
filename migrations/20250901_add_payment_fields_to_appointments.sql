-- Add payment integration fields to appointments table
-- This enables proper linking between Stripe payments and appointments

BEGIN;

-- Add payment tracking fields to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS amount_paid_cents INTEGER DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.appointments.payment_intent_id IS 'Stripe payment intent ID for this appointment';
COMMENT ON COLUMN public.appointments.payment_status IS 'Payment status: pending, processing, completed, failed, refunded, disputed';
COMMENT ON COLUMN public.appointments.amount_paid_cents IS 'Amount paid in cents (for precision)';

-- Add index for payment lookup performance
CREATE INDEX IF NOT EXISTS idx_appointments_payment_intent 
ON public.appointments(payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_appointments_payment_status 
ON public.appointments(payment_status);

-- Create a constraint to ensure valid payment statuses
ALTER TABLE public.appointments 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'disputed'));

COMMIT;