/**
 * Feature Gates System for AI Agents
 * Controls access to features based on subscription tier and purchased add-ons
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Feature Gate Definitions
 * Defines which features are available at each subscription tier
 */
const FEATURE_GATES = {
  // Core AI Agent Access
  ai_agents: {
    basic_chat: {
      name: 'Basic AI Chat',
      description: 'Simple Q&A with AI assistant',
      tiers: ['free', 'starter', 'professional', 'enterprise'],
      limits: {
        free: { requests_per_month: 10 },
        starter: { requests_per_month: 500 },
        professional: { requests_per_month: 5000 },
        enterprise: { requests_per_month: -1 } // Unlimited
      }
    },
    
    customer_service_agent: {
      name: 'Customer Service AI Agent',
      description: 'Automated customer support and booking',
      tiers: ['starter', 'professional', 'enterprise'],
      requires_addon: false,
      limits: {
        starter: { conversations_per_month: 100 },
        professional: { conversations_per_month: 1000 },
        enterprise: { conversations_per_month: -1 }
      }
    },
    
    marketing_agent: {
      name: 'Marketing AI Agent',
      description: 'Campaign creation and optimization',
      tiers: ['professional', 'enterprise'],
      requires_addon: true, // Requires marketplace purchase
      addon_id: 'agent_marketing_genius',
      limits: {
        professional: { campaigns_per_month: 5 },
        enterprise: { campaigns_per_month: -1 }
      }
    },
    
    financial_agent: {
      name: 'Financial AI Agent',
      description: 'Financial analysis and forecasting',
      tiers: ['professional', 'enterprise'],
      requires_addon: true,
      addon_id: 'agent_financial_advisor',
      limits: {
        professional: { reports_per_month: 10 },
        enterprise: { reports_per_month: -1 }
      }
    },
    
    operations_agent: {
      name: 'Operations AI Agent',
      description: 'Process optimization and automation',
      tiers: ['enterprise'],
      requires_addon: true,
      addon_id: 'agent_operations_optimizer',
      limits: {
        enterprise: { optimizations_per_month: -1 }
      }
    },
    
    orchestrator: {
      name: 'AI Agent Orchestrator',
      description: 'Multi-agent coordination for complex tasks',
      tiers: ['enterprise'],
      requires_addon: false,
      limits: {
        enterprise: { orchestrations_per_month: -1 }
      }
    }
  },
  
  // Analytics Features
  analytics: {
    basic_dashboard: {
      name: 'Basic Analytics Dashboard',
      description: 'Revenue and appointment metrics',
      tiers: ['free', 'starter', 'professional', 'enterprise'],
      limits: {
        free: { data_retention_days: 7 },
        starter: { data_retention_days: 30 },
        professional: { data_retention_days: 90 },
        enterprise: { data_retention_days: 365 }
      }
    },
    
    advanced_analytics: {
      name: 'Advanced Analytics',
      description: 'Predictive analytics and ML insights',
      tiers: ['professional', 'enterprise'],
      limits: {
        professional: { predictions_per_month: 10 },
        enterprise: { predictions_per_month: -1 }
      }
    },
    
    custom_reports: {
      name: 'Custom Report Builder',
      description: 'Create custom analytics reports',
      tiers: ['enterprise'],
      limits: {
        enterprise: { custom_reports: -1 }
      }
    }
  },
  
  // Automation Features
  automation: {
    basic_automation: {
      name: 'Basic Automation',
      description: 'Appointment reminders and follow-ups',
      tiers: ['starter', 'professional', 'enterprise'],
      limits: {
        starter: { automations: 3 },
        professional: { automations: 10 },
        enterprise: { automations: -1 }
      }
    },
    
    workflow_automation: {
      name: 'Workflow Automation',
      description: 'Complex multi-step automations',
      tiers: ['professional', 'enterprise'],
      limits: {
        professional: { workflows: 5 },
        enterprise: { workflows: -1 }
      }
    },
    
    api_access: {
      name: 'API Access',
      description: 'Programmatic access to platform',
      tiers: ['enterprise'],
      limits: {
        enterprise: { api_calls_per_hour: 1000 }
      }
    }
  },
  
  // Multi-Location Features
  multi_location: {
    single_location: {
      name: 'Single Location',
      description: 'Manage one barbershop',
      tiers: ['free', 'starter'],
      limits: {
        free: { locations: 1 },
        starter: { locations: 1 }
      }
    },
    
    multi_location: {
      name: 'Multi-Location Management',
      description: 'Manage multiple locations',
      tiers: ['professional', 'enterprise'],
      limits: {
        professional: { locations: 5 },
        enterprise: { locations: -1 }
      }
    },
    
    franchise_management: {
      name: 'Franchise Management',
      description: 'Full franchise operations',
      tiers: ['enterprise'],
      limits: {
        enterprise: { franchises: -1 }
      }
    }
  },
  
  // Integration Features
  integrations: {
    basic_integrations: {
      name: 'Basic Integrations',
      description: 'Google Calendar, Email',
      tiers: ['starter', 'professional', 'enterprise'],
      limits: {
        starter: { integrations: 2 },
        professional: { integrations: 5 },
        enterprise: { integrations: -1 }
      }
    },
    
    pos_integration: {
      name: 'POS Integration',
      description: 'Point of Sale system integration',
      tiers: ['professional', 'enterprise'],
      requires_addon: false
    },
    
    accounting_integration: {
      name: 'Accounting Integration',
      description: 'QuickBooks, Xero integration',
      tiers: ['enterprise'],
      requires_addon: false
    }
  }
}

class FeatureGateManager {
  /**
   * Check if a user has access to a specific feature
   */
  async checkAccess(userId, featureCategory, featureName) {
    try {
      // Get user's subscription tier and purchased add-ons
      const { data: user } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          subscription_status,
          agent_purchases(
            agent_id,
            status
          )
        `)
        .eq('id', userId)
        .single()
      
      if (!user) {
        return {
          hasAccess: false,
          reason: 'User not found'
        }
      }
      
      // Check if subscription is active
      if (user.subscription_status !== 'active' && user.subscription_status !== 'trial') {
        return {
          hasAccess: false,
          reason: 'Subscription not active',
          requiredAction: 'activate_subscription'
        }
      }
      
      // Get feature definition
      const feature = FEATURE_GATES[featureCategory]?.[featureName]
      
      if (!feature) {
        return {
          hasAccess: false,
          reason: 'Feature not found'
        }
      }
      
      // Check tier requirements
      const userTier = user.subscription_tier || 'free'
      if (!feature.tiers.includes(userTier)) {
        const requiredTier = feature.tiers[0]
        return {
          hasAccess: false,
          reason: 'Insufficient subscription tier',
          currentTier: userTier,
          requiredTier,
          upgradeUrl: `/billing/upgrade?tier=${requiredTier}`
        }
      }
      
      // Check add-on requirements
      if (feature.requires_addon) {
        const hasAddon = user.agent_purchases?.some(
          p => p.agent_id === feature.addon_id && p.status === 'active'
        )
        
        if (!hasAddon) {
          return {
            hasAccess: false,
            reason: 'Add-on required',
            requiredAddon: feature.addon_id,
            purchaseUrl: `/marketplace/agent/${feature.addon_id}`
          }
        }
      }
      
      // Check usage limits
      const limits = feature.limits?.[userTier]
      if (limits) {
        const usage = await this.getFeatureUsage(userId, featureCategory, featureName)
        
        // Check various limit types
        for (const [limitType, limitValue] of Object.entries(limits)) {
          if (limitValue !== -1 && usage[limitType] >= limitValue) {
            return {
              hasAccess: false,
              reason: 'Usage limit exceeded',
              limitType,
              currentUsage: usage[limitType],
              limit: limitValue,
              upgradeUrl: `/billing/upgrade`
            }
          }
        }
      }
      
      return {
        hasAccess: true,
        tier: userTier,
        limits: limits || {},
        usage: await this.getFeatureUsage(userId, featureCategory, featureName)
      }
    } catch (error) {
      console.error('Access check error:', error)
      return {
        hasAccess: false,
        reason: 'Error checking access',
        error: error.message
      }
    }
  }
  
  /**
   * Get all available features for a user
   */
  async getAvailableFeatures(userId) {
    try {
      // Get user details
      const { data: user } = await supabase
        .from('users')
        .select(`
          subscription_tier,
          subscription_status,
          agent_purchases(
            agent_id,
            status
          )
        `)
        .eq('id', userId)
        .single()
      
      if (!user) {
        return { error: 'User not found' }
      }
      
      const userTier = user.subscription_tier || 'free'
      const purchasedAddons = user.agent_purchases
        ?.filter(p => p.status === 'active')
        .map(p => p.agent_id) || []
      
      const availableFeatures = {}
      
      // Check each feature category
      for (const [category, features] of Object.entries(FEATURE_GATES)) {
        availableFeatures[category] = {}
        
        for (const [featureName, feature] of Object.entries(features)) {
          // Check if tier allows access
          const tierAllowed = feature.tiers.includes(userTier)
          
          // Check if add-on is required and purchased
          const addonRequired = feature.requires_addon
          const addonPurchased = !addonRequired || purchasedAddons.includes(feature.addon_id)
          
          availableFeatures[category][featureName] = {
            name: feature.name,
            description: feature.description,
            available: tierAllowed && addonPurchased,
            tierAllowed,
            addonRequired,
            addonPurchased,
            limits: feature.limits?.[userTier] || {},
            requiresUpgrade: !tierAllowed ? feature.tiers[0] : null,
            requiresAddon: addonRequired && !addonPurchased ? feature.addon_id : null
          }
        }
      }
      
      return {
        tier: userTier,
        features: availableFeatures,
        purchasedAddons
      }
    } catch (error) {
      console.error('Get features error:', error)
      return { error: error.message }
    }
  }
  
  /**
   * Track feature usage
   */
  async trackUsage(userId, featureCategory, featureName, usageType = 'request', quantity = 1) {
    try {
      // Record usage
      await supabase
        .from('feature_usage')
        .insert({
          user_id: userId,
          feature_category: featureCategory,
          feature_name: featureName,
          usage_type: usageType,
          quantity,
          created_at: new Date().toISOString()
        })
      
      // Check if limit exceeded after usage
      const access = await this.checkAccess(userId, featureCategory, featureName)
      
      if (!access.hasAccess && access.reason === 'Usage limit exceeded') {
        // Send notification about limit
        await this.notifyLimitExceeded(userId, featureCategory, featureName, access)
      }
      
      return {
        success: true,
        currentAccess: access
      }
    } catch (error) {
      console.error('Track usage error:', error)
      return { error: error.message }
    }
  }
  
  /**
   * Get feature usage statistics
   */
  async getFeatureUsage(userId, featureCategory, featureName) {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      
      // Get usage for current month
      const { data: usage } = await supabase
        .from('feature_usage')
        .select('usage_type, quantity')
        .eq('user_id', userId)
        .eq('feature_category', featureCategory)
        .eq('feature_name', featureName)
        .gte('created_at', startOfMonth.toISOString())
      
      // Aggregate usage by type
      const aggregated = {}
      usage?.forEach(record => {
        const key = `${record.usage_type}_per_month`
        aggregated[key] = (aggregated[key] || 0) + record.quantity
      })
      
      // Add default counters
      return {
        requests_per_month: aggregated.requests_per_month || 0,
        conversations_per_month: aggregated.conversations_per_month || 0,
        campaigns_per_month: aggregated.campaigns_per_month || 0,
        reports_per_month: aggregated.reports_per_month || 0,
        predictions_per_month: aggregated.predictions_per_month || 0,
        optimizations_per_month: aggregated.optimizations_per_month || 0,
        orchestrations_per_month: aggregated.orchestrations_per_month || 0,
        api_calls_per_hour: await this.getHourlyUsage(userId, 'api_call')
      }
    } catch (error) {
      console.error('Get usage error:', error)
      return {}
    }
  }
  
  /**
   * Get hourly usage for rate limiting
   */
  async getHourlyUsage(userId, usageType) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const { data: usage } = await supabase
      .from('feature_usage')
      .select('quantity')
      .eq('user_id', userId)
      .eq('usage_type', usageType)
      .gte('created_at', oneHourAgo.toISOString())
    
    return usage?.reduce((sum, record) => sum + record.quantity, 0) || 0
  }
  
  /**
   * Notify user about exceeded limits
   */
  async notifyLimitExceeded(userId, featureCategory, featureName, accessInfo) {
    // Create notification
    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'limit_exceeded',
        title: 'Feature Limit Exceeded',
        message: `You've reached your ${accessInfo.limitType} limit for ${featureName}. Upgrade to continue using this feature.`,
        data: {
          feature: featureName,
          category: featureCategory,
          limit: accessInfo.limit,
          currentUsage: accessInfo.currentUsage,
          upgradeUrl: accessInfo.upgradeUrl
        },
        created_at: new Date().toISOString()
      })
  }
  
  /**
   * Get feature recommendations based on usage
   */
  async getRecommendations(userId) {
    try {
      // Get user's current tier and usage
      const features = await this.getAvailableFeatures(userId)
      const { data: recentUsage } = await supabase
        .from('feature_usage')
        .select('feature_category, feature_name, quantity')
        .eq('user_id', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
      const recommendations = []
      
      // Analyze usage patterns
      const usageByFeature = {}
      recentUsage?.forEach(record => {
        const key = `${record.feature_category}_${record.feature_name}`
        usageByFeature[key] = (usageByFeature[key] || 0) + record.quantity
      })
      
      // Check for features nearing limits
      for (const [category, categoryFeatures] of Object.entries(features.features)) {
        for (const [featureName, feature] of Object.entries(categoryFeatures)) {
          if (feature.available && feature.limits) {
            const usage = usageByFeature[`${category}_${featureName}`] || 0
            
            // Check each limit type
            for (const [limitType, limitValue] of Object.entries(feature.limits)) {
              if (limitValue !== -1 && usage >= limitValue * 0.8) {
                recommendations.push({
                  type: 'approaching_limit',
                  feature: featureName,
                  category,
                  message: `You're approaching your ${limitType} limit for ${feature.name}`,
                  action: 'Consider upgrading for unlimited access',
                  priority: 'high'
                })
              }
            }
          }
          
          // Recommend locked features with high potential value
          if (!feature.available && feature.requiresUpgrade) {
            recommendations.push({
              type: 'upgrade_suggestion',
              feature: featureName,
              category,
              message: `Unlock ${feature.name} with ${feature.requiresUpgrade} tier`,
              benefits: feature.description,
              priority: 'medium'
            })
          }
          
          if (!feature.available && feature.requiresAddon) {
            recommendations.push({
              type: 'addon_suggestion',
              feature: featureName,
              category,
              message: `Enhance your capabilities with ${feature.name}`,
              addonId: feature.requiresAddon,
              priority: 'low'
            })
          }
        }
      }
      
      return {
        recommendations,
        currentTier: features.tier,
        totalRecommendations: recommendations.length
      }
    } catch (error) {
      console.error('Get recommendations error:', error)
      return { error: error.message }
    }
  }
}

// API Route Handlers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id required' },
        { status: 400 }
      )
    }
    
    const manager = new FeatureGateManager()
    
    switch (action) {
      case 'check':
        // Check access to specific feature
        const category = searchParams.get('category')
        const feature = searchParams.get('feature')
        
        if (!category || !feature) {
          return NextResponse.json(
            { error: 'category and feature required' },
            { status: 400 }
          )
        }
        
        const access = await manager.checkAccess(userId, category, feature)
        return NextResponse.json(access)
      
      case 'features':
        // Get all available features
        const features = await manager.getAvailableFeatures(userId)
        return NextResponse.json(features)
      
      case 'usage':
        // Get usage statistics
        const usageCategory = searchParams.get('category')
        const usageFeature = searchParams.get('feature')
        
        if (!usageCategory || !usageFeature) {
          return NextResponse.json(
            { error: 'category and feature required' },
            { status: 400 }
          )
        }
        
        const usage = await manager.getFeatureUsage(userId, usageCategory, usageFeature)
        return NextResponse.json({ usage })
      
      case 'recommendations':
        // Get feature recommendations
        const recommendations = await manager.getRecommendations(userId)
        return NextResponse.json(recommendations)
      
      case 'gates':
        // Get all feature gate definitions
        return NextResponse.json({
          gates: FEATURE_GATES
        })
      
      default:
        return NextResponse.json({
          message: 'Feature Gates API',
          endpoints: [
            'GET /?action=check&user_id=X&category=Y&feature=Z - Check feature access',
            'GET /?action=features&user_id=X - Get available features',
            'GET /?action=usage&user_id=X&category=Y&feature=Z - Get usage stats',
            'GET /?action=recommendations&user_id=X - Get recommendations',
            'GET /?action=gates - Get gate definitions',
            'POST / - Track feature usage'
          ]
        })
    }
  } catch (error) {
    console.error('Feature gates GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, category, feature, usage_type, quantity } = body
    
    if (!user_id || !category || !feature) {
      return NextResponse.json(
        { error: 'user_id, category, and feature required' },
        { status: 400 }
      )
    }
    
    const manager = new FeatureGateManager()
    
    // First check if user has access
    const access = await manager.checkAccess(user_id, category, feature)
    
    if (!access.hasAccess) {
      return NextResponse.json(
        {
          error: 'Access denied',
          ...access
        },
        { status: 403 }
      )
    }
    
    // Track usage
    const result = await manager.trackUsage(
      user_id,
      category,
      feature,
      usage_type || 'request',
      quantity || 1
    )
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Feature gates POST error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}