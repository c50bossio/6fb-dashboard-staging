'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useSubscription } from './useSubscription'

/**
 * Hook that provides subscription-aware access control
 * This replaces role-only checks with subscription + role logic
 */
export function useSubscriptionAccess() {
  const { user, profile } = useAuth()
  const { subscriptionData, loading: subscriptionLoading } = useSubscription()
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subscriptionTier, setSubscriptionTier] = useState(null)
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false)

  useEffect(() => {
    if (!user || !profile || subscriptionLoading) {
      return
    }

    calculatePermissions()
  }, [user, profile, subscriptionData, subscriptionLoading])

  const calculatePermissions = () => {
    if (!user || !profile) {
      setPermissions(null)
      setLoading(false)
      return
    }

    const userRole = profile.role || 'CLIENT'
    const subscription = subscriptionData?.subscription || {}
    const tier = subscription.tier || null
    const isActive = subscription.isActive || false
    
    // Map database tier names to internal tier names
    const tierMapping = {
      'PROFESSIONAL': 'shop',  // $99/month Shop Owner tier
      'INDIVIDUAL': 'barber',  // $49/month Individual tier  
      'ENTERPRISE': 'enterprise', // $249/month Enterprise tier
      'FREE': 'free'
    }
    const normalizedTier = tierMapping[tier] || tier?.toLowerCase() || 'free'

    // Update state variables
    setSubscriptionTier(tier)
    setIsSubscriptionActive(isActive)

    // Base permissions for all users
    const basePermissions = {
      // Profile and basic features
      viewProfile: true,
      editProfile: true,
      viewDashboard: true,
      
      // Business features - default false, enabled based on subscription
      viewBusinessSettings: false,
      editBusinessSettings: false,
      viewAnalytics: false,
      manageStaff: false,
      manageServices: false,
      manageInventory: false,
      manageBookings: false,
      accessPaymentSettings: false,
      manageIntegrations: false,
      
      // Admin features
      accessAdminPanel: false,
      manageTenants: false
    }

    // Role-based permissions
    let rolePermissions = { ...basePermissions }

    // Individual Barber with Active Subscription
    if (userRole === 'BARBER' && isActive) {
      rolePermissions = {
        ...rolePermissions,
        viewBusinessSettings: true,
        editBusinessSettings: true,
        viewAnalytics: true,
        manageServices: true,
        manageBookings: true,
        accessPaymentSettings: true,
        manageIntegrations: true,
        // Staff management depends on subscription tier
        manageStaff: ['shop', 'enterprise'].includes(normalizedTier),
        // Inventory depends on subscription tier
        manageInventory: ['shop', 'enterprise'].includes(normalizedTier)
      }
    }
    
    // Employee Barber (no direct subscription - uses barbershop's subscription)
    else if (userRole === 'BARBER' && !isActive) {
      rolePermissions = {
        ...rolePermissions,
        viewAnalytics: true,
        manageServices: false, // Can't manage services as employee
        manageBookings: true,
        accessPaymentSettings: false, // No payment access as employee
        manageIntegrations: false // No integrations as employee
      }
    }

    // Shop Owner (always has business access regardless of subscription status)
    else if (userRole === 'SHOP_OWNER') {
      rolePermissions = {
        ...rolePermissions,
        viewBusinessSettings: true,
        editBusinessSettings: true,
        viewAnalytics: true,
        manageStaff: true,
        manageServices: true,
        manageInventory: true,
        manageBookings: true,
        accessPaymentSettings: true,
        manageIntegrations: true
      }
    }

    // Enterprise Owner (full access)
    else if (userRole === 'ENTERPRISE_OWNER') {
      rolePermissions = {
        ...rolePermissions,
        viewBusinessSettings: true,
        editBusinessSettings: true,
        viewAnalytics: true,
        manageStaff: true,
        manageServices: true,
        manageInventory: true,
        manageBookings: true,
        accessPaymentSettings: true,
        manageIntegrations: true
      }
    }

    // Super Admin (full access to everything)
    else if (userRole === 'SUPER_ADMIN') {
      rolePermissions = Object.keys(basePermissions).reduce((acc, key) => {
        acc[key] = true
        return acc
      }, {})
    }

    // Client (minimal access)
    else if (userRole === 'CLIENT') {
      // Clients only get base permissions (profile, dashboard)
      rolePermissions = basePermissions
    }

    setPermissions({
      ...rolePermissions,
      // Additional computed properties
      hasBusinessAccess: rolePermissions.viewBusinessSettings,
      isBusinessOwner: (userRole === 'BARBER' && isActive) || 
                      userRole === 'SHOP_OWNER' || 
                      userRole === 'ENTERPRISE_OWNER',
      canManageBusiness: rolePermissions.editBusinessSettings,
      subscriptionTier: tier,
      normalizedTier: normalizedTier,
      userRole,
      isSubscriptionActive: isActive
    })

    setLoading(false)
  }

  // Helper functions for common access checks
  const hasBusinessAccess = () => permissions?.hasBusinessAccess || false
  const isBusinessOwner = () => permissions?.isBusinessOwner || false
  const canManageStaff = () => permissions?.manageStaff || false
  const canAccessPayments = () => permissions?.accessPaymentSettings || false
  const canManageServices = () => permissions?.manageServices || false

  // Check if user can access a specific feature
  const canAccess = (feature) => {
    if (!permissions) return false
    return permissions[feature] || false
  }

  // Check if user has any of the specified permissions
  const hasAnyPermission = (permissionList) => {
    if (!permissions || !Array.isArray(permissionList)) return false
    return permissionList.some(permission => permissions[permission])
  }

  // Check if user has all of the specified permissions
  const hasAllPermissions = (permissionList) => {
    if (!permissions || !Array.isArray(permissionList)) return false
    return permissionList.every(permission => permissions[permission])
  }

  return {
    permissions,
    loading,
    hasBusinessAccess,
    isBusinessOwner,
    canManageStaff,
    canAccessPayments,
    canManageServices,
    canAccess,
    hasAnyPermission,
    hasAllPermissions,
    subscriptionTier,
    isSubscriptionActive
  }
}