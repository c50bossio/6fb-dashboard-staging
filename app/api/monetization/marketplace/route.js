/**
 * AI Agent Marketplace & Add-ons System
 * Integrates with existing Stripe subscriptions to offer premium AI agents
 */

import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * AI Agent Marketplace Catalog
 * Premium agents available for purchase/subscription
 */
const AGENT_MARKETPLACE = {
  // Premium Individual Agents
  agents: {
    financial_advisor: {
      id: 'agent_financial_advisor',
      name: 'Financial Advisor Pro',
      description: 'Advanced financial analysis, tax optimization, and investment strategies',
      icon: '💰',
      category: 'financial',
      pricing: {
        model: 'subscription',
        monthly: 2999, // $29.99
        yearly: 29999, // $299.99 (2 months free)
        usage_based: false
      },
      features: [
        'Automated financial reporting',
        'Tax optimization strategies',
        'Investment recommendations',
        'Cash flow forecasting',
        'Expense categorization AI'
      ],
      requirements: {
        min_tier: 'professional', // Requires at least Professional tier
        stripe_product_id: process.env.STRIPE_FINANCIAL_ADVISOR_PRODUCT_ID || 'prod_financial_advisor'
      },
      capabilities: [
        'revenue_forecasting_advanced',
        'tax_planning',
        'investment_analysis',
        'financial_reporting_automated',
        'expense_optimization'
      ]
    },
    
    marketing_genius: {
      id: 'agent_marketing_genius',
      name: 'Marketing Genius',
      description: 'AI-powered marketing campaigns, social media automation, and customer acquisition',
      icon: '🚀',
      category: 'marketing',
      pricing: {
        model: 'subscription',
        monthly: 3999, // $39.99
        yearly: 39999, // $399.99
        usage_based: true,
        usage_rates: {
          campaign_creation: 500, // $5 per campaign
          social_post: 50, // $0.50 per post
          email_blast: 100 // $1 per 1000 emails
        }
      },
      features: [
        'Automated campaign creation',
        'Social media scheduling',
        'Content generation',
        'A/B testing automation',
        'ROI tracking'
      ],
      requirements: {
        min_tier: 'starter',
        stripe_product_id: process.env.STRIPE_MARKETING_GENIUS_PRODUCT_ID || 'prod_marketing_genius'
      },
      capabilities: [
        'campaign_automation',
        'content_generation_advanced',
        'social_media_optimization',
        'customer_segmentation_ml',
        'conversion_optimization'
      ]
    },
    
    operations_optimizer: {
      id: 'agent_operations_optimizer',
      name: 'Operations Optimizer',
      description: 'Process automation, resource optimization, and predictive maintenance',
      icon: '⚙️',
      category: 'operations',
      pricing: {
        model: 'subscription',
        monthly: 4999, // $49.99
        yearly: 49999, // $499.99
        usage_based: false
      },
      features: [
        'Workflow automation',
        'Resource allocation AI',
        'Predictive maintenance',
        'Supply chain optimization',
        'Staff scheduling optimization'
      ],
      requirements: {
        min_tier: 'professional',
        stripe_product_id: process.env.STRIPE_OPERATIONS_OPTIMIZER_PRODUCT_ID || 'prod_operations_optimizer'
      },
      capabilities: [
        'workflow_automation_advanced',
        'predictive_maintenance',
        'resource_optimization_ml',
        'supply_chain_ai',
        'scheduling_genetic_algorithm'
      ]
    },
    
    customer_success_pro: {
      id: 'agent_customer_success',
      name: 'Customer Success Pro',
      description: 'Advanced customer service, retention strategies, and satisfaction optimization',
      icon: '🤝',
      category: 'customer',
      pricing: {
        model: 'subscription',
        monthly: 2499, // $24.99
        yearly: 24999, // $249.99
        usage_based: true,
        usage_rates: {
          conversation: 10, // $0.10 per conversation
          sentiment_analysis: 5 // $0.05 per analysis
        }
      },
      features: [
        '24/7 AI customer support',
        'Sentiment analysis',
        'Retention prediction',
        'Personalized responses',
        'Multi-channel support'
      ],
      requirements: {
        min_tier: 'starter',
        stripe_product_id: process.env.STRIPE_CUSTOMER_SUCCESS_PRODUCT_ID || 'prod_customer_success'
      },
      capabilities: [
        'nlp_customer_service',
        'sentiment_analysis_realtime',
        'retention_prediction',
        'personalization_engine',
        'multichannel_orchestration'
      ]
    }
  },
  
  // Agent Bundles
  bundles: {
    growth_package: {
      id: 'bundle_growth',
      name: 'Growth Package',
      description: 'Marketing + Customer Success agents for rapid growth',
      icon: '📈',
      agents: ['marketing_genius', 'customer_success_pro'],
      pricing: {
        monthly: 5999, // $59.99 (save $5)
        yearly: 59999 // $599.99 (save $50)
      },
      discount: '20% off individual prices',
      requirements: {
        min_tier: 'professional'
      }
    },
    
    enterprise_suite: {
      id: 'bundle_enterprise',
      name: 'Enterprise AI Suite',
      description: 'Complete AI agent suite for enterprise operations',
      icon: '🏢',
      agents: ['financial_advisor', 'marketing_genius', 'operations_optimizer', 'customer_success_pro'],
      pricing: {
        monthly: 11999, // $119.99 (save $25)
        yearly: 119999 // $1199.99 (save $250)
      },
      discount: '25% off individual prices',
      requirements: {
        min_tier: 'enterprise'
      }
    }
  },
  
  // Usage-Based Add-ons
  addons: {
    priority_processing: {
      id: 'addon_priority',
      name: 'Priority Processing',
      description: '10x faster AI response times',
      icon: '⚡',
      pricing: {
        monthly: 999 // $9.99
      }
    },
    
    custom_training: {
      id: 'addon_custom_training',
      name: 'Custom AI Training',
      description: 'Train AI on your specific business data',
      icon: '🧠',
      pricing: {
        one_time: 49999 // $499.99
      }
    },
    
    white_label: {
      id: 'addon_white_label',
      name: 'White Label AI',
      description: 'Remove branding, use your own',
      icon: '🏷️',
      pricing: {
        monthly: 4999 // $49.99
      },
      requirements: {
        min_tier: 'enterprise'
      }
    }
  }
}

class MarketplaceManager {
  /**
   * Get available agents for a user based on their subscription tier
   */
  async getAvailableAgents(userId, subscriptionTier) {
    try {
      // Get user's purchased agents
      const { data: purchases } = await supabase
        .from('agent_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
      
      const purchasedIds = purchases?.map(p => p.agent_id) || []
      
      // Filter agents based on tier requirements
      const availableAgents = Object.entries(AGENT_MARKETPLACE.agents)
        .filter(([id, agent]) => {
          const tierLevel = this.getTierLevel(subscriptionTier)
          const requiredLevel = this.getTierLevel(agent.requirements.min_tier)
          return tierLevel >= requiredLevel
        })
        .map(([id, agent]) => ({
          ...agent,
          purchased: purchasedIds.includes(id),
          available: !purchasedIds.includes(id)
        }))
      
      // Filter bundles
      const availableBundles = Object.entries(AGENT_MARKETPLACE.bundles)
        .filter(([id, bundle]) => {
          const tierLevel = this.getTierLevel(subscriptionTier)
          const requiredLevel = this.getTierLevel(bundle.requirements.min_tier)
          return tierLevel >= requiredLevel
        })
        .map(([id, bundle]) => ({
          ...bundle,
          purchased: this.isBundlePurchased(bundle.agents, purchasedIds)
        }))
      
      return {
        agents: availableAgents,
        bundles: availableBundles,
        addons: AGENT_MARKETPLACE.addons,
        user_tier: subscriptionTier
      }
    } catch (error) {
      console.error('Error getting available agents:', error)
      throw error
    }
  }
  
  /**
   * Purchase an AI agent or bundle
   */
  async purchaseAgent(userId, itemId, itemType = 'agent', billingPeriod = 'monthly') {
    try {
      // Get item details
      const item = itemType === 'agent' 
        ? AGENT_MARKETPLACE.agents[itemId]
        : itemType === 'bundle'
        ? AGENT_MARKETPLACE.bundles[itemId]
        : AGENT_MARKETPLACE.addons[itemId]
      
      if (!item) {
        throw new Error('Item not found')
      }
      
      // Check user's subscription tier
      const { data: user } = await supabase
        .from('users')
        .select('subscription_tier, stripe_customer_id')
        .eq('id', userId)
        .single()
      
      if (!user) {
        throw new Error('User not found')
      }
      
      // Verify tier requirements
      if (item.requirements?.min_tier) {
        const userLevel = this.getTierLevel(user.subscription_tier)
        const requiredLevel = this.getTierLevel(item.requirements.min_tier)
        
        if (userLevel < requiredLevel) {
          throw new Error(`Requires ${item.requirements.min_tier} tier or higher`)
        }
      }
      
      // Create Stripe subscription for the agent
      if (stripe && user.stripe_customer_id) {
        const price = billingPeriod === 'yearly' 
          ? item.pricing.yearly 
          : item.pricing.monthly
        
        // Create or get Stripe price
        const stripePrice = await this.getOrCreateStripePrice(item, billingPeriod)
        
        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: user.stripe_customer_id,
          items: [{ price: stripePrice.id }],
          metadata: {
            agent_id: itemId,
            item_type: itemType,
            user_id: userId
          }
        })
        
        // Record purchase in database
        const purchaseData = {
          user_id: userId,
          agent_id: itemId,
          item_type: itemType,
          stripe_subscription_id: subscription.id,
          billing_period: billingPeriod,
          price: price / 100,
          status: 'active',
          capabilities: item.capabilities || [],
          created_at: new Date().toISOString()
        }
        
        if (itemType === 'bundle') {
          // For bundles, create entries for each agent
          for (const agentId of item.agents) {
            await supabase
              .from('agent_purchases')
              .insert({
                ...purchaseData,
                agent_id: agentId,
                parent_bundle: itemId
              })
          }
        } else {
          await supabase
            .from('agent_purchases')
            .insert(purchaseData)
        }
        
        return {
          success: true,
          subscription_id: subscription.id,
          item: item,
          message: `Successfully subscribed to ${item.name}`
        }
      } else {
        // Demo mode - just record the purchase
        await supabase
          .from('agent_purchases')
          .insert({
            user_id: userId,
            agent_id: itemId,
            item_type: itemType,
            billing_period: billingPeriod,
            price: (item.pricing[billingPeriod] || item.pricing.monthly) / 100,
            status: 'active',
            capabilities: item.capabilities || [],
            created_at: new Date().toISOString()
          })
        
        return {
          success: true,
          demo_mode: true,
          item: item,
          message: `Successfully activated ${item.name} (Demo Mode)`
        }
      }
    } catch (error) {
      console.error('Purchase error:', error)
      throw error
    }
  }
  
  /**
   * Cancel an agent subscription
   */
  async cancelAgentSubscription(userId, agentId) {
    try {
      // Get purchase record
      const { data: purchase } = await supabase
        .from('agent_purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .eq('status', 'active')
        .single()
      
      if (!purchase) {
        throw new Error('Active subscription not found')
      }
      
      // Cancel Stripe subscription
      if (stripe && purchase.stripe_subscription_id) {
        await stripe.subscriptions.cancel(purchase.stripe_subscription_id)
      }
      
      // Update database
      await supabase
        .from('agent_purchases')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', purchase.id)
      
      return {
        success: true,
        message: 'Subscription cancelled successfully'
      }
    } catch (error) {
      console.error('Cancellation error:', error)
      throw error
    }
  }
  
  /**
   * Track usage for usage-based agents
   */
  async trackUsage(userId, agentId, usageType, quantity = 1) {
    try {
      // Get agent details
      const agent = AGENT_MARKETPLACE.agents[agentId]
      
      if (!agent?.pricing.usage_based) {
        return { success: true, message: 'Non-usage based agent' }
      }
      
      // Calculate cost
      const rate = agent.pricing.usage_rates[usageType] || 0
      const cost = (rate * quantity) / 100
      
      // Record usage
      await supabase
        .from('agent_usage')
        .insert({
          user_id: userId,
          agent_id: agentId,
          usage_type: usageType,
          quantity,
          cost,
          created_at: new Date().toISOString()
        })
      
      // Create Stripe usage record if applicable
      if (stripe) {
        const { data: purchase } = await supabase
          .from('agent_purchases')
          .select('stripe_subscription_id')
          .eq('user_id', userId)
          .eq('agent_id', agentId)
          .single()
        
        if (purchase?.stripe_subscription_id) {
          // Get subscription
          const subscription = await stripe.subscriptions.retrieve(purchase.stripe_subscription_id)
          
          // Find metered item
          const meteredItem = subscription.items.data.find(item => 
            item.price.recurring?.usage_type === 'metered'
          )
          
          if (meteredItem) {
            await stripe.subscriptionItems.createUsageRecord(
              meteredItem.id,
              {
                quantity,
                timestamp: Math.floor(Date.now() / 1000)
              }
            )
          }
        }
      }
      
      return {
        success: true,
        usage_recorded: {
          type: usageType,
          quantity,
          cost
        }
      }
    } catch (error) {
      console.error('Usage tracking error:', error)
      throw error
    }
  }
  
  // Helper methods
  getTierLevel(tier) {
    const levels = {
      'free': 0,
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    }
    return levels[tier] || 0
  }
  
  isBundlePurchased(bundleAgents, purchasedIds) {
    return bundleAgents.every(agentId => purchasedIds.includes(agentId))
  }
  
  async getOrCreateStripePrice(item, billingPeriod) {
    if (!stripe) return null
    
    try {
      // Check if product exists
      let product
      try {
        product = await stripe.products.retrieve(
          item.requirements?.stripe_product_id || `prod_${item.id}`
        )
      } catch (e) {
        // Create product
        product = await stripe.products.create({
          id: item.requirements?.stripe_product_id || `prod_${item.id}`,
          name: item.name,
          description: item.description,
          metadata: {
            category: item.category,
            capabilities: JSON.stringify(item.capabilities || [])
          }
        })
      }
      
      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: billingPeriod === 'yearly' ? item.pricing.yearly : item.pricing.monthly,
        currency: 'usd',
        recurring: {
          interval: billingPeriod === 'yearly' ? 'year' : 'month'
        },
        metadata: {
          agent_id: item.id,
          billing_period: billingPeriod
        }
      })
      
      return price
    } catch (error) {
      console.error('Stripe price creation error:', error)
      throw error
    }
  }
}

// API Route Handlers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    
    const manager = new MarketplaceManager()
    
    switch (action) {
      case 'catalog':
        // Get full marketplace catalog
        return NextResponse.json({
          success: true,
          marketplace: AGENT_MARKETPLACE
        })
      
      case 'available':
        // Get available agents for user
        if (!userId) {
          return NextResponse.json(
            { error: 'user_id required' },
            { status: 400 }
          )
        }
        
        const { data: user } = await supabase
          .from('users')
          .select('subscription_tier')
          .eq('id', userId)
          .single()
        
        const available = await manager.getAvailableAgents(
          userId, 
          user?.subscription_tier || 'free'
        )
        
        return NextResponse.json({
          success: true,
          ...available
        })
      
      case 'purchases':
        // Get user's purchased agents
        if (!userId) {
          return NextResponse.json(
            { error: 'user_id required' },
            { status: 400 }
          )
        }
        
        const { data: purchases } = await supabase
          .from('agent_purchases')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
        
        return NextResponse.json({
          success: true,
          purchases: purchases || []
        })
      
      case 'usage':
        // Get usage statistics
        if (!userId) {
          return NextResponse.json(
            { error: 'user_id required' },
            { status: 400 }
          )
        }
        
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        
        const { data: usage } = await supabase
          .from('agent_usage')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startOfMonth.toISOString())
        
        const summary = usage?.reduce((acc, record) => {
          if (!acc[record.agent_id]) {
            acc[record.agent_id] = {
              total_cost: 0,
              usage_count: 0,
              by_type: {}
            }
          }
          
          acc[record.agent_id].total_cost += record.cost
          acc[record.agent_id].usage_count += record.quantity
          
          if (!acc[record.agent_id].by_type[record.usage_type]) {
            acc[record.agent_id].by_type[record.usage_type] = {
              count: 0,
              cost: 0
            }
          }
          
          acc[record.agent_id].by_type[record.usage_type].count += record.quantity
          acc[record.agent_id].by_type[record.usage_type].cost += record.cost
          
          return acc
        }, {}) || {}
        
        return NextResponse.json({
          success: true,
          usage_summary: summary,
          period: {
            start: startOfMonth.toISOString(),
            end: new Date().toISOString()
          }
        })
      
      default:
        return NextResponse.json({
          success: true,
          message: 'AI Agent Marketplace API',
          endpoints: [
            'GET /?action=catalog - Get full marketplace catalog',
            'GET /?action=available&user_id=X - Get available agents for user',
            'GET /?action=purchases&user_id=X - Get purchased agents',
            'GET /?action=usage&user_id=X - Get usage statistics',
            'POST / - Purchase an agent',
            'DELETE / - Cancel subscription'
          ]
        })
    }
  } catch (error) {
    console.error('Marketplace GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, user_id, agent_id, item_type, billing_period, usage_data } = body
    
    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id required' },
        { status: 400 }
      )
    }
    
    const manager = new MarketplaceManager()
    
    switch (action) {
      case 'purchase':
        if (!agent_id) {
          return NextResponse.json(
            { error: 'agent_id required' },
            { status: 400 }
          )
        }
        
        const result = await manager.purchaseAgent(
          user_id,
          agent_id,
          item_type || 'agent',
          billing_period || 'monthly'
        )
        
        return NextResponse.json(result)
      
      case 'track_usage':
        if (!agent_id || !usage_data) {
          return NextResponse.json(
            { error: 'agent_id and usage_data required' },
            { status: 400 }
          )
        }
        
        const usage = await manager.trackUsage(
          user_id,
          agent_id,
          usage_data.type,
          usage_data.quantity || 1
        )
        
        return NextResponse.json(usage)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Marketplace POST error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const agentId = searchParams.get('agent_id')
    
    if (!userId || !agentId) {
      return NextResponse.json(
        { error: 'user_id and agent_id required' },
        { status: 400 }
      )
    }
    
    const manager = new MarketplaceManager()
    const result = await manager.cancelAgentSubscription(userId, agentId)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Marketplace DELETE error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}