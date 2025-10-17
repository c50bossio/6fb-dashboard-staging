-- Setup Enterprise User: c50bossio@gmail.com
-- This script creates the organization structure needed for the context system

BEGIN;

-- 1. Get the user ID for c50bossio@gmail.com
DO $$
DECLARE
  enterprise_user_id UUID;
  enterprise_org_id UUID;
  barbershop_id UUID := 'c5a58548-8f23-426c-bedc-49a83d238724';
BEGIN
  -- Find the enterprise user
  SELECT id INTO enterprise_user_id 
  FROM auth.users 
  WHERE email = 'c50bossio@gmail.com';
  
  IF enterprise_user_id IS NOT NULL THEN
    RAISE NOTICE 'Found user: %', enterprise_user_id;
    
    -- 2. Create or update the enterprise organization
    INSERT INTO organizations (
      name, 
      description, 
      owner_id, 
      settings,
      created_at,
      updated_at
    ) VALUES (
      '6FB Enterprise',
      'Enterprise-level barbershop management organization',
      enterprise_user_id,
      jsonb_build_object(
        'tier', 'ENTERPRISE',
        'contextSystem', 'enabled',
        'multiLocation', true,
        'autoCreated', false
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT (name, owner_id) 
    DO UPDATE SET 
      description = EXCLUDED.description,
      settings = EXCLUDED.settings,
      updated_at = NOW()
    RETURNING id INTO enterprise_org_id;
    
    RAISE NOTICE 'Created/Updated organization: %', enterprise_org_id;
    
    -- 3. Link the existing barbershop to this organization
    UPDATE barbershops 
    SET organization_id = enterprise_org_id,
        updated_at = NOW()
    WHERE id = barbershop_id;
    
    RAISE NOTICE 'Linked barbershop % to organization %', barbershop_id, enterprise_org_id;
    
    -- 4. Update the user's role to ENTERPRISE_OWNER
    UPDATE profiles 
    SET role = 'ENTERPRISE_OWNER',
        updated_at = NOW()
    WHERE id = enterprise_user_id;
    
    RAISE NOTICE 'Updated user role to ENTERPRISE_OWNER';
    
    -- 5. Create/update organization membership
    INSERT INTO organization_members (
      organization_id, 
      user_id, 
      role, 
      permissions,
      joined_at
    ) VALUES (
      enterprise_org_id,
      enterprise_user_id,
      'OWNER',
      '["all"]'::jsonb,
      NOW()
    )
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET
      role = EXCLUDED.role,
      permissions = EXCLUDED.permissions;
    
    RAISE NOTICE 'Created/Updated organization membership';
    
    -- 6. Create/update user context preferences
    INSERT INTO user_context_preferences (
      user_id,
      default_context_level,
      auto_switch,
      preferences,
      created_at,
      updated_at
    ) VALUES (
      enterprise_user_id,
      'organization',
      true,
      jsonb_build_object(
        'showContextBanner', true,
        'rememberLastContext', true,
        'autoElevateToOrg', true
      ),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      default_context_level = EXCLUDED.default_context_level,
      auto_switch = EXCLUDED.auto_switch,
      preferences = EXCLUDED.preferences,
      updated_at = NOW();
    
    RAISE NOTICE 'Created/Updated user context preferences';
    
    -- 7. Verify the setup
    RAISE NOTICE '=== SETUP VERIFICATION ===';
    RAISE NOTICE 'User ID: %', enterprise_user_id;
    RAISE NOTICE 'Organization ID: %', enterprise_org_id;
    RAISE NOTICE 'Barbershop ID: %', barbershop_id;
    
    -- Check organization exists
    IF EXISTS (SELECT 1 FROM organizations WHERE id = enterprise_org_id) THEN
      RAISE NOTICE '✓ Organization created successfully';
    END IF;
    
    -- Check barbershop linked
    IF EXISTS (SELECT 1 FROM barbershops WHERE id = barbershop_id AND organization_id = enterprise_org_id) THEN
      RAISE NOTICE '✓ Barbershop linked to organization';
    END IF;
    
    -- Check user role updated
    IF EXISTS (SELECT 1 FROM profiles WHERE id = enterprise_user_id AND role = 'ENTERPRISE_OWNER') THEN
      RAISE NOTICE '✓ User role updated to ENTERPRISE_OWNER';
    END IF;
    
    -- Check context preferences
    IF EXISTS (SELECT 1 FROM user_context_preferences WHERE user_id = enterprise_user_id) THEN
      RAISE NOTICE '✓ Context preferences created';
    END IF;
    
    RAISE NOTICE '=== SETUP COMPLETE ===';
    
  ELSE
    RAISE EXCEPTION 'User c50bossio@gmail.com not found in database';
  END IF;
END $$;

COMMIT;