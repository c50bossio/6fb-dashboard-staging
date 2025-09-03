'use client'

import {
  BanknotesIcon,
  UserGroupIcon,
  CreditCardIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getTenant } from '@/lib/tenant-resolver-client'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '@/contexts/UnifiedContextProvider'
import { Card } from '../ui/card'
import Button from '../ui/Button'
import ContextBanner from '@/components/navigation/ContextBanner'
import StreamlinedOnboarding from './StreamlinedOnboarding'
import OrganizationFinanceDashboard from './OrganizationFinanceDashboard'
import OwnerFinanceDashboard from './OwnerFinanceDashboard'
import BarberEarningsDashboard from './BarberEarningsDashboard'

export default function UnifiedFinanceHub() {
  const { user, profile } = useAuth()
  const { context: unifiedContext } = useUnifiedContext()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [financeContext, setFinanceContext] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Development mode bypass - allow loading without authentication
    if (process.env.NODE_ENV === 'development' && !user && !profile) {
      console.log('🔧 [FINANCE HUB] Development mode bypass - loading with mock data')
      loadFinanceContext()
      return
    }
    
    if (user && profile) {
      loadFinanceContext()
    }
  }, [user, profile, unifiedContext]) // Re-load when context changes

  const loadFinanceContext = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use unified context if available, otherwise fall back to tenant resolver
      let contextData = null
      
      // Development mode mock data
      if (process.env.NODE_ENV === 'development' && !user && !profile) {
        console.log('🔧 [FINANCE HUB] Using development mock data')
        contextData = {
          barbershopId: '1ca6138d-eae8-46ed-abf4-5d6c52fbd21b', // Mock barbershop ID
          organizationId: null,
          resourceId: null,
          role: 'SHOP_OWNER',
          contextLevel: UNIFIED_CONTEXT_LEVELS.LOCATION
        }
      } else if (unifiedContext) {
        // Use unified context data
        contextData = {
          barbershopId: unifiedContext.locationId,
          organizationId: unifiedContext.organizationId,
          resourceId: unifiedContext.resourceId,
          role: profile?.role || 'BARBER',
          contextLevel: unifiedContext.level
        }
      } else {
        // Fallback to legacy tenant resolution
        const { barbershopId, role } = await getTenant(profile.id, { supabase })
        contextData = {
          barbershopId,
          role: role || 'BARBER',
          contextLevel: UNIFIED_CONTEXT_LEVELS.LOCATION
        }
      }
      
      if (!contextData.barbershopId && !contextData.organizationId) {
        setError('No barbershop or organization found. Please complete your profile setup.')
        return
      }

      // Load data based on context level
      let barbershop = null
      let stripeAccount = null
      let revenueApiUrl = '/api/v1/revenue/summary'
      
      if (contextData.contextLevel === UNIFIED_CONTEXT_LEVELS.ORGANIZATION) {
        // Organization level - get aggregated data
        revenueApiUrl += `?context=organization&organizationId=${contextData.organizationId}`
        
        // Get organization data
        const { data: orgData } = await supabase
          .from('organizations')
          .select('id, name, description')
          .eq('id', contextData.organizationId)
          .single()
          
        barbershop = {
          name: orgData?.name || 'Organization',
          business_type: 'organization'
        }
        
      } else if (contextData.contextLevel === UNIFIED_CONTEXT_LEVELS.LOCATION) {
        // Location level - get specific barbershop data
        revenueApiUrl += `?context=location&locationId=${contextData.barbershopId}`
        
        // Development mode mock data
        if (process.env.NODE_ENV === 'development' && !user && !profile) {
          console.log('🔧 [FINANCE HUB] Using mock barbershop data for development')
          barbershop = {
            name: 'Downtown Barbershop (DEV)',
            phone: '(555) 123-4567',
            website: 'https://downtown-barbershop.com',
            business_type: 'individual'
          }
          stripeAccount = {
            account_id: null,
            onboarding_completed: false,
            charges_enabled: false
          }
        } else {
          // Production database queries
          const { data: barbershopData } = await supabase
            .from('barbershops')
            .select('name, phone, website, business_type')
            .eq('id', contextData.barbershopId)
            .single()
            
          barbershop = barbershopData

          // Check Stripe Connect status for this location
          const { data: stripeData } = await supabase
            .from('stripe_accounts')
            .select('account_id, onboarding_completed, charges_enabled')
            .eq('barbershop_id', contextData.barbershopId)
            .single()
            
          stripeAccount = stripeData
        }
        
      } else if (contextData.contextLevel === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
        // Resource level - get individual resource data
        revenueApiUrl += `?context=resource&resourceId=${contextData.resourceId}`
        
        // Get the barbershop this resource belongs to
        const { data: resourceData } = await supabase
          .from('barbershop_staff')
          .select(`
            barbershop_id,
            barbershops!barbershop_staff_barbershop_id_fkey(name, phone, website, business_type)
          `)
          .eq('user_id', contextData.resourceId)
          .single()
          
        if (resourceData?.barbershops) {
          barbershop = resourceData.barbershops
          contextData.barbershopId = resourceData.barbershop_id
        }
      }

      // Get financial overview based on context
      const [revenueResponse, billingResponse] = await Promise.all([
        // Revenue data (context-aware)
        stripeAccount?.charges_enabled || contextData.contextLevel === UNIFIED_CONTEXT_LEVELS.ORGANIZATION
          ? fetch(revenueApiUrl).then(r => r.ok ? r.json() : null)
          : Promise.resolve(null),
        // Platform billing data  
        fetch('/api/v1/billing/current').then(r => r.ok ? r.json() : null)
      ])

      setFinanceContext({
        barbershopId: contextData.barbershopId,
        organizationId: contextData.organizationId,
        resourceId: contextData.resourceId,
        userRole: contextData.role,
        contextLevel: contextData.contextLevel,
        hasStripeConnect: stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled,
        setupProgress: {
          stripe: stripeAccount?.onboarding_completed ? 'complete' : 'pending',
          compensation: 'pending', // TODO: Check compensation setup
          billing: billingResponse ? 'complete' : 'pending'
        },
        revenue: revenueResponse,
        billing: billingResponse,
        barbershop: barbershop,
        profile: profile,
        unifiedContext: unifiedContext,
        quickActions: generateQuickActions(stripeAccount, revenueResponse, billingResponse, contextData.role, contextData.contextLevel)
      })

    } catch (error) {
      console.error('Error loading finance context:', error)
      setError('Failed to load financial data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateQuickActions = (stripeAccount, revenue, billing, role, contextLevel) => {
    const actions = []

    // Stripe Connect actions
    if (!stripeAccount?.onboarding_completed) {
      actions.push({
        id: 'connect-stripe',
        title: 'Connect Bank Account',
        description: 'Start accepting payments from customers',
        icon: BanknotesIcon,
        priority: 'high',
        action: 'setup-payments'
      })
    } else if (!stripeAccount?.charges_enabled) {
      actions.push({
        id: 'complete-stripe',
        title: 'Complete Payment Setup',
        description: 'Finish Stripe verification to receive payments',
        icon: CheckCircleIcon,
        priority: 'high',
        action: 'complete-payments'
      })
    }

    // Compensation actions (for shop owners)
    if (role === 'SHOP_OWNER') {
      actions.push({
        id: 'setup-compensation',
        title: 'Configure Staff Pay',
        description: 'Set up commission or booth rent for your team',
        icon: UserGroupIcon,
        priority: 'medium',
        action: 'setup-compensation'
      })
    }

    // Billing actions
    if (billing && billing.costs.total > 50) {
      actions.push({
        id: 'add-payment-method',
        title: 'Update Payment Method',
        description: 'Add a payment method for platform charges',
        icon: CreditCardIcon,
        priority: 'medium',
        action: 'update-billing'
      })
    }

    return actions.slice(0, 3) // Show max 3 actions
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="font-medium text-red-800">Unable to Load Financial Data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button 
                onClick={loadFinanceContext}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // Smart routing based on context
  const { hasStripeConnect, userRole } = financeContext

  // First-time setup flow
  if (!hasStripeConnect) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Set Up Payments</h1>
            <p className="text-gray-600 mt-2">Get started accepting payments in just 3 simple steps</p>
          </div>
          <StreamlinedOnboarding 
            financeContext={financeContext}
            onComplete={() => loadFinanceContext()}
          />
        </div>
      </div>
    )
  }

  // Context-aware dashboard routing
  const { contextLevel } = financeContext
  
  console.log('🚀 UNIFIED FINANCE HUB: Routing decision -', {
    contextLevel,
    userRole: financeContext.userRole,
    hasStripe: financeContext.hasStripeConnect,
    barbershopId: financeContext.barbershopId
  })
  
  // Organization-level view (Enterprise Dashboard)
  if (contextLevel === UNIFIED_CONTEXT_LEVELS.ORGANIZATION) {
    return (
      <OrganizationFinanceDashboard 
        financeContext={financeContext}
        onRefresh={loadFinanceContext}
      />
    )
  }
  
  // Location-level view (Owner Dashboard)
  else if (contextLevel === UNIFIED_CONTEXT_LEVELS.LOCATION && 
          (userRole === 'SHOP_OWNER' || userRole === 'ENTERPRISE_OWNER')) {
    return (
      <OwnerFinanceDashboard 
        financeContext={financeContext}
        onRefresh={loadFinanceContext}
      />
    )
  }
  
  // Resource-level view (Barber Dashboard)
  else {
    return (
      <BarberEarningsDashboard 
        financeContext={financeContext}
        onRefresh={loadFinanceContext}
      />
    )
  }
}