import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  try {
    const agentId = params.id
    const body = await request.json()
    const { query } = body

    // TODO: Add authentication check

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      )
    }

    console.log(`Testing agent ${agentId} with query: ${query}`)

    // Call the backend to test the agent
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001'
    const startTime = Date.now()

    try {
      const response = await fetch(`${backendUrl}/api/v1/agents/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          agent_name: agentId,
          barbershop_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Demo barbershop
          user_context: {
            testing: true,
            admin_test: true
          }
        })
      })

      const responseTime = (Date.now() - startTime) / 1000 // Convert to seconds

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Agent test failed')
      }

      const data = await response.json()

      // Extract test results
      const result = {
        success: true,
        response: data.response || data.message || 'No response from agent',
        agent_name: agentId,
        tokens_used: data.tokens_used || data.usage?.total_tokens || 0,
        cost: data.cost || 0,
        response_time: responseTime,
        tool_calls: data.tool_calls || [],
        metadata: {
          model: data.model,
          active_agent: data.active_agent,
          conversation_id: data.conversation_id
        }
      }

      return NextResponse.json(result)
    } catch (err) {
      console.error('Backend test request failed:', err)

      // Fallback to mock response for testing UI
      return NextResponse.json({
        success: true,
        response: `Mock response from ${agentId}:\n\nThis is a test response. The backend is not available, so this is a simulated response to demonstrate the testing interface.\n\nYour query was: "${query}"\n\nIn production, this would show the actual agent's response with real database queries and analysis.`,
        agent_name: agentId,
        tokens_used: 150,
        cost: 0.0023,
        response_time: 2.3,
        tool_calls: [
          {
            name: 'get_revenue_by_date_range',
            arguments: {
              start_date: '2025-10-01',
              end_date: '2025-10-07',
              barbershop_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
            }
          }
        ],
        metadata: {
          model: 'gpt-4-turbo-preview',
          active_agent: agentId,
          testing_mode: true
        }
      })
    }
  } catch (error) {
    console.error('Error testing agent:', error)
    return NextResponse.json(
      { error: 'Failed to test agent', details: error.message },
      { status: 500 }
    )
  }
}
