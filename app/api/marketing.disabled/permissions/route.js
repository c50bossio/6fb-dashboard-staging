import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Permission constants
const VALID_PERMISSIONS = [
  'can_view_shop_campaigns',
  'can_manage_shop_campaigns', 
  'can_use_shop_billing',
  'can_use_enterprise_billing',
  'can_approve_campaigns',
  'can_view_shop_analytics',
  'can_manage_shop_staff'
]

const ROLE_HIERARCHY = {
  'enterprise_owner': ['shop_owner', 'barber', 'client'],
  'shop_owner': ['barber', 'client'],
  'barber': ['client'],
  'client': []
}

// GET - Fetch user permissions and custom roles
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const targetUserId = searchParams.get('target_user_id')
    const shopId = searchParams.get('shop_id')
    const includeExpired = searchParams.get('include_expired') === 'true'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get requesting user's role and permissions
    const { data: requestingUser } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', userId)
      .single()

    if (!requestingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure custom roles table exists
    await ensureCustomRolesTable()

    let query = supabase
      .from('user_custom_roles')
      .select(`
        *,
        user:profiles!user_custom_roles_user_id_fkey(
          id,
          email,
          full_name,
          role,
          barbershop_id
        ),
        granted_by_user:profiles!user_custom_roles_granted_by_fkey(
          id,
          email,
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false })

    // Filter based on target user or scope
    if (targetUserId) {
      // Check if requesting user can view target user's permissions
      const canViewPermissions = await verifyPermissionAccess(
        requestingUser, 
        targetUserId
      )
      
      if (!canViewPermissions) {
        return NextResponse.json(
          { error: 'You do not have permission to view this user\'s permissions' },
          { status: 403 }
        )
      }

      query = query.eq('user_id', targetUserId)
    } else if (shopId) {
      // Get permissions for users in a specific shop
      if (!await verifyShopAccess(requestingUser, shopId)) {
        return NextResponse.json(
          { error: 'You do not have access to this shop' },
          { status: 403 }
        )
      }

      const { data: shopUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('barbershop_id', shopId)

      const userIds = shopUsers?.map(u => u.id) || []
      if (userIds.length > 0) {
        query = query.in('user_id', userIds)
      }
    } else {
      // Get permissions for users the requesting user can manage
      const accessibleUserIds = await getAccessibleUserIds(requestingUser)
      if (accessibleUserIds.length > 0) {
        query = query.in('user_id', accessibleUserIds)
      } else {
        // User can only see their own permissions
        query = query.eq('user_id', userId)
      }
    }

    // Filter out expired permissions unless explicitly requested
    if (!includeExpired) {
      query = query.and('expires_at.is.null,expires_at.gt.now()')
    }

    const { data: permissions, error } = await query

    if (error) {
      console.error('Error fetching permissions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch permissions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      permissions: permissions || [],
      valid_permissions: VALID_PERMISSIONS,
      role_hierarchy: ROLE_HIERARCHY
    })

  } catch (error) {
    console.error('Error in permissions API GET:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Grant custom permissions to users
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      granter_id,
      user_id,
      permissions = [],
      expires_at = null,
      notes = null
    } = body

    if (!granter_id || !user_id || !permissions.length) {
      return NextResponse.json(
        { error: 'Granter ID, user ID, and permissions are required' },
        { status: 400 }
      )
    }

    // Validate permissions
    const invalidPermissions = permissions.filter(p => !VALID_PERMISSIONS.includes(p))
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
        { status: 400 }
      )
    }

    // Get granter's role and permissions
    const { data: granter } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', granter_id)
      .single()

    if (!granter) {
      return NextResponse.json({ error: 'Granter not found' }, { status: 404 })
    }

    // Get target user's role
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', user_id)
      .single()

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Verify granter has authority to grant permissions
    const canGrantPermissions = await verifyGrantingAuthority(
      granter, 
      targetUser, 
      permissions
    )

    if (!canGrantPermissions.allowed) {
      return NextResponse.json(
        { error: canGrantPermissions.reason },
        { status: 403 }
      )
    }

    // Ensure tables exist
    await ensureCustomRolesTable()
    await ensurePermissionAuditTable()

    // Check if user already has custom roles entry
    const { data: existingRoles } = await supabase
      .from('user_custom_roles')
      .select('*')
      .eq('user_id', user_id)
      .single()

    let result

    if (existingRoles) {
      // Update existing permissions
      const updatedPermissions = {
        ...existingRoles,
        ...permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
        expires_at: expires_at || existingRoles.expires_at,
        notes: notes || existingRoles.notes,
        granted_by: granter_id,
        updated_at: new Date().toISOString()
      }

      const { data: updated, error } = await supabase
        .from('user_custom_roles')
        .update(updatedPermissions)
        .eq('user_id', user_id)
        .select()
        .single()

      if (error) {
        console.error('Error updating custom roles:', error)
        return NextResponse.json(
          { error: 'Failed to update permissions', details: error.message },
          { status: 500 }
        )
      }

      result = updated

    } else {
      // Create new permissions entry
      const newPermissions = {
        user_id,
        ...permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
        expires_at,
        notes,
        granted_by: granter_id,
        is_active: true
      }

      const { data: created, error } = await supabase
        .from('user_custom_roles')
        .insert([newPermissions])
        .select()
        .single()

      if (error) {
        console.error('Error creating custom roles:', error)
        return NextResponse.json(
          { error: 'Failed to create permissions', details: error.message },
          { status: 500 }
        )
      }

      result = created
    }

    // Log to audit trail
    await logPermissionChange({
      user_id,
      granter_id,
      action: existingRoles ? 'update' : 'grant',
      permissions,
      expires_at,
      notes
    })

    return NextResponse.json({
      permissions: result,
      message: `Permissions ${existingRoles ? 'updated' : 'granted'} successfully`
    }, { status: existingRoles ? 200 : 201 })

  } catch (error) {
    console.error('Error in permissions API POST:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update existing permissions
export async function PATCH(request) {
  try {
    const body = await request.json()
    const {
      granter_id,
      user_id,
      permissions_to_add = [],
      permissions_to_remove = [],
      expires_at,
      notes
    } = body

    if (!granter_id || !user_id) {
      return NextResponse.json(
        { error: 'Granter ID and user ID are required' },
        { status: 400 }
      )
    }

    // Get existing permissions
    const { data: existingRoles } = await supabase
      .from('user_custom_roles')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (!existingRoles) {
      return NextResponse.json(
        { error: 'No existing permissions found for user' },
        { status: 404 }
      )
    }

    // Verify granter has authority
    const { data: granter } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', granter_id)
      .single()

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', user_id)
      .single()

    if (!granter || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allPermissions = [...permissions_to_add, ...permissions_to_remove]
    const canGrantPermissions = await verifyGrantingAuthority(
      granter, 
      targetUser, 
      allPermissions
    )

    if (!canGrantPermissions.allowed) {
      return NextResponse.json(
        { error: canGrantPermissions.reason },
        { status: 403 }
      )
    }

    // Build updated permissions object
    const updatedPermissions = { ...existingRoles }

    // Add new permissions
    permissions_to_add.forEach(perm => {
      if (VALID_PERMISSIONS.includes(perm)) {
        updatedPermissions[perm] = true
      }
    })

    // Remove permissions
    permissions_to_remove.forEach(perm => {
      if (VALID_PERMISSIONS.includes(perm)) {
        updatedPermissions[perm] = false
      }
    })

    // Update metadata
    if (expires_at !== undefined) updatedPermissions.expires_at = expires_at
    if (notes !== undefined) updatedPermissions.notes = notes
    updatedPermissions.granted_by = granter_id
    updatedPermissions.updated_at = new Date().toISOString()

    // Save changes
    const { data: updated, error } = await supabase
      .from('user_custom_roles')
      .update(updatedPermissions)
      .eq('user_id', user_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating permissions:', error)
      return NextResponse.json(
        { error: 'Failed to update permissions', details: error.message },
        { status: 500 }
      )
    }

    // Log to audit trail
    await logPermissionChange({
      user_id,
      granter_id,
      action: 'update',
      permissions_added: permissions_to_add,
      permissions_removed: permissions_to_remove,
      expires_at,
      notes
    })

    return NextResponse.json({
      permissions: updated,
      message: 'Permissions updated successfully'
    })

  } catch (error) {
    console.error('Error in permissions API PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Revoke custom permissions
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const granterUserId = searchParams.get('granter_id')
    const targetUserId = searchParams.get('user_id')
    const specificPermissions = searchParams.get('permissions')?.split(',')

    if (!granterUserId || !targetUserId) {
      return NextResponse.json(
        { error: 'Granter ID and user ID are required' },
        { status: 400 }
      )
    }

    // Get existing permissions
    const { data: existingRoles } = await supabase
      .from('user_custom_roles')
      .select('*')
      .eq('user_id', targetUserId)
      .single()

    if (!existingRoles) {
      return NextResponse.json(
        { error: 'No permissions found for user' },
        { status: 404 }
      )
    }

    // Verify granter has authority
    const { data: granter } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', granterUserId)
      .single()

    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, role, barbershop_id, enterprise_id')
      .eq('id', targetUserId)
      .single()

    if (!granter || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const permissionsToRevoke = specificPermissions || VALID_PERMISSIONS
    const canRevokePermissions = await verifyRevokingAuthority(
      granter,
      targetUser,
      existingRoles,
      permissionsToRevoke
    )

    if (!canRevokePermissions.allowed) {
      return NextResponse.json(
        { error: canRevokePermissions.reason },
        { status: 403 }
      )
    }

    if (specificPermissions) {
      // Revoke specific permissions
      const updatedPermissions = { ...existingRoles }
      
      specificPermissions.forEach(perm => {
        if (VALID_PERMISSIONS.includes(perm)) {
          updatedPermissions[perm] = false
        }
      })
      
      updatedPermissions.updated_at = new Date().toISOString()

      const { data: updated, error } = await supabase
        .from('user_custom_roles')
        .update(updatedPermissions)
        .eq('user_id', targetUserId)
        .select()
        .single()

      if (error) {
        console.error('Error revoking specific permissions:', error)
        return NextResponse.json(
          { error: 'Failed to revoke permissions', details: error.message },
          { status: 500 }
        )
      }

      // Log to audit trail
      await logPermissionChange({
        user_id: targetUserId,
        granter_id: granterUserId,
        action: 'revoke_specific',
        permissions: specificPermissions
      })

      return NextResponse.json({
        permissions: updated,
        message: 'Specific permissions revoked successfully'
      })

    } else {
      // Revoke all permissions (soft delete)
      const { error } = await supabase
        .from('user_custom_roles')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: granterUserId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', targetUserId)

      if (error) {
        console.error('Error revoking all permissions:', error)
        return NextResponse.json(
          { error: 'Failed to revoke permissions', details: error.message },
          { status: 500 }
        )
      }

      // Log to audit trail
      await logPermissionChange({
        user_id: targetUserId,
        granter_id: granterUserId,
        action: 'revoke_all'
      })

      return NextResponse.json({
        message: 'All custom permissions revoked successfully'
      })
    }

  } catch (error) {
    console.error('Error in permissions API DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Helper Functions

async function ensureCustomRolesTable() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS user_custom_roles (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) NOT NULL,
          
          -- Marketing permissions
          can_view_shop_campaigns BOOLEAN DEFAULT FALSE,
          can_manage_shop_campaigns BOOLEAN DEFAULT FALSE,
          can_use_shop_billing BOOLEAN DEFAULT FALSE,
          can_use_enterprise_billing BOOLEAN DEFAULT FALSE,
          can_approve_campaigns BOOLEAN DEFAULT FALSE,
          can_view_shop_analytics BOOLEAN DEFAULT FALSE,
          can_manage_shop_staff BOOLEAN DEFAULT FALSE,
          
          -- Permission metadata
          expires_at TIMESTAMPTZ,
          notes TEXT,
          granted_by UUID REFERENCES auth.users(id),
          revoked_by UUID REFERENCES auth.users(id),
          revoked_at TIMESTAMPTZ,
          is_active BOOLEAN DEFAULT TRUE,
          
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          UNIQUE(user_id)
        );

        -- Enable RLS
        ALTER TABLE user_custom_roles ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_custom_roles_user_id ON user_custom_roles(user_id);
        CREATE INDEX IF NOT EXISTS idx_custom_roles_granted_by ON user_custom_roles(granted_by);
        CREATE INDEX IF NOT EXISTS idx_custom_roles_expires_at ON user_custom_roles(expires_at);

        -- RLS Policies
        CREATE POLICY IF NOT EXISTS "Users can view accessible custom roles" ON user_custom_roles
          FOR SELECT USING (
            user_id = auth.uid() OR
            granted_by = auth.uid() OR
            EXISTS (
              SELECT 1 FROM profiles granter, profiles target
              WHERE granter.id = auth.uid() 
              AND target.id = user_custom_roles.user_id
              AND (
                (granter.role = 'shop_owner' AND target.barbershop_id = granter.barbershop_id) OR
                (granter.role = 'enterprise_owner' AND target.enterprise_id = granter.enterprise_id)
              )
            )
          );

        CREATE POLICY IF NOT EXISTS "Authorized users can manage custom roles" ON user_custom_roles
          FOR ALL USING (
            granted_by = auth.uid() OR
            EXISTS (
              SELECT 1 FROM profiles granter, profiles target
              WHERE granter.id = auth.uid() 
              AND target.id = user_custom_roles.user_id
              AND (
                (granter.role = 'shop_owner' AND target.barbershop_id = granter.barbershop_id AND target.role = 'barber') OR
                (granter.role = 'enterprise_owner' AND target.enterprise_id = granter.enterprise_id)
              )
            )
          );
      `
    })

    if (error) {
      console.error('Error creating user_custom_roles table:', error)
    }
  } catch (err) {
    console.error('Error ensuring user_custom_roles table:', err)
  }
}

async function ensurePermissionAuditTable() {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS permission_audit_log (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) NOT NULL,
          granter_id UUID REFERENCES auth.users(id) NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('grant', 'update', 'revoke_specific', 'revoke_all')),
          permissions_data JSONB,
          expires_at TIMESTAMPTZ,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_audit_user_id ON permission_audit_log(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_granter_id ON permission_audit_log(granter_id);
        CREATE INDEX IF NOT EXISTS idx_audit_created_at ON permission_audit_log(created_at);

        -- RLS Policy
        CREATE POLICY IF NOT EXISTS "Users can view relevant audit logs" ON permission_audit_log
          FOR SELECT USING (
            user_id = auth.uid() OR
            granter_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role IN ('shop_owner', 'enterprise_owner')
            )
          );
      `
    })

    if (error) {
      console.error('Error creating permission_audit_log table:', error)
    }
  } catch (err) {
    console.error('Error ensuring permission_audit_log table:', err)
  }
}

async function verifyPermissionAccess(requestingUser, targetUserId) {
  // Enterprise owners can view all users in their enterprise
  if (requestingUser.role === 'enterprise_owner' && requestingUser.enterprise_id) {
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('enterprise_id')
      .eq('id', targetUserId)
      .single()
    
    return targetUser?.enterprise_id === requestingUser.enterprise_id
  }

  // Shop owners can view users in their shop
  if (requestingUser.role === 'shop_owner' && requestingUser.barbershop_id) {
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('barbershop_id')
      .eq('id', targetUserId)
      .single()
    
    return targetUser?.barbershop_id === requestingUser.barbershop_id
  }

  // Users can view their own permissions
  return requestingUser.id === targetUserId
}

async function verifyShopAccess(user, shopId) {
  if (user.role === 'enterprise_owner' && user.enterprise_id) {
    const { data: shop } = await supabase
      .from('barbershops')
      .select('enterprise_id')
      .eq('id', shopId)
      .single()
    
    return shop?.enterprise_id === user.enterprise_id
  }

  if (user.role === 'shop_owner') {
    return user.barbershop_id === shopId
  }

  return false
}

async function getAccessibleUserIds(requestingUser) {
  const userIds = []

  if (requestingUser.role === 'enterprise_owner' && requestingUser.enterprise_id) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('enterprise_id', requestingUser.enterprise_id)
    
    userIds.push(...(users?.map(u => u.id) || []))
  }

  if (['shop_owner', 'enterprise_owner'].includes(requestingUser.role) && requestingUser.barbershop_id) {
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('barbershop_id', requestingUser.barbershop_id)
    
    userIds.push(...(users?.map(u => u.id) || []))
  }

  return [...new Set(userIds)] // Remove duplicates
}

async function verifyGrantingAuthority(granter, targetUser, permissions) {
  // Only shop owners and enterprise owners can grant permissions
  if (!['shop_owner', 'enterprise_owner'].includes(granter.role)) {
    return {
      allowed: false,
      reason: 'Only shop owners and enterprise owners can grant custom permissions'
    }
  }

  // Check role hierarchy - can't grant permissions to equal or higher roles
  if (granter.role === 'shop_owner' && targetUser.role !== 'barber') {
    return {
      allowed: false,
      reason: 'Shop owners can only grant permissions to barbers'
    }
  }

  if (granter.role === 'enterprise_owner' && !['barber', 'shop_owner'].includes(targetUser.role)) {
    return {
      allowed: false,
      reason: 'Enterprise owners can only grant permissions to barbers and shop owners'
    }
  }

  // Check scope - must be in same organization
  if (granter.role === 'shop_owner') {
    if (granter.barbershop_id !== targetUser.barbershop_id) {
      return {
        allowed: false,
        reason: 'Shop owners can only grant permissions to users in their shop'
      }
    }
  }

  if (granter.role === 'enterprise_owner') {
    if (granter.enterprise_id !== targetUser.enterprise_id) {
      return {
        allowed: false,
        reason: 'Enterprise owners can only grant permissions to users in their enterprise'
      }
    }
  }

  // Check specific permission restrictions
  const restrictedPermissions = ['can_use_enterprise_billing']
  const hasRestrictedPermissions = permissions.some(p => restrictedPermissions.includes(p))
  
  if (hasRestrictedPermissions && granter.role !== 'enterprise_owner') {
    return {
      allowed: false,
      reason: 'Only enterprise owners can grant enterprise-level permissions'
    }
  }

  return { allowed: true }
}

async function verifyRevokingAuthority(granter, targetUser, existingRoles, permissionsToRevoke) {
  // Can only revoke permissions you could have granted
  const grantingCheck = await verifyGrantingAuthority(granter, targetUser, permissionsToRevoke)
  if (!grantingCheck.allowed) {
    return grantingCheck
  }

  // Can only revoke if you granted them or have higher authority
  if (existingRoles.granted_by === granter.id) {
    return { allowed: true }
  }

  // Enterprise owners can revoke shop-level permissions
  if (granter.role === 'enterprise_owner' && existingRoles.granted_by) {
    const { data: originalGranter } = await supabase
      .from('profiles')
      .select('role, enterprise_id')
      .eq('id', existingRoles.granted_by)
      .single()

    if (originalGranter?.role === 'shop_owner' && originalGranter.enterprise_id === granter.enterprise_id) {
      return { allowed: true }
    }
  }

  return {
    allowed: false,
    reason: 'You can only revoke permissions you granted or those granted by your subordinates'
  }
}

async function logPermissionChange(logData) {
  try {
    await supabase
      .from('permission_audit_log')
      .insert([{
        user_id: logData.user_id,
        granter_id: logData.granter_id,
        action: logData.action,
        permissions_data: {
          permissions: logData.permissions || [],
          permissions_added: logData.permissions_added || [],
          permissions_removed: logData.permissions_removed || []
        },
        expires_at: logData.expires_at,
        notes: logData.notes
      }])
  } catch (error) {
    console.error('Error logging permission change:', error)
  }
}