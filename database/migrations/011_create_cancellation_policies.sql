-- Migration: Create cancellation_policies table
-- Feature: 011-holistic-staff-management
-- Description: Barbershop-level cancellation and refund policies

-- Create cancellation_policies table
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,

  -- Refund eligibility window
  refund_within_hours INTEGER NOT NULL DEFAULT 24,
  refund_percentage INTEGER NOT NULL DEFAULT 100,

  -- Approval workflow
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  auto_refund_threshold_cents INTEGER DEFAULT 5000, -- Auto-refund if amount < $50

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_refund_percentage CHECK (refund_percentage BETWEEN 0 AND 100),
  CONSTRAINT valid_refund_hours CHECK (refund_within_hours >= 0),
  CONSTRAINT unique_barbershop UNIQUE(barbershop_id)
);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_cancellation_policies_barbershop
ON cancellation_policies(barbershop_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cancellation_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_cancellation_policies_updated_at ON cancellation_policies;
CREATE TRIGGER trigger_cancellation_policies_updated_at
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_policies_updated_at();

-- Insert default policy for existing barbershops
INSERT INTO cancellation_policies (barbershop_id, refund_within_hours, refund_percentage, requires_approval, auto_refund_threshold_cents)
SELECT id, 24, 100, false, 5000
FROM barbershops
WHERE id NOT IN (SELECT barbershop_id FROM cancellation_policies)
ON CONFLICT (barbershop_id) DO NOTHING;

-- Add comments
COMMENT ON TABLE cancellation_policies IS 'Cancellation and refund policies per barbershop';
COMMENT ON COLUMN cancellation_policies.refund_within_hours IS 'Hours before appointment when full refund is allowed';
COMMENT ON COLUMN cancellation_policies.refund_percentage IS 'Percentage of payment to refund (0-100)';
COMMENT ON COLUMN cancellation_policies.requires_approval IS 'Whether admin approval is required for refunds';
COMMENT ON COLUMN cancellation_policies.auto_refund_threshold_cents IS 'Auto-refund without approval if amount is below this threshold (in cents)';
