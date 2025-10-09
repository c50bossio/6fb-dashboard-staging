import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Agent configuration storage (in-memory for now, could be moved to database)
// This will hold any runtime modifications to agent configs
const agentConfigOverrides = new Map()

// Import agent registry from Python backend
// For now, we'll define the agent list here and fetch from backend
const AGENT_NAMES = [
  'master_triage_agent',
  'financial_coach_agent',
  'operations_manager_agent',
  'marketing_expert_agent',
  'customer_service_agent',
  'booking_intelligence_agent',
  'analytics_agent'
]

// Mock stats for now (could be fetched from database later)
const getAgentStats = (agentName) => {
  return {
    total_queries: Math.floor(Math.random() * 100),
    total_cost: Math.random() * 10,
    total_response_time: Math.random() * 1000,
    last_used: new Date().toISOString()
  }
}

export async function GET(request) {
  try {
    // TODO: Add authentication check
    // const session = await getServerSession()
    // if (!session || !['SUPER_ADMIN', 'SHOP_OWNER'].includes(session.user.role)) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // Fetch agent configurations from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'

    let agents = []

    try {
      const response = await fetch(`${backendUrl}/api/v1/agents/list`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        agents = data.agents || []
      }
    } catch (err) {
      console.error('Failed to fetch from backend, using fallback:', err)
      // Fallback to basic agent list if backend is unavailable
      agents = AGENT_NAMES.map(name => ({
        name,
        instructions: 'Agent instructions not loaded',
        handoff_description: 'Description not loaded',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        max_tokens: 4000,
        tools: [],
        handoffs: [],
        enabled: true
      }))
    }

    // Enhance agents with stats and overrides
    const enhancedAgents = agents.map(agent => {
      const override = agentConfigOverrides.get(agent.name)
      const stats = getAgentStats(agent.name)

      return {
        ...agent,
        ...(override || {}),
        stats
      }
    })

    return NextResponse.json({
      success: true,
      agents: enhancedAgents,
      count: enhancedAgents.length
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    // TODO: Add authentication check

    const body = await request.json()
    const { action } = body

    if (action === 'reload') {
      // Clear overrides and reload from backend
      agentConfigOverrides.clear()

      return NextResponse.json({
        success: true,
        message: 'Agent configurations reloaded'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in agents POST:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}
