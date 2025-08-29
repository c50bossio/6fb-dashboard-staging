/**
 * Revenue Sharing System for Multi-Location Franchises
 * Handles commission distribution, franchise fees, and partner payouts
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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
 * Revenue Sharing Models
 */
const REVENUE_MODELS = {
  franchise: {
    name: 'Franchise Model',
    description: 'Standard franchise revenue sharing',
    splits: {
      platform: 0.20, // 20% to platform
      franchise_owner: 0.10, // 10% franchise fee
      location: 0.70 // 70% to location
    },
    minimum_platform_fee: 500 // $5 minimum per transaction
  },
  
  partnership: {
    name: 'Partnership Model',
    description: 'Equal partnership revenue sharing',
    splits: {
      platform: 0.15, // 15% to platform
      partner_a: 0.425, // 42.5% to partner A
      partner_b: 0.425 // 42.5% to partner B
    },
    minimum_platform_fee: 300
  },
  
  commission: {
    name: 'Commission Model',
    description: 'Commission-based revenue for independent barbers',
    splits: {
      platform: 0.10, // 10% to platform
      shop_owner: 0.30, // 30% to shop owner (chair rental)
      barber: 0.60 // 60% to barber
    },
    minimum_platform_fee: 200
  },
  
  subscription_share: {
    name: 'Subscription Revenue Share',
    description: 'Sharing subscription revenue across locations',
    splits: {
      platform: 0.30, // 30% to platform
      franchise_network: 0.20, // 20% to franchise network pool
      location: 0.50 // 50% to originating location
    },
    minimum_platform_fee: 0 // No minimum for subscriptions
  }
}

class RevenueShareManager {
  /**
   * Calculate revenue distribution for a transaction
   */
  async calculateDistribution(transaction) {
    const { 
      amount, 
      type, 
      location_id, 
      barber_id, 
      organization_id,
      model_type = 'franchise' 
    } = transaction
    
    try {
      // Get the revenue model
      const model = REVENUE_MODELS[model_type]
      if (!model) {
        throw new Error('Invalid revenue model')
      }
      
      // Get organization and location details
      const { data: location } = await supabase
        .from('locations')
        .select('*, organizations(*)')
        .eq('id', location_id)
        .single()
      
      // Calculate splits
      const distribution = {}
      let remaining = amount
      
      // Platform fee (with minimum)
      const platformFee = Math.max(
        amount * model.splits.platform,
        model.minimum_platform_fee
      )
      distribution.platform = {
        amount: platformFee,
        percentage: (platformFee / amount) * 100,
        recipient: 'platform',
        recipient_id: 'platform_account'
      }
      remaining -= platformFee
      
      // Model-specific distribution
      switch (model_type) {
        case 'franchise':
          // Franchise owner fee
          if (location?.organizations?.owner_id) {
            const franchiseFee = amount * model.splits.franchise_owner
            distribution.franchise_owner = {
              amount: franchiseFee,
              percentage: (franchiseFee / amount) * 100,
              recipient: 'franchise_owner',
              recipient_id: location.organizations.owner_id
            }
            remaining -= franchiseFee
          }
          
          // Location gets the rest
          distribution.location = {
            amount: remaining,
            percentage: (remaining / amount) * 100,
            recipient: 'location',
            recipient_id: location_id
          }
          break
        
        case 'commission':
          // Shop owner commission
          const shopCommission = amount * model.splits.shop_owner
          distribution.shop_owner = {
            amount: shopCommission,
            percentage: (shopCommission / amount) * 100,
            recipient: 'shop_owner',
            recipient_id: location?.owner_id
          }
          remaining -= shopCommission
          
          // Barber gets the rest
          if (barber_id) {
            distribution.barber = {
              amount: remaining,
              percentage: (remaining / amount) * 100,
              recipient: 'barber',
              recipient_id: barber_id
            }
          }
          break
        
        case 'partnership':
          // Split between partners
          const partnerSplit = remaining / 2
          distribution.partner_a = {
            amount: partnerSplit,
            percentage: (partnerSplit / amount) * 100,
            recipient: 'partner',
            recipient_id: location?.partner_a_id
          }
          distribution.partner_b = {
            amount: partnerSplit,
            percentage: (partnerSplit / amount) * 100,
            recipient: 'partner',
            recipient_id: location?.partner_b_id
          }
          break
        
        case 'subscription_share':
          // Franchise network pool
          const networkShare = amount * model.splits.franchise_network
          distribution.franchise_network = {
            amount: networkShare,
            percentage: (networkShare / amount) * 100,
            recipient: 'franchise_pool',
            recipient_id: organization_id
          }
          remaining -= networkShare
          
          // Location gets the rest
          distribution.location = {
            amount: remaining,
            percentage: (remaining / amount) * 100,
            recipient: 'location',
            recipient_id: location_id
          }
          break
      }
      
      return {
        transaction_amount: amount,
        model: model.name,
        distribution,
        total_distributed: Object.values(distribution).reduce((sum, d) => sum + d.amount, 0)
      }
    } catch (error) {
      console.error('Distribution calculation error:', error)
      throw error
    }
  }
  
  /**
   * Process a revenue share payout
   */
  async processPayout(transactionId) {
    try {
      // Get transaction details
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()
      
      if (!transaction) {
        throw new Error('Transaction not found')
      }
      
      // Calculate distribution
      const distribution = await this.calculateDistribution(transaction)
      
      // Process payouts via Stripe Connect
      const payouts = []
      
      for (const [key, share] of Object.entries(distribution.distribution)) {
        if (key === 'platform') {
          // Platform fee stays in main account
          continue
        }
        
        // Get recipient's Stripe account
        const { data: recipient } = await supabase
          .from('stripe_accounts')
          .select('stripe_account_id')
          .eq('user_id', share.recipient_id)
          .single()
        
        if (recipient?.stripe_account_id && stripe) {
          // Create transfer to connected account
          const transfer = await stripe.transfers.create({
            amount: Math.floor(share.amount), // Amount in cents
            currency: 'usd',
            destination: recipient.stripe_account_id,
            metadata: {
              transaction_id: transactionId,
              share_type: key,
              percentage: share.percentage
            }
          })
          
          payouts.push({
            recipient: key,
            amount: share.amount,
            transfer_id: transfer.id,
            status: 'completed'
          })
        } else {
          // Record pending payout
          payouts.push({
            recipient: key,
            amount: share.amount,
            status: 'pending',
            reason: 'No Stripe account connected'
          })
        }
      }
      
      // Record payout in database
      await supabase
        .from('revenue_shares')
        .insert({
          transaction_id: transactionId,
          distribution: distribution.distribution,
          payouts,
          status: payouts.every(p => p.status === 'completed') ? 'completed' : 'partial',
          processed_at: new Date().toISOString()
        })
      
      return {
        success: true,
        distribution,
        payouts
      }
    } catch (error) {
      console.error('Payout processing error:', error)
      throw error
    }
  }
  
  /**
   * Get revenue share analytics
   */
  async getAnalytics(organizationId, period = '30d') {
    try {
      const startDate = this.getStartDate(period)
      
      // Get all revenue shares for organization
      const { data: shares } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          transactions(*)
        `)
        .gte('created_at', startDate.toISOString())
        .or(`
          distribution->platform->recipient_id.eq.${organizationId},
          distribution->franchise_owner->recipient_id.eq.${organizationId},
          distribution->location->recipient_id.eq.${organizationId}
        `)
      
      // Calculate analytics
      const analytics = {
        total_revenue: 0,
        platform_fees: 0,
        franchise_fees: 0,
        location_revenue: 0,
        barber_commissions: 0,
        transaction_count: shares?.length || 0,
        by_model: {},
        by_location: {},
        by_barber: {},
        trends: []
      }
      
      // Process each share
      shares?.forEach(share => {
        const dist = share.distribution
        
        // Total revenue
        analytics.total_revenue += share.transactions?.amount || 0
        
        // Platform fees
        if (dist.platform) {
          analytics.platform_fees += dist.platform.amount
        }
        
        // Franchise fees
        if (dist.franchise_owner) {
          analytics.franchise_fees += dist.franchise_owner.amount
        }
        
        // Location revenue
        if (dist.location) {
          analytics.location_revenue += dist.location.amount
          
          // By location breakdown
          const locId = dist.location.recipient_id
          if (!analytics.by_location[locId]) {
            analytics.by_location[locId] = {
              revenue: 0,
              transactions: 0
            }
          }
          analytics.by_location[locId].revenue += dist.location.amount
          analytics.by_location[locId].transactions++
        }
        
        // Barber commissions
        if (dist.barber) {
          analytics.barber_commissions += dist.barber.amount
          
          // By barber breakdown
          const barberId = dist.barber.recipient_id
          if (!analytics.by_barber[barberId]) {
            analytics.by_barber[barberId] = {
              revenue: 0,
              transactions: 0
            }
          }
          analytics.by_barber[barberId].revenue += dist.barber.amount
          analytics.by_barber[barberId].transactions++
        }
        
        // By model breakdown
        const model = share.transactions?.model_type || 'franchise'
        if (!analytics.by_model[model]) {
          analytics.by_model[model] = {
            revenue: 0,
            transactions: 0
          }
        }
        analytics.by_model[model].revenue += share.transactions?.amount || 0
        analytics.by_model[model].transactions++
      })
      
      // Calculate trends
      analytics.trends = await this.calculateTrends(organizationId, startDate)
      
      // Calculate percentages
      analytics.percentages = {
        platform_fee_rate: (analytics.platform_fees / analytics.total_revenue) * 100,
        franchise_fee_rate: (analytics.franchise_fees / analytics.total_revenue) * 100,
        location_retention: (analytics.location_revenue / analytics.total_revenue) * 100,
        barber_commission_rate: (analytics.barber_commissions / analytics.total_revenue) * 100
      }
      
      return analytics
    } catch (error) {
      console.error('Analytics error:', error)
      throw error
    }
  }
  
  /**
   * Configure revenue sharing for an organization
   */
  async configureRevenueModel(organizationId, configuration) {
    try {
      const {
        model_type,
        custom_splits,
        minimum_fees,
        auto_payout,
        payout_schedule
      } = configuration
      
      // Validate model
      if (!REVENUE_MODELS[model_type] && !custom_splits) {
        throw new Error('Invalid revenue model configuration')
      }
      
      // Save configuration
      const config = {
        organization_id: organizationId,
        model_type,
        custom_splits: custom_splits || null,
        minimum_fees: minimum_fees || REVENUE_MODELS[model_type]?.minimum_platform_fee,
        auto_payout: auto_payout !== false,
        payout_schedule: payout_schedule || 'daily',
        updated_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('revenue_configurations')
        .upsert(config, {
          onConflict: 'organization_id'
        })
      
      if (error) throw error
      
      return {
        success: true,
        configuration: config
      }
    } catch (error) {
      console.error('Configuration error:', error)
      throw error
    }
  }
  
  /**
   * Get pending payouts
   */
  async getPendingPayouts(organizationId) {
    try {
      const { data: pending } = await supabase
        .from('revenue_shares')
        .select(`
          *,
          transactions(*)
        `)
        .eq('status', 'pending')
        .or(`
          distribution->franchise_owner->recipient_id.eq.${organizationId},
          distribution->location->recipient_id.eq.${organizationId}
        `)
      
      const summary = {
        total_pending: 0,
        pending_count: pending?.length || 0,
        by_recipient: {},
        oldest_pending: null
      }
      
      pending?.forEach(share => {
        share.payouts?.forEach(payout => {
          if (payout.status === 'pending') {
            summary.total_pending += payout.amount
            
            if (!summary.by_recipient[payout.recipient]) {
              summary.by_recipient[payout.recipient] = {
                amount: 0,
                count: 0
              }
            }
            summary.by_recipient[payout.recipient].amount += payout.amount
            summary.by_recipient[payout.recipient].count++
          }
        })
        
        if (!summary.oldest_pending || new Date(share.created_at) < new Date(summary.oldest_pending)) {
          summary.oldest_pending = share.created_at
        }
      })
      
      return summary
    } catch (error) {
      console.error('Pending payouts error:', error)
      throw error
    }
  }
  
  /**
   * Process batch payouts
   */
  async processBatchPayouts(organizationId) {
    try {
      // Get all pending payouts
      const { data: pending } = await supabase
        .from('revenue_shares')
        .select('*')
        .eq('status', 'pending')
        .or(`
          distribution->franchise_owner->recipient_id.eq.${organizationId},
          distribution->location->recipient_id.eq.${organizationId}
        `)
        .limit(100) // Process up to 100 at a time
      
      const results = []
      
      for (const share of pending || []) {
        try {
          const result = await this.processPayout(share.transaction_id)
          results.push({
            transaction_id: share.transaction_id,
            status: 'success',
            ...result
          })
        } catch (error) {
          results.push({
            transaction_id: share.transaction_id,
            status: 'failed',
            error: error.message
          })
        }
      }
      
      return {
        success: true,
        processed: results.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results
      }
    } catch (error) {
      console.error('Batch payout error:', error)
      throw error
    }
  }
  
  // Helper methods
  getStartDate(period) {
    const now = new Date()
    const startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      default:
        startDate.setDate(now.getDate() - 30)
    }
    
    return startDate
  }
  
  async calculateTrends(organizationId, startDate) {
    // Calculate daily trends
    const { data: dailyData } = await supabase
      .from('revenue_shares')
      .select('created_at, distribution')
      .gte('created_at', startDate.toISOString())
      .or(`
        distribution->franchise_owner->recipient_id.eq.${organizationId},
        distribution->location->recipient_id.eq.${organizationId}
      `)
      .order('created_at')
    
    const trends = {}
    
    dailyData?.forEach(share => {
      const date = new Date(share.created_at).toISOString().split('T')[0]
      if (!trends[date]) {
        trends[date] = {
          revenue: 0,
          transactions: 0
        }
      }
      
      Object.values(share.distribution).forEach(dist => {
        trends[date].revenue += dist.amount
      })
      trends[date].transactions++
    })
    
    return Object.entries(trends).map(([date, data]) => ({
      date,
      ...data
    }))
  }
}

// API Route Handlers
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const organizationId = searchParams.get('organization_id')
    
    const manager = new RevenueShareManager()
    
    switch (action) {
      case 'models':
        // Get available revenue models
        return NextResponse.json({
          success: true,
          models: REVENUE_MODELS
        })
      
      case 'calculate':
        // Calculate distribution for a transaction
        const amount = parseFloat(searchParams.get('amount') || '0')
        const modelType = searchParams.get('model') || 'franchise'
        const locationId = searchParams.get('location_id')
        
        if (!amount || !locationId) {
          return NextResponse.json(
            { error: 'amount and location_id required' },
            { status: 400 }
          )
        }
        
        const distribution = await manager.calculateDistribution({
          amount,
          location_id: locationId,
          model_type: modelType
        })
        
        return NextResponse.json({
          success: true,
          distribution
        })
      
      case 'analytics':
        // Get revenue share analytics
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organization_id required' },
            { status: 400 }
          )
        }
        
        const period = searchParams.get('period') || '30d'
        const analytics = await manager.getAnalytics(organizationId, period)
        
        return NextResponse.json({
          success: true,
          analytics
        })
      
      case 'pending':
        // Get pending payouts
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organization_id required' },
            { status: 400 }
          )
        }
        
        const pending = await manager.getPendingPayouts(organizationId)
        
        return NextResponse.json({
          success: true,
          pending
        })
      
      case 'configuration':
        // Get revenue configuration
        if (!organizationId) {
          return NextResponse.json(
            { error: 'organization_id required' },
            { status: 400 }
          )
        }
        
        const { data: config } = await supabase
          .from('revenue_configurations')
          .select('*')
          .eq('organization_id', organizationId)
          .single()
        
        return NextResponse.json({
          success: true,
          configuration: config || {
            model_type: 'franchise',
            auto_payout: true,
            payout_schedule: 'daily'
          }
        })
      
      default:
        return NextResponse.json({
          success: true,
          message: 'Revenue Sharing API',
          endpoints: [
            'GET /?action=models - Get revenue models',
            'GET /?action=calculate - Calculate distribution',
            'GET /?action=analytics - Get analytics',
            'GET /?action=pending - Get pending payouts',
            'GET /?action=configuration - Get configuration',
            'POST /?action=payout - Process payout',
            'POST /?action=configure - Configure model',
            'POST /?action=batch - Process batch payouts'
          ]
        })
    }
  } catch (error) {
    console.error('Revenue share GET error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, organization_id, transaction_id, configuration } = body
    
    const manager = new RevenueShareManager()
    
    switch (action) {
      case 'payout':
        // Process a single payout
        if (!transaction_id) {
          return NextResponse.json(
            { error: 'transaction_id required' },
            { status: 400 }
          )
        }
        
        const payout = await manager.processPayout(transaction_id)
        return NextResponse.json(payout)
      
      case 'configure':
        // Configure revenue model
        if (!organization_id || !configuration) {
          return NextResponse.json(
            { error: 'organization_id and configuration required' },
            { status: 400 }
          )
        }
        
        const config = await manager.configureRevenueModel(
          organization_id,
          configuration
        )
        return NextResponse.json(config)
      
      case 'batch':
        // Process batch payouts
        if (!organization_id) {
          return NextResponse.json(
            { error: 'organization_id required' },
            { status: 400 }
          )
        }
        
        const batch = await manager.processBatchPayouts(organization_id)
        return NextResponse.json(batch)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Revenue share POST error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}