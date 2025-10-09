import { NextResponse } from 'next/server'

// In-memory storage for agent config overrides
// In production, this would be stored in the database
const agentConfigOverrides = new Map()

export async function GET(request, { params }) {
  try {
    const agentId = params.id

    // TODO: Add authentication check

    // Fetch agent config from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'

    try {
      const response = await fetch(`${backendUrl}/api/v1/agents/${agentId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Agent not found')
      }

      const data = await response.json()
      const agent = data.agent

      // Apply any overrides
      const override = agentConfigOverrides.get(agentId)

      return NextResponse.json({
        success: true,
        agent: {
          ...agent,
          ...(override || {})
        }
      })
    } catch (err) {
      console.error('Failed to fetch agent from backend:', err)
      return NextResponse.json(
        { error: 'Agent not found', details: err.message },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error fetching agent:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const agentId = params.id
    const body = await request.json()

    // TODO: Add authentication check
    // TODO: Add input validation

    console.log(`Updating agent ${agentId} with config:`, body)

    // Validate required fields
    const {
      instructions,
      handoff_description,
      model,
      temperature,
      max_tokens,
      tools,
      handoffs,
      enabled
    } = body

    // Store override configuration
    const override = {
      instructions,
      handoff_description,
      model,
      temperature,
      max_tokens,
      tools,
      handoffs,
      enabled,
      updated_at: new Date().toISOString()
    }

    agentConfigOverrides.set(agentId, override)

    // In production, you would:
    // 1. Save to database
    // 2. Notify backend to reload agent config
    // 3. Update vector knowledge base if needed

    // For now, we'll try to notify the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'

    try {
      await fetch(`${backendUrl}/api/v1/agents/${agentId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(override)
      })
    } catch (err) {
      console.warn('Failed to notify backend of config change:', err)
      // Continue anyway - the override is stored locally
    }

    // Fetch updated agent config
    const response = await fetch(`${backendUrl}/api/v1/agents/${agentId}`)
    let agent = {}

    if (response.ok) {
      const data = await response.json()
      agent = data.agent
    }

    return NextResponse.json({
      success: true,
      agent: {
        ...agent,
        ...override
      },
      message: 'Agent configuration updated successfully'
    })
  } catch (error) {
    console.error('Error updating agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  try {
    const agentId = params.id

    // TODO: Add authentication check

    // Remove override (reset to defaults)
    agentConfigOverrides.delete(agentId)

    return NextResponse.json({
      success: true,
      message: 'Agent configuration reset to defaults'
    })
  } catch (error) {
    console.error('Error deleting agent override:', error)
    return NextResponse.json(
      { error: 'Failed to reset agent', details: error.message },
      { status: 500 }
    )
  }
}
