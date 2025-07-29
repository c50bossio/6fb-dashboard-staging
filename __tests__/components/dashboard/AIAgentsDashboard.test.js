import { render, screen, waitFor } from '@/test-utils/test-utils'
import { AIAgentsDashboard } from '@/components/dashboard/AIAgentsDashboard'
import { mockAgentResponse, mockFetch } from '@/test-utils/test-utils'

// Mock the AI agent service
jest.mock('@/services/ai-agent-service', () => ({
  sendAgentMessage: jest.fn()
}))

describe('AIAgentsDashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = mockFetch()
  })

  it('renders AI agents dashboard with available agents', () => {
    render(<AIAgentsDashboard />)

    // Check if main dashboard elements are present
    expect(screen.getByText(/AI Agents/i)).toBeInTheDocument()
    
    // Check for agent cards
    expect(screen.getByText(/Master Coach/i)).toBeInTheDocument()
    expect(screen.getByText(/Financial Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Client Acquisition/i)).toBeInTheDocument()
    expect(screen.getByText(/Operations Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Brand Development/i)).toBeInTheDocument()
    expect(screen.getByText(/Growth Agent/i)).toBeInTheDocument()
    expect(screen.getByText(/Strategic Mindset/i)).toBeInTheDocument()
  })

  it('allows selecting an agent and starting a conversation', async () => {
    const { user } = render(<AIAgentsDashboard />)

    // Click on Financial Agent
    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    // Check if chat interface appears
    expect(screen.getByPlaceholderText(/Ask the Financial Agent/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('sends message to selected agent', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    // Select Financial Agent
    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    // Type a message
    const messageInput = screen.getByPlaceholderText(/Ask the Financial Agent/i)
    await user.type(messageInput, 'How can I increase my revenue?')

    // Send the message
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText(/Test agent response/i)).toBeInTheDocument()
    })

    // Check if fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/agents/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: 'financial',
          message: 'How can I increase my revenue?',
          userId: expect.any(String),
          barbershopId: expect.any(String)
        })
      })
    )
  })

  it('displays agent recommendations', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => ({
          ...mockAgentResponse,
          recommendations: [
            {
              id: 'rec-1',
              type: 'pricing',
              priority: 'high',
              title: 'Optimize Pricing Strategy',
              description: 'Implement dynamic pricing based on demand',
              estimatedImpact: '+25% revenue',
              confidence: 0.9,
              timeToImplement: '1 week'
            },
            {
              id: 'rec-2',
              type: 'operations',
              priority: 'medium',
              title: 'Streamline Booking Process',
              description: 'Reduce booking steps to increase conversions',
              estimatedImpact: '+15% bookings',
              confidence: 0.8,
              timeToImplement: '3 days'
            }
          ]
        })
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    // Select agent and send message
    const masterCoach = screen.getByText(/Master Coach/i).closest('button')
    await user.click(masterCoach)

    const messageInput = screen.getByPlaceholderText(/Ask the Master Coach/i)
    await user.type(messageInput, 'Give me recommendations')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    // Wait for recommendations to appear
    await waitFor(() => {
      expect(screen.getByText('Optimize Pricing Strategy')).toBeInTheDocument()
      expect(screen.getByText('Streamline Booking Process')).toBeInTheDocument()
      expect(screen.getByText('+25% revenue')).toBeInTheDocument()
      expect(screen.getByText('+15% bookings')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    // Select agent and send message
    const operationsAgent = screen.getByText(/Operations Agent/i).closest('button')
    await user.click(operationsAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Operations Agent/i)
    await user.type(messageInput, 'Test message')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during message sending', async () => {
    // Create a promise that we can control
    let resolvePromise
    const slowPromise = new Promise(resolve => {
      resolvePromise = resolve
    })

    global.fetch = jest.fn().mockReturnValue(slowPromise)

    const { user } = render(<AIAgentsDashboard />)

    // Select agent and send message
    const brandAgent = screen.getByText(/Brand Development/i).closest('button')
    await user.click(brandAgent)

    const messageInput = screen.getByPlaceholderText(/Ask the Brand Development/i)
    await user.type(messageInput, 'Help with branding')

    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    // Check loading state
    expect(screen.getByText(/thinking/i)).toBeInTheDocument()
    expect(sendButton).toBeDisabled()

    // Resolve the promise
    resolvePromise({
      ok: true,
      json: async () => mockAgentResponse
    })

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument()
    })
  })

  it('maintains conversation history', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    // Select agent
    const growthAgent = screen.getByText(/Growth Agent/i).closest('button')
    await user.click(growthAgent)

    // Send first message
    const messageInput = screen.getByPlaceholderText(/Ask the Growth Agent/i)
    await user.type(messageInput, 'First message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText('First message')).toBeInTheDocument()
    })

    // Send second message
    await user.clear(messageInput)
    await user.type(messageInput, 'Second message')
    await user.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => {
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })

    // Both messages should be visible in conversation history
    expect(screen.getByText('First message')).toBeInTheDocument()
    expect(screen.getByText('Second message')).toBeInTheDocument()
  })

  it('switches between different agents correctly', async () => {
    const { user } = render(<AIAgentsDashboard />)

    // Select Financial Agent first
    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    expect(screen.getByPlaceholderText(/Ask the Financial Agent/i)).toBeInTheDocument()

    // Switch to Strategic Mindset Agent
    const strategicAgent = screen.getByText(/Strategic Mindset/i).closest('button')
    await user.click(strategicAgent)

    expect(screen.getByPlaceholderText(/Ask the Strategic Mindset/i)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/Ask the Financial Agent/i)).not.toBeInTheDocument()
  })

  it('displays agent descriptions and capabilities', () => {
    render(<AIAgentsDashboard />)

    // Check for agent descriptions
    expect(screen.getByText(/Overall business strategy/i)).toBeInTheDocument()
    expect(screen.getByText(/Revenue optimization/i)).toBeInTheDocument()
    expect(screen.getByText(/Marketing and customer acquisition/i)).toBeInTheDocument()
    expect(screen.getByText(/Scheduling and efficiency/i)).toBeInTheDocument()
  })

  it('handles empty message submission', async () => {
    const { user } = render(<AIAgentsDashboard />)

    // Select agent
    const masterCoach = screen.getByText(/Master Coach/i).closest('button')
    await user.click(masterCoach)

    // Try to send empty message
    const sendButton = screen.getByRole('button', { name: /send/i })
    await user.click(sendButton)

    // Should not make API call
    expect(global.fetch).not.toHaveBeenCalled()

    // Message input should still be focused
    const messageInput = screen.getByPlaceholderText(/Ask the Master Coach/i)
    expect(messageInput).toHaveFocus()
  })

  it('supports keyboard shortcuts', async () => {
    global.fetch = mockFetch({
      'POST /api/agents/chat': {
        ok: true,
        json: async () => mockAgentResponse
      }
    })

    const { user } = render(<AIAgentsDashboard />)

    // Select agent
    const financialAgent = screen.getByText(/Financial Agent/i).closest('button')
    await user.click(financialAgent)

    // Type message and press Enter
    const messageInput = screen.getByPlaceholderText(/Ask the Financial Agent/i)
    await user.type(messageInput, 'Test keyboard shortcut')
    await user.keyboard('{Enter}')

    // Should send the message
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/agents/chat',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })
  })
})