/**
 * Customer Automation Workflows API
 * Handles automated workflows for welcome sequences, re-engagement, birthday campaigns, and tier upgrades
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to verify authentication
async function verifyAuth(request) {
  try {
    const authorization = request.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return { error: 'Missing or invalid authorization header', status: 401 }
    }

    const token = authorization.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid token', status: 401 }
    }

    // Get barbershop_id for the user
    const { data: barbershopData } = await supabase
      .from('barbershops')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    let barbershopId = null
    if (barbershopData) {
      barbershopId = barbershopData.id
    } else {
      // Check if user is a barber
      const { data: barberData } = await supabase
        .from('barbers')
        .select('barbershop_id')
        .eq('user_id', user.id)
        .single()
      
      if (barberData) {
        barbershopId = barberData.barbershop_id
      }
    }

    if (!barbershopId) {
      return { error: 'User not associated with any barbershop', status: 403 }
    }

    return { user, barbershopId }
  } catch (error) {
    return { error: 'Authentication failed', status: 401 }
  }
}

// Workflow engine class
class WorkflowEngine {
  constructor(barbershopId) {
    this.barbershopId = barbershopId
  }

  async processWelcomeSequence(customerId) {
    try {
      // Check if customer already has a welcome sequence
      const { data: existingSequence } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .eq('workflow_type', 'welcome_sequence')
        .eq('status', 'active')
        .single()

      if (existingSequence) {
        return { success: false, reason: 'Welcome sequence already exists' }
      }

      // Get customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .single()

      if (!customer) {
        return { success: false, reason: 'Customer not found' }
      }

      // Get barbershop data
      const { data: barbershop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('id', this.barbershopId)
        .single()

      // Create welcome sequence workflow
      const welcomeWorkflow = {
        id: crypto.randomUUID(),
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        workflow_type: 'welcome_sequence',
        status: 'active',
        current_step: 1,
        total_steps: 3,
        started_at: new Date().toISOString(),
        metadata: {
          customer_name: customer.name,
          customer_email: customer.email,
          barbershop_name: barbershop?.name || 'Our Barbershop'
        },
        created_at: new Date().toISOString()
      }

      const { data: workflow, error } = await supabase
        .from('automation_workflows')
        .insert(welcomeWorkflow)
        .select()
        .single()

      if (error) {
        console.error('Error creating welcome workflow:', error)
        return { success: false, reason: 'Failed to create workflow' }
      }

      // Schedule welcome sequence steps
      const steps = [
        {
          step_number: 1,
          scheduled_for: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          action_type: 'email',
          subject: `Welcome to ${barbershop?.name || 'Our Barbershop'}!`,
          content: this.generateWelcomeEmail1(customer, barbershop)
        },
        {
          step_number: 2,
          scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
          action_type: 'email',
          subject: 'Getting the most out of your barbershop experience',
          content: this.generateWelcomeEmail2(customer, barbershop)
        },
        {
          step_number: 3,
          scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          action_type: 'email',
          subject: 'Your first appointment feedback',
          content: this.generateWelcomeEmail3(customer, barbershop)
        }
      ]

      // Create workflow steps
      const workflowSteps = steps.map(step => ({
        id: crypto.randomUUID(),
        workflow_id: workflow.id,
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        step_number: step.step_number,
        action_type: step.action_type,
        scheduled_for: step.scheduled_for.toISOString(),
        status: 'scheduled',
        subject: step.subject,
        content: step.content,
        metadata: {
          workflow_type: 'welcome_sequence'
        },
        created_at: new Date().toISOString()
      }))

      const { error: stepsError } = await supabase
        .from('automation_workflow_steps')
        .insert(workflowSteps)

      if (stepsError) {
        console.error('Error creating workflow steps:', stepsError)
        return { success: false, reason: 'Failed to create workflow steps' }
      }

      return { success: true, workflow_id: workflow.id, steps_created: steps.length }
    } catch (error) {
      console.error('Error processing welcome sequence:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  async processReEngagementCampaign(customerId) {
    try {
      // Check customer's last activity
      const { data: lastAppointment } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .order('appointment_date', { ascending: false })
        .limit(1)
        .single()

      if (!lastAppointment) {
        return { success: false, reason: 'No appointment history' }
      }

      const daysSinceLastVisit = Math.floor(
        (new Date() - new Date(lastAppointment.appointment_date)) / (1000 * 60 * 60 * 24)
      )

      // Only trigger re-engagement for customers who haven't visited in 60+ days
      if (daysSinceLastVisit < 60) {
        return { success: false, reason: 'Customer is still active' }
      }

      // Check if re-engagement campaign already exists
      const { data: existingCampaign } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .eq('workflow_type', 'reengagement')
        .eq('status', 'active')
        .single()

      if (existingCampaign) {
        return { success: false, reason: 'Re-engagement campaign already active' }
      }

      // Get customer intelligence data
      const { data: intelligence } = await supabase
        .from('customer_intelligence')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .single()

      // Get customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .single()

      // Create re-engagement workflow
      const reengagementWorkflow = {
        id: crypto.randomUUID(),
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        workflow_type: 'reengagement',
        status: 'active',
        current_step: 1,
        total_steps: 3,
        started_at: new Date().toISOString(),
        metadata: {
          days_since_last_visit: daysSinceLastVisit,
          last_appointment_date: lastAppointment.appointment_date,
          customer_clv: intelligence?.clv || 0,
          health_score: intelligence?.health_score || 0.5
        },
        created_at: new Date().toISOString()
      }

      const { data: workflow, error } = await supabase
        .from('automation_workflows')
        .insert(reengagementWorkflow)
        .select()
        .single()

      if (error) {
        console.error('Error creating re-engagement workflow:', error)
        return { success: false, reason: 'Failed to create workflow' }
      }

      // Schedule re-engagement steps based on customer value
      const isHighValue = intelligence?.clv > 200
      const steps = this.generateReEngagementSteps(customer, intelligence, isHighValue)

      const workflowSteps = steps.map((step, index) => ({
        id: crypto.randomUUID(),
        workflow_id: workflow.id,
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        step_number: index + 1,
        action_type: step.action_type,
        scheduled_for: step.scheduled_for.toISOString(),
        status: 'scheduled',
        subject: step.subject,
        content: step.content,
        metadata: {
          workflow_type: 'reengagement',
          is_high_value: isHighValue,
          days_since_last_visit: daysSinceLastVisit
        },
        created_at: new Date().toISOString()
      }))

      const { error: stepsError } = await supabase
        .from('automation_workflow_steps')
        .insert(workflowSteps)

      if (stepsError) {
        console.error('Error creating re-engagement steps:', stepsError)
        return { success: false, reason: 'Failed to create workflow steps' }
      }

      return { success: true, workflow_id: workflow.id, steps_created: steps.length }
    } catch (error) {
      console.error('Error processing re-engagement campaign:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  async processBirthdayCampaign(customerId) {
    try {
      // Get customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .single()

      if (!customer || !customer.date_of_birth) {
        return { success: false, reason: 'Customer not found or no birthday data' }
      }

      // Check if birthday is within the next 7 days
      const today = new Date()
      const birthday = new Date(customer.date_of_birth)
      birthday.setFullYear(today.getFullYear()) // Set to current year

      const daysToBirthday = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24))

      if (daysToBirthday < 0 || daysToBirthday > 7) {
        return { success: false, reason: 'Birthday not in range' }
      }

      // Check if birthday campaign already exists for this year
      const yearStart = new Date(today.getFullYear(), 0, 1)
      const { data: existingCampaign } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('customer_id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .eq('workflow_type', 'birthday_campaign')
        .gte('created_at', yearStart.toISOString())
        .single()

      if (existingCampaign) {
        return { success: false, reason: 'Birthday campaign already sent this year' }
      }

      // Get loyalty data for bonus calculation
      const { data: loyalty } = await supabase
        .from('loyalty_enrollments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .single()

      // Create birthday workflow
      const birthdayWorkflow = {
        id: crypto.randomUUID(),
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        workflow_type: 'birthday_campaign',
        status: 'active',
        current_step: 1,
        total_steps: 2,
        started_at: new Date().toISOString(),
        metadata: {
          birthday: customer.date_of_birth,
          days_to_birthday: daysToBirthday,
          has_loyalty: !!loyalty,
          loyalty_tier: loyalty?.tier || 'standard'
        },
        created_at: new Date().toISOString()
      }

      const { data: workflow, error } = await supabase
        .from('automation_workflows')
        .insert(birthdayWorkflow)
        .select()
        .single()

      if (error) {
        console.error('Error creating birthday workflow:', error)
        return { success: false, reason: 'Failed to create workflow' }
      }

      // Generate birthday bonus points if enrolled in loyalty
      let bonusPoints = 0
      if (loyalty) {
        bonusPoints = this.calculateBirthdayBonus(loyalty.tier)
        
        // Award birthday bonus points
        const bonusTransaction = {
          id: crypto.randomUUID(),
          customer_id: customerId,
          loyalty_program_id: loyalty.loyalty_program_id,
          transaction_type: 'bonus',
          points_amount: bonusPoints,
          source_type: 'birthday_bonus',
          description: 'Happy Birthday bonus points!',
          metadata: {
            workflow_id: workflow.id,
            birthday_year: today.getFullYear()
          },
          created_at: new Date().toISOString()
        }

        await supabase.from('loyalty_transactions').insert(bonusTransaction)

        // Update customer's points balance
        await supabase
          .from('loyalty_enrollments')
          .update({
            current_points: loyalty.current_points + bonusPoints,
            lifetime_points_earned: loyalty.lifetime_points_earned + bonusPoints,
            updated_at: new Date().toISOString()
          })
          .eq('id', loyalty.id)
      }

      // Schedule birthday messages
      const steps = [
        {
          step_number: 1,
          scheduled_for: new Date(birthday.getTime() - 24 * 60 * 60 * 1000), // Day before
          action_type: 'email',
          subject: 'Your birthday is tomorrow! 🎉',
          content: this.generateBirthdayPreEmail(customer, bonusPoints)
        },
        {
          step_number: 2,
          scheduled_for: birthday, // On birthday
          action_type: 'email',
          subject: 'Happy Birthday! 🎂',
          content: this.generateBirthdayEmail(customer, bonusPoints)
        }
      ]

      const workflowSteps = steps.map(step => ({
        id: crypto.randomUUID(),
        workflow_id: workflow.id,
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        step_number: step.step_number,
        action_type: step.action_type,
        scheduled_for: step.scheduled_for.toISOString(),
        status: 'scheduled',
        subject: step.subject,
        content: step.content,
        metadata: {
          workflow_type: 'birthday_campaign',
          bonus_points: bonusPoints
        },
        created_at: new Date().toISOString()
      }))

      const { error: stepsError } = await supabase
        .from('automation_workflow_steps')
        .insert(workflowSteps)

      if (stepsError) {
        console.error('Error creating birthday steps:', stepsError)
        return { success: false, reason: 'Failed to create workflow steps' }
      }

      return { 
        success: true, 
        workflow_id: workflow.id, 
        steps_created: steps.length,
        bonus_points_awarded: bonusPoints
      }
    } catch (error) {
      console.error('Error processing birthday campaign:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  async processTierUpgrade(customerId, newTier, oldTier) {
    try {
      // Get customer data
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('barbershop_id', this.barbershopId)
        .single()

      if (!customer) {
        return { success: false, reason: 'Customer not found' }
      }

      // Get loyalty data
      const { data: loyalty } = await supabase
        .from('loyalty_enrollments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('is_active', true)
        .single()

      if (!loyalty) {
        return { success: false, reason: 'Customer not enrolled in loyalty program' }
      }

      // Create tier upgrade workflow
      const tierUpgradeWorkflow = {
        id: crypto.randomUUID(),
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        workflow_type: 'tier_upgrade',
        status: 'active',
        current_step: 1,
        total_steps: 1,
        started_at: new Date().toISOString(),
        metadata: {
          old_tier: oldTier,
          new_tier: newTier,
          upgrade_date: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      }

      const { data: workflow, error } = await supabase
        .from('automation_workflows')
        .insert(tierUpgradeWorkflow)
        .select()
        .single()

      if (error) {
        console.error('Error creating tier upgrade workflow:', error)
        return { success: false, reason: 'Failed to create workflow' }
      }

      // Calculate tier upgrade bonus
      const upgradeBonus = this.calculateTierUpgradeBonus(newTier)

      // Award tier upgrade bonus
      if (upgradeBonus > 0) {
        const bonusTransaction = {
          id: crypto.randomUUID(),
          customer_id: customerId,
          loyalty_program_id: loyalty.loyalty_program_id,
          transaction_type: 'bonus',
          points_amount: upgradeBonus,
          source_type: 'tier_upgrade',
          description: `Congratulations on reaching ${newTier} tier!`,
          metadata: {
            workflow_id: workflow.id,
            old_tier: oldTier,
            new_tier: newTier
          },
          created_at: new Date().toISOString()
        }

        await supabase.from('loyalty_transactions').insert(bonusTransaction)

        // Update customer's points balance
        await supabase
          .from('loyalty_enrollments')
          .update({
            current_points: loyalty.current_points + upgradeBonus,
            lifetime_points_earned: loyalty.lifetime_points_earned + upgradeBonus,
            tier: newTier,
            updated_at: new Date().toISOString()
          })
          .eq('id', loyalty.id)
      }

      // Schedule tier upgrade notification
      const workflowStep = {
        id: crypto.randomUUID(),
        workflow_id: workflow.id,
        barbershop_id: this.barbershopId,
        customer_id: customerId,
        step_number: 1,
        action_type: 'email',
        scheduled_for: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes delay
        status: 'scheduled',
        subject: `Congratulations! You've reached ${newTier} tier! 🎉`,
        content: this.generateTierUpgradeEmail(customer, oldTier, newTier, upgradeBonus),
        metadata: {
          workflow_type: 'tier_upgrade',
          old_tier: oldTier,
          new_tier: newTier,
          bonus_points: upgradeBonus
        },
        created_at: new Date().toISOString()
      }

      const { error: stepError } = await supabase
        .from('automation_workflow_steps')
        .insert(workflowStep)

      if (stepError) {
        console.error('Error creating tier upgrade step:', stepError)
        return { success: false, reason: 'Failed to create workflow step' }
      }

      return { 
        success: true, 
        workflow_id: workflow.id,
        bonus_points_awarded: upgradeBonus,
        new_tier: newTier
      }
    } catch (error) {
      console.error('Error processing tier upgrade:', error)
      return { success: false, reason: 'Internal error' }
    }
  }

  // Email content generators
  generateWelcomeEmail1(customer, barbershop) {
    return `
Hi ${customer.name},

Welcome to ${barbershop?.name || 'our barbershop'}! 

We're thrilled to have you as a new customer. Our team is dedicated to providing you with exceptional service and helping you look and feel your best.

What to expect:
• Professional stylists and barbers
• High-quality products and tools
• A comfortable, friendly atmosphere
• Personalized service tailored to you

Your first appointment is just the beginning of a great relationship!

Best regards,
The ${barbershop?.name || 'Barbershop'} Team
    `
  }

  generateWelcomeEmail2(customer, barbershop) {
    return `
Hi ${customer.name},

Hope you're settling in well with ${barbershop?.name || 'us'}!

Here are some tips to get the most out of your barbershop experience:

📅 Book in advance for your preferred time slots
💡 Don't hesitate to ask questions about styles or products
🎯 Let us know your preferences - we keep notes for next time
⭐ Follow us on social media for styling tips and updates

We're here to make every visit exceptional.

Best,
${barbershop?.name || 'Your Barbershop Team'}
    `
  }

  generateWelcomeEmail3(customer, barbershop) {
    return `
Hi ${customer.name},

It's been a week since you joined ${barbershop?.name || 'our barbershop'} family!

We'd love to hear about your experience so far. Your feedback helps us continue to improve and provide the best service possible.

How was your first appointment? Is there anything we can do better?

Looking forward to seeing you again soon!

Warm regards,
${barbershop?.name || 'Your Barbershop'}
    `
  }

  generateReEngagementSteps(customer, intelligence, isHighValue) {
    const baseDelay = isHighValue ? 1 : 3 // High-value customers get faster outreach
    
    return [
      {
        action_type: 'email',
        scheduled_for: new Date(Date.now() + baseDelay * 24 * 60 * 60 * 1000),
        subject: 'We miss you!',
        content: `Hi ${customer.name},\n\nWe've missed seeing you! Come back for a fresh cut.\n\n${isHighValue ? 'As a valued customer, we have a special offer waiting for you.' : 'Book your next appointment today!'}`
      },
      {
        action_type: 'email',
        scheduled_for: new Date(Date.now() + (baseDelay + 7) * 24 * 60 * 60 * 1000),
        subject: 'Special comeback offer!',
        content: `Hi ${customer.name},\n\nWe're offering ${isHighValue ? '25%' : '15%'} off your next appointment to welcome you back!\n\nThis offer expires in 14 days.`
      },
      {
        action_type: 'email',
        scheduled_for: new Date(Date.now() + (baseDelay + 14) * 24 * 60 * 60 * 1000),
        subject: 'Last chance - offer expires soon',
        content: `Hi ${customer.name},\n\nYour comeback discount expires in 3 days!\n\nDon't miss out on ${isHighValue ? '25%' : '15%'} off your next appointment.`
      }
    ]
  }

  generateBirthdayPreEmail(customer, bonusPoints) {
    return `
Hi ${customer.name},

Your birthday is tomorrow! 🎉

We wanted to be the first to wish you an early Happy Birthday!

${bonusPoints > 0 ? `We've added ${bonusPoints} bonus points to your loyalty account as a birthday gift! 🎁` : ''}

Hope your special day is amazing!

Best wishes,
Your Barbershop Team
    `
  }

  generateBirthdayEmail(customer, bonusPoints) {
    return `
🎂 Happy Birthday, ${customer.name}! 🎂

Wishing you a fantastic day filled with joy, laughter, and celebration!

${bonusPoints > 0 ? `Your birthday gift of ${bonusPoints} loyalty points is ready to use on your next appointment!` : 'Hope to see you soon for a birthday fresh cut!'}

Make it a great year!

Cheers,
Your Barbershop Family
    `
  }

  generateTierUpgradeEmail(customer, oldTier, newTier, bonusPoints) {
    return `
🎉 Congratulations, ${customer.name}!

You've just reached ${newTier} tier in our loyalty program!

Your loyalty means the world to us, and we're excited to offer you even better perks and benefits.

${bonusPoints > 0 ? `As a welcome to ${newTier} tier, we've added ${bonusPoints} bonus points to your account!` : ''}

Thank you for being such a valued customer.

Best regards,
Your Barbershop Team
    `
  }

  calculateBirthdayBonus(tier) {
    const bonuses = {
      'bronze': 50,
      'silver': 75,
      'gold': 100,
      'platinum': 150
    }
    return bonuses[tier] || 50
  }

  calculateTierUpgradeBonus(newTier) {
    const bonuses = {
      'silver': 100,
      'gold': 200,
      'platinum': 500
    }
    return bonuses[newTier] || 0
  }
}

// POST: Trigger workflow
export async function POST(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const body = await request.json()

    const {
      workflow_type,
      customer_id,
      trigger_data = {}
    } = body

    if (!workflow_type || !customer_id) {
      return NextResponse.json({ 
        error: 'workflow_type and customer_id are required' 
      }, { status: 400 })
    }

    const engine = new WorkflowEngine(barbershopId)
    let result

    switch (workflow_type) {
      case 'welcome_sequence':
        result = await engine.processWelcomeSequence(customer_id)
        break
      case 'reengagement':
        result = await engine.processReEngagementCampaign(customer_id)
        break
      case 'birthday_campaign':
        result = await engine.processBirthdayCampaign(customer_id)
        break
      case 'tier_upgrade':
        const { new_tier, old_tier } = trigger_data
        if (!new_tier || !old_tier) {
          return NextResponse.json({ 
            error: 'new_tier and old_tier are required for tier_upgrade workflow' 
          }, { status: 400 })
        }
        result = await engine.processTierUpgrade(customer_id, new_tier, old_tier)
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid workflow_type' 
        }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error in POST /api/customers/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: Get workflow status and history
export async function GET(request) {
  try {
    const authResult = await verifyAuth(request)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { barbershopId } = authResult
    const { searchParams } = new URL(request.url)

    const customerId = searchParams.get('customer_id')
    const workflowType = searchParams.get('workflow_type')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase
      .from('automation_workflows')
      .select(`
        *,
        automation_workflow_steps(*)
      `)
      .eq('barbershop_id', barbershopId)

    if (customerId) query = query.eq('customer_id', customerId)
    if (workflowType) query = query.eq('workflow_type', workflowType)
    if (status) query = query.eq('status', status)

    const { data: workflows, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 400 })
    }

    return NextResponse.json({
      workflows: workflows || [],
      total: workflows?.length || 0
    })

  } catch (error) {
    console.error('Error in GET /api/customers/automation/workflows:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}