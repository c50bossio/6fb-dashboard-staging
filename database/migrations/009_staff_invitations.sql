-- Staff Invitation System Migration
-- File: 009_staff_invitations.sql
-- Created: 2025-08-25
-- Purpose: Enable barbershop owners to invite staff members via email

-- =======================================
-- STAFF INVITATIONS TABLE
-- =======================================

CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Barbershop & Inviter
    barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Invitee Details
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'BARBER',
    
    -- Invitation Token & Security
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    
    -- Status Tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    
    -- Acceptance Details
    accepted_at TIMESTAMPTZ,
    accepted_by_user_id UUID REFERENCES auth.users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(barbershop_id, email, status) -- Only one active invitation per email per barbershop
);

-- =======================================
-- INDEXES FOR PERFORMANCE
-- =======================================

CREATE INDEX idx_staff_invitations_token ON staff_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_staff_invitations_barbershop ON staff_invitations(barbershop_id);
CREATE INDEX idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX idx_staff_invitations_expires ON staff_invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_staff_invitations_status ON staff_invitations(status);

-- =======================================
-- ROW LEVEL SECURITY
-- =======================================

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- Barbershop owners can view and manage their invitations
CREATE POLICY "Barbershop owners can manage invitations" 
ON staff_invitations
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM barbershops
        WHERE barbershops.id = staff_invitations.barbershop_id
        AND barbershops.owner_id = auth.uid()
    )
);

-- Staff can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
ON staff_invitations
FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- Anyone can view an invitation by token (for acceptance flow)
CREATE POLICY "Public can view invitation by token"
ON staff_invitations
FOR SELECT
TO anon, authenticated
USING (
    invitation_token IS NOT NULL
);

-- =======================================
-- FUNCTIONS
-- =======================================

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE staff_invitations
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'pending'
        AND expires_at < NOW();
END;
$$;

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
BEGIN
    -- Generate a URL-safe random token
    token := encode(gen_random_bytes(32), 'base64');
    -- Replace URL-unsafe characters
    token := replace(token, '+', '-');
    token := replace(token, '/', '_');
    token := replace(token, '=', '');
    RETURN token;
END;
$$;

-- =======================================
-- TRIGGERS
-- =======================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_staff_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_invitations_timestamp
    BEFORE UPDATE ON staff_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_staff_invitations_updated_at();

-- =======================================
-- SAMPLE DATA FOR TESTING (DEV ONLY)
-- =======================================

-- Uncomment for development testing
/*
INSERT INTO staff_invitations (
    barbershop_id,
    invited_by,
    email,
    full_name,
    role,
    invitation_token
) VALUES (
    (SELECT id FROM barbershops LIMIT 1),
    (SELECT owner_id FROM barbershops LIMIT 1),
    'test.barber@example.com',
    'Test Barber',
    'BARBER',
    generate_invitation_token()
);
*/

-- =======================================
-- MIGRATION NOTES
-- =======================================

COMMENT ON TABLE staff_invitations IS 'Tracks staff member invitations sent by barbershop owners';
COMMENT ON COLUMN staff_invitations.invitation_token IS 'Secure token for invitation acceptance';
COMMENT ON COLUMN staff_invitations.expires_at IS 'Invitation expires after 7 days by default';
COMMENT ON COLUMN staff_invitations.metadata IS 'Additional invitation data (commission rate, specialties, etc)';