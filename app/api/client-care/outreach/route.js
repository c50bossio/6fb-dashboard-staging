import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/client-care/outreach
 * Fetch client care outreach activities and relationship-building efforts
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Build query for client care outreach activities
    let query = supabase
      .from('client_care_outreach')
      .select(`
        *,
        client_status:client_care_status(
          id,
          care_level,
          last_contact_date,
          relationship_status,
          care_notes
        ),
        customer:customers(
          id,
          name,
          email,
          phone
        ),
        care_interactions:client_care_interactions(
          id,
          interaction_type,
          interaction_date,
          communication_method,
          response_received,
          relationship_building_notes
        )
      `)
      .eq('barberbarbershop_id', profile.barbershop_id)
      .order('initiated_at', { ascending: false })
    
    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    
    if (status) {
      query = query.eq('outreach_status', status)
    }
    
    const { data: outreach, error: outreachError } = await query
    
    if (outreachError) throw outreachError

    // Get relationship-building statistics
    const stats = {
      total_outreach: outreach.length,
      active_caring: outreach.filter(o => o.outreach_status === 'caring_for').length,
      reconnected: outreach.filter(o => o.outreach_status === 'reconnected').length,
      relationship_improved: outreach.filter(o => o.outreach_status === 'relationship_improved').length,
      still_caring: outreach.filter(o => o.outreach_status === 'ongoing_care').length,
      total_clients_helped: outreach
        .filter(o => o.relationship_outcome === 'positive')
        .length
    }

    return NextResponse.json({
      outreach,
      stats
    })
    
  } catch (error) {
    console.error('Error fetching client care outreach:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client care activities' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/client-care/outreach  
 * Initiate caring outreach for client relationship building
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { 
      clientId,
      careOption = 'caring_outreach',
      send_email = true,
      send_sms = true,
      approach = 'relationship_building',
      tone = 'warm_and_caring',
      personalMessage,
      communicationStyle = {}
    } = await request.json()
    
    // Get user's barbershop
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role, full_name')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    const barberbarbershopId = profile.barbershop_id

    // Check current client care status
    const { data: clientStatus } = await supabase
      .from('client_care_status')
      .select('*')
      .eq('barberbarbershop_id', barberbarbershopId)
      .eq('client_id', clientId)
      .single()

    // Get client information for personalization
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email, phone, created_at')
      .eq('id', clientId)
      .single()

    if (!customer) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Create or update client care status
    const careStatusData = {
      barberbarbershop_id: barberbarbershopId,
      client_id: clientId,
      care_level: 'reaching_out',
      relationship_status: 'reconnecting',
      last_contact_date: new Date().toISOString(),
      care_approach: approach,
      care_notes: personalMessage || 'Caring outreach initiated to rebuild relationship',
      initiated_by: user.id
    }

    const { data: careStatus, error: careStatusError } = await supabase
      .from('client_care_status')
      .upsert(careStatusData, { onConflict: 'barberbarbershop_id,client_id' })
      .select()
      .single()

    if (careStatusError) throw careStatusError

    // Create caring outreach record
    const { data: outreach, error: outreachError } = await supabase
      .from('client_care_outreach')
      .insert({
        client_care_status_id: careStatus.id,
        barberbarbershop_id: barberbarbershopId,
        client_id: clientId,
        care_option: careOption,
        outreach_status: 'caring_for',
        approach_type: approach,
        communication_tone: tone,
        email_planned: send_email,
        sms_planned: send_sms,
        personal_message: personalMessage,
        communication_preferences: communicationStyle,
        initiated_by: user.id,
        care_started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (outreachError) throw outreachError

    // Send caring communications
    const interactions = []
    
    if (send_email && customer?.email) {
      // Create caring email interaction
      const emailInteraction = await supabase
        .from('client_care_interactions')
        .insert({
          outreach_id: outreach.id,
          barberbarbershop_id: barberbarbershopId,
          client_id: clientId,
          interaction_type: 'caring_email',
          communication_method: 'email',
          message_subject: `We miss you, ${customer.name}! 💙`,
          message_content: personalMessage || generateCaringEmailContent(
            customer.name,
            profile.full_name,
            approach
          ),
          sent_by: user.id,
          interaction_tone: tone,
          relationship_building_intent: true
        })
        .select()
        .single()
      
      interactions.push(emailInteraction.data)
    }
    
    if (send_sms && customer?.phone) {
      // Create caring SMS interaction  
      const smsInteraction = await supabase
        .from('client_care_interactions')
        .insert({
          outreach_id: outreach.id,
          barberbarbershop_id: barberbarbershopId,
          client_id: clientId,
          interaction_type: 'caring_sms',
          communication_method: 'sms',
          message_content: generateCaringSMSContent(
            customer.name,
            tone
          ),
          sent_by: user.id,
          interaction_tone: tone,
          relationship_building_intent: true
        })
        .select()
        .single()
      
      interactions.push(smsInteraction.data)
    }

    // Log the caring action with positive language
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'initiate_client_care',
        details: {
          barberbarbershop_id: barberbarbershopId,
          client_id: clientId,
          outreach_id: outreach.id,
          care_approach: approach,
          interactions_sent: interactions.length,
          tone: tone
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      outreach,
      interactions,
      message: 'Caring outreach initiated with relationship-building focus' 
    })
    
  } catch (error) {
    console.error('Error initiating caring outreach:', error)
    return NextResponse.json(
      { error: 'Failed to initiate caring outreach' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/client-care/outreach
 * Update client care and relationship status
 */
export async function PUT(request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { 
      outreach_id,
      action, // 'reconnected', 'relationship_improved', 'continue_caring', 'celebrate_success'
      notes,
      relationship_outcome
    } = await request.json()
    
    // Get user's barbershop and check authorization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('barberbarbershop_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.barbershop_id) {
      return NextResponse.json({ error: 'No barbershop found' }, { status: 404 })
    }

    // Get outreach details
    const { data: outreach, error: outreachError } = await supabase
      .from('client_care_outreach')
      .select('*')
      .eq('id', outreach_id)
      .eq('barberbarbershop_id', profile.barbershop_id)
      .single()
    
    if (outreachError || !outreach) {
      return NextResponse.json({ error: 'Care outreach not found' }, { status: 404 })
    }

    let updateData = {
      last_updated_at: new Date().toISOString(),
      updated_by: user.id
    }
    
    switch (action) {
      case 'reconnected':
        // Client has reconnected successfully!
        updateData = {
          ...updateData,
          outreach_status: 'reconnected',
          relationship_outcome: 'positive',
          reconnected_at: new Date().toISOString(),
          success_notes: notes
        }
        
        // Update client care status to show positive outcome
        await supabase
          .from('client_care_status')
          .update({
            relationship_status: 'active_positive',
            care_level: 'maintenance',
            last_positive_interaction: new Date().toISOString(),
            care_success: true,
            success_approach: outreach.approach_type
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', outreach.client_id)
        
        // Reset any "break" status since they're back
        await supabase
          .from('client_strike_history')
          .update({
            is_blocked: false,
            relationship_repaired: true,
            care_success_date: new Date().toISOString(),
            relationship_status: 'positive'
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', outreach.client_id)
        
        break
      
      case 'relationship_improved':
        // Relationship is getting better
        updateData = {
          ...updateData,
          outreach_status: 'relationship_improved',
          relationship_outcome: 'improving',
          improvement_notes: notes
        }
        
        await supabase
          .from('client_care_status')
          .update({
            relationship_status: 'improving',
            care_level: 'supportive',
            improvement_noted_at: new Date().toISOString()
          })
          .eq('barberbarbershop_id', profile.barbershop_id)
          .eq('client_id', outreach.client_id)
        
        break
      
      case 'continue_caring':
        // Keep showing we care
        updateData = {
          ...updateData,
          outreach_status: 'ongoing_care',
          care_continuation_notes: notes
        }
        break
      
      case 'celebrate_success':
        // Celebrate the successful relationship repair
        updateData = {
          ...updateData,
          outreach_status: 'celebration',
          relationship_outcome: 'celebration_worthy',
          celebration_notes: notes,
          celebrated_at: new Date().toISOString()
        }
        break
      
      default:
        return NextResponse.json({ error: 'Invalid care action' }, { status: 400 })
    }

    // Update outreach record
    const { error: updateError } = await supabase
      .from('client_care_outreach')
      .update(updateData)
      .eq('id', outreach_id)
    
    if (updateError) throw updateError

    // Log the positive action
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: `client_care_${action}`,
        details: {
          barberbarbershop_id: profile.barbershop_id,
          outreach_id,
          client_id: outreach.client_id,
          outcome: relationship_outcome,
          notes
        },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({ 
      success: true,
      message: `Client care ${action.replace('_', ' ')} recorded successfully!` 
    })
    
  } catch (error) {
    console.error('Error updating client care:', error)
    return NextResponse.json(
      { error: 'Failed to update client care status' },
      { status: 500 }
    )
  }
}

// Helper function to generate caring email content
function generateCaringEmailContent(clientName, staffName, approach) {
  const greetings = [
    `Hi ${clientName}! 💙`,
    `Hello ${clientName} - we miss you!`,
    `Dear ${clientName}, thinking of you!`
  ]

  const caring_messages = {
    relationship_building: `
We noticed we haven't seen you in a while, and honestly, we miss you! ${clientName}, you're not just a client to us - you're someone we genuinely care about.

Life gets busy and schedules change - we totally get it! We're not here to make you feel bad about missing appointments. We just want you to know that your chair is always here waiting for you when you're ready.

Is everything okay? If there's anything going on or if there's a way we can make booking more convenient for your schedule, please let us know. We're here to work WITH you, not against you.

We genuinely value having you as part of our barbershop family. When you're ready to come back, we'll be here with a warm welcome and maybe even a special "we missed you" treat! 

Take care of yourself, and know that you're always welcome here.

With genuine care,
${staffName} and the team 💙`,

    gentle_check_in: `
Hey ${clientName}!

We wanted to reach out and see how you're doing. We know life gets hectic, and sometimes self-care (like getting a great haircut!) can take a backseat to everything else.

Just wanted you to know - no pressure, no judgment - we're thinking about you and miss having you in the shop. Your business and friendship mean a lot to us.

If you ever want to chat about making appointments work better with your schedule, or if there's anything we can do differently, we're all ears!

Hope you're doing well!

Warmly,
${staffName}`
  }

  return greetings[Math.floor(Math.random() * greetings.length)] + '\n\n' + 
         (caring_messages[approach] || caring_messages.relationship_building)
}

// Helper function to generate caring SMS content
function generateCaringSMSContent(clientName, tone) {
  const caring_messages = [
    `Hi ${clientName}! 💙 We miss seeing you and wanted to check in. Hope you're doing well! No pressure - just wanted you to know we care and your chair is always here when you're ready. -The Team`,
    `${clientName}, thinking of you! 😊 We know life gets busy. Just a friendly hello to let you know we miss you and we're here whenever you're ready to reconnect. Take care! 💙`,
    `Hey ${clientName}! Miss having you around the shop. Hope everything's going well for you! When you're ready for a fresh cut, we'll be here with a warm welcome. 💙`
  ]

  return caring_messages[Math.floor(Math.random() * caring_messages.length)]
}